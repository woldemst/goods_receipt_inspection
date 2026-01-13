import Constants from "expo-constants";
import React, { useEffect, useState, useRef } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	FlatList,
	ActivityIndicator,
	Modal,
	StyleSheet,
	RefreshControl,
	Platform,
	KeyboardAvoidingView,
	ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { File, Paths } from "expo-file-system";
import { fetch } from "expo/fetch";
import * as Sharing from "expo-sharing";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { useAuth } from "../../context/auth-context";
import { Project } from "../../shared/types";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

export default function ProjectView() {
	const { user } = useAuth();
	const router = useRouter();

	const [projects, setProjects] = useState<Project[]>([]);
	const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
	const [loading, setLoading] = useState(true);

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedDateFilter, setSelectedDateFilter] = useState("Neueste"); // Use "Neueste" as default (matches modal)
	const [selectedTypeFilter, setSelectedTypeFilter] = useState("Alle");
	const [showDateModal, setShowDateModal] = useState(false);
	const [showTypeModal, setShowTypeModal] = useState(false);

	// sttings
	const [showProjectModal, setShowProjectModal] = useState(false);
	const [selectedProject, setSelectedProject] = useState<Project>();

	// editing
	const [editModalVisible, setEditModalVisible] = useState(false);
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [savingEdit, setSavingEdit] = useState(false);

	const [confirmModalVisible, setConfirmModalVisible] = useState(false);
	const [confirmAction, setConfirmAction] = useState<"edit" | "delete" | null>(null);

	// create poject
	const [showCreateProject, setShowCreateProject] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [newDesc, setNewDesc] = useState("");
	const [creating, setCreating] = useState(false);

	// refresh control
	const [refreshing, setRefreshing] = useState(false);

	// --- Add this useRef for caching ---
	const projectsCache = useRef<Project[] | null>(null);

	const handlePullToRefresh = async () => {
		setRefreshing(true);
		projectsCache.current = null;
		await fetchAllProjects(true);
		setRefreshing(false);
		setTimeout(() => setRefreshing(false), 500);
	};

	// Project CRUD operations
	const fetchAllProjects = async (forceRefresh = false) => {
		if (!user) return;
		// Use cache if available and not forcing refresh
		if (projectsCache.current && !forceRefresh) {
			setProjects(projectsCache.current);
			setFilteredProjects(projectsCache.current);
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(`${BACKEND_URL}/api/projects/all`);
			if (res.ok) {
				const data = await res.json();
				setProjects(data);
				setFilteredProjects(data);
				projectsCache.current = data; // cache it
			} else {
				setProjects([]);
				setFilteredProjects([]);
			}
		} catch (err) {
			console.error("Error fetching projects:", err);
			setProjects([]);
			setFilteredProjects([]);
		} finally {
			setLoading(false);
		}
	};

	const createProject = async () => {
		if (!newTitle.trim() || !newDesc.trim()) {
			alert("Bitte Titel und Beschreibung angeben");
			return;
		}
		setCreating(true);
		try {
			const res = await fetch(`${BACKEND_URL}/api/projects/create`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: newTitle.trim(),
					description: newDesc.trim(),
					userId: user,
					createdAt: new Date(),
				}),
			});
			if (res.ok) {
				const newProj = await res.json();
				setProjects((prev) => [...prev, newProj]);
				setFilteredProjects((prev) => [...prev, newProj]);
				projectsCache.current = [...(projectsCache.current || []), newProj];
				setShowCreateProject(false);
				setNewTitle("");
				setNewDesc("");
			} else {
				alert("Fehler beim Erstellen");
			}
		} catch (e) {
			alert("Fehler beim Erstellen");
		}
		setCreating(false);
	};

	const editProject = async () => {
		if (!selectedProject) return;
		setSavingEdit(true);
		try {
			const res = await fetch(`${BACKEND_URL}/api/projects/update/${selectedProject._id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: editTitle,
					description: editDescription,
				}),
			});
			if (res.ok) {
				setEditModalVisible(false);
				handleRefresh();
			} else {
				alert("Fehler beim Speichern");
			}
		} catch (e) {
			alert("Fehler beim Speichern");
		}
		setSavingEdit(false);
	};

	useEffect(() => {
		fetchAllProjects();
	}, []);

	useEffect(() => {
		let list = [...projects];

		// --- Type Filter (Status) ---
		if (selectedTypeFilter === "Defekt") {
			list = list.filter((p) => p.hasDamagedReports);
		} else if (selectedTypeFilter === "Okay") {
			list = list.filter((p) => !p.hasDamagedReports);
		}

		// --- Search Filter ---
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			list = list.filter((p) => p.title?.toLowerCase().includes(q) || (p.shortId && p.shortId.toLowerCase().includes(q)));
		}

		// --- Date Sorting ---
		list.sort((a, b) => {
			const dateA = new Date(a.createdAt ?? 0).getTime();
			const dateB = new Date(b.createdAt ?? 0).getTime();
			if (selectedDateFilter === "Neueste") {
				return dateB - dateA; // newest first
			} else if (selectedDateFilter === "Älteste") {
				return dateA - dateB; // oldest first
			}
			return 0;
		});

		setFilteredProjects(list);
	}, [searchQuery, selectedDateFilter, selectedTypeFilter, projects]);

	// Optional: Add a refresh button to force reload from server
	const handleRefresh = () => {
		projectsCache.current = null;
		fetchAllProjects(true);
	};

	async function generateAndDownloadPdf(projectId: string) {
		try {
			// Call the server endpoint that generates the PDF and returns it
			const url = `${BACKEND_URL}/api/projects/pdf/${projectId}`;
			const response = await fetch(url);

			if (!response.ok) throw new Error("Failed to generate PDF");

			// Create local file object
			const fileName = `project_${projectId}.pdf`;
			const localFile = new File(Paths.cache, fileName);

			//  Write PDF bytes to local file
			const bytes = await response.arrayBuffer();
			localFile.write(new Uint8Array(bytes));

			console.log("PDF saved at:", localFile.uri);

			// Share or open the PDF
			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(localFile.uri);
			} else {
				console.log("PDF ready to use at:", localFile.uri);
			}
		} catch (err) {
			console.error("Error generating/downloading PDF:", err);
		}
	}

	return (
		<View style={styles.screen}>
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.headerTitle}>Projekte</Text>
				</View>

				{/* Search Bar */}
				<View style={styles.searchBar}>
					<Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
					<TextInput placeholder="Suchen" placeholderTextColor="#999" value={searchQuery} onChangeText={setSearchQuery} style={styles.searchInput} />
					{searchQuery ? (
						<TouchableOpacity onPress={() => setSearchQuery("")}>
							<Ionicons name="close-circle" size={20} color="#666" />
						</TouchableOpacity>
					) : null}
				</View>

				{/* Filters */}
				<View style={styles.filterRow}>
					<TouchableOpacity style={styles.filterButton} onPress={() => setShowDateModal(true)}>
						<Text style={styles.filterText}>{selectedDateFilter}</Text>
						<Ionicons name="chevron-down" size={16} color="#1268B0" />
					</TouchableOpacity>

					<TouchableOpacity style={[styles.filterButton, { marginRight: 0 }]} onPress={() => setShowTypeModal(true)}>
						<Text style={styles.filterText}>{selectedTypeFilter}</Text>
						<Ionicons name="chevron-down" size={16} color="#1268B0" />
					</TouchableOpacity>
				</View>

				{/* List */}
				<View style={{ flex: 1 }}>
					{loading ? (
						<ActivityIndicator color="#1268B0" size="large" style={{ marginTop: 30 }} />
					) : (
						<FlatList
							data={filteredProjects}
							style={{ flex: 1 }}
							overScrollMode="always"
							bounces={true}
							keyExtractor={(item, index) => item._id || index.toString()}
							ListEmptyComponent={<Text style={styles.emptyText}>Keine Projekte gefunden</Text>}
							contentContainerStyle={{ paddingBottom: 32 }}
							contentInsetAdjustmentBehavior="automatic"
							refreshControl={
								<RefreshControl
									refreshing={refreshing}
									onRefresh={handlePullToRefresh}
									colors={["#1268B0"]}
									tintColor="#1268B0"
									progressViewOffset={50}
								/>
							}
							renderItem={({ item, index }) => (
								<TouchableOpacity
									style={[
										styles.projectCard,
										index === 0 && { borderTopLeftRadius: 12, borderTopRightRadius: 12, borderTopWidth: 1 },
										index === filteredProjects.length - 1 && {
											borderBottomLeftRadius: 12,
											borderBottomRightRadius: 12,
											borderBottomWidth: 1,
										},
										item.hasDamagedReports && styles.projectCardDamaged,
									]}
									onPress={() =>
										router.push({
											pathname: "/project/ProjectDetails",
											params: { id: item._id },
										})
									}
								>
									<View style={{ flex: 1 }}>
										<Text style={styles.date}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}</Text>
										<Text style={styles.projectTitle}>{item.title}</Text>
										<Text style={styles.date}>ID: {item.shortId}</Text>
									</View>
									<TouchableOpacity
										style={styles.iconRight}
										onPress={() => {
											setSelectedProject(item);
											setShowProjectModal(true);
										}}
										hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
									>
										<Ionicons name="ellipsis-horizontal" size={22} color="#1268B0" />
									</TouchableOpacity>
								</TouchableOpacity>
							)}
						/>
					)}
				</View>

				<TouchableOpacity style={[styles.addButton, { marginBottom: 0, marginTop: 8 }]} onPress={() => setShowCreateProject(true)}>
					<Text style={styles.addButtonText}>Projekt hinzufügen</Text>
				</TouchableOpacity>
			</View>

			{/*Filter Modals */}
			<Modal visible={showDateModal} transparent animationType="fade">
				<TouchableOpacity style={styles.modalOverlay} onPress={() => setShowDateModal(false)}>
					<View style={styles.modalContainer}>
						{["Neueste", "Älteste"].map((option) => (
							<TouchableOpacity
								key={option}
								onPress={() => {
									setSelectedDateFilter(option);
									setShowDateModal(false);
								}}
								style={[styles.modalOption, selectedDateFilter === option && styles.modalOptionSelected]}
							>
								<Text style={[styles.modalOptionText, selectedDateFilter === option && styles.modalOptionTextSelected]}>{option}</Text>
							</TouchableOpacity>
						))}
					</View>
				</TouchableOpacity>
			</Modal>

			<Modal visible={showTypeModal} transparent animationType="fade">
				<TouchableOpacity style={styles.modalOverlay} onPress={() => setShowTypeModal(false)}>
					<View style={styles.modalContainer}>
						{["Alle", "Defekt", "Okay"].map((option) => (
							<TouchableOpacity
								key={option}
								onPress={() => {
									setSelectedTypeFilter(option);
									setShowTypeModal(false);
								}}
								style={[styles.modalOption, selectedTypeFilter === option && styles.modalOptionSelected]}
							>
								<Text style={[styles.modalOptionText, selectedTypeFilter === option && styles.modalOptionTextSelected]}>{option}</Text>
							</TouchableOpacity>
						))}
					</View>
				</TouchableOpacity>
			</Modal>

			{/* settings Modal*/}
			<Modal visible={showProjectModal} transparent animationType="fade" onRequestClose={() => setShowProjectModal(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalTitle}>Projekt-Aktionen</Text>
						<TouchableOpacity
							style={styles.modalOption}
							onPress={() => {
								setShowProjectModal(false);
								if (selectedProject) {
									setEditTitle(selectedProject.title || "");
									setEditDescription(selectedProject.description || "");
									setEditModalVisible(true);
								}
							}}
						>
							<Text style={styles.modalOptionText}>Bearbeiten</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.modalOption}
							onPress={() => {
								setShowProjectModal(false);
								setConfirmAction("delete");
								setConfirmModalVisible(true);
							}}
						>
							<Text style={[styles.modalOptionText, { color: "#dc3545" }]}>Löschen</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={() => selectedProject && generateAndDownloadPdf(selectedProject._id!)}
							style={[styles.addButton, { backgroundColor: "#1268B0" }]}
						>
							<Text style={styles.addButtonText}>PDF erstellen</Text>
						</TouchableOpacity>

						<TouchableOpacity style={[styles.modalOption, { backgroundColor: "#eee", marginTop: 8 }]} onPress={() => setShowProjectModal(false)}>
							<Text style={[styles.modalOptionText, { color: "#1268B0" }]}>Abbrechen</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			<Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
				<View style={styles.modalOverlay}>
					<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }} keyboardVerticalOffset={16}>
						<ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }} keyboardShouldPersistTaps="handled">
							<View style={styles.modalContainer}>
								<Text style={styles.modalTitle}>Projekt bearbeiten</Text>

								<TextInput style={styles.input} placeholder="Titel" value={editTitle} onChangeText={setEditTitle} />

								<TextInput
									style={styles.input}
									placeholder="Beschreibung"
									value={editDescription}
									onChangeText={setEditDescription}
									multiline
								/>

								<TouchableOpacity style={styles.addButton} onPress={editProject} disabled={savingEdit}>
									<Text style={styles.addButtonText}>{savingEdit ? "Speichern…" : "Speichern"}</Text>
								</TouchableOpacity>

								<TouchableOpacity onPress={() => setEditModalVisible(false)} style={{ marginTop: 10 }}>
									<Text style={{ textAlign: "center", color: "#1268B0", fontWeight: "600" }}>Abbrechen</Text>
								</TouchableOpacity>
							</View>
						</ScrollView>
					</KeyboardAvoidingView>
				</View>
			</Modal>

			{/* create project} */}
			<Modal visible={showCreateProject} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<KeyboardAwareScrollView
						bottomOffset={40} // space between keyboard and modal
						contentContainerStyle={{
							flexGrow: 1,
							justifyContent: "center",
							alignItems: "center",
							paddingBottom: 40,
						}}
						keyboardShouldPersistTaps="handled"
					>
						<View style={styles.modalContainer}>
							<Text style={styles.modalTitle}>Neues Projekt</Text>

							<TextInput placeholder="Titel" value={newTitle} onChangeText={setNewTitle} style={styles.input} />

							<TextInput
								placeholder="Beschreibung"
								value={newDesc}
								onChangeText={setNewDesc}
								style={[styles.input, { minHeight: 80 }]}
								multiline
							/>

							<View style={{ flexDirection: "row", marginTop: 20, width: "100%" }}>
								<TouchableOpacity style={[styles.addButton, { flex: 1, marginRight: 8 }]} onPress={createProject}>
									<Text style={styles.addButtonText}>Erstellen</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={[styles.addButton, { flex: 1, backgroundColor: "#ccc", marginLeft: 8 }]}
									onPress={() => setShowCreateProject(false)}
								>
									<Text style={[styles.addButtonText, { color: "#1268B0" }]}>Abbrechen</Text>
								</TouchableOpacity>
							</View>
						</View>
					</KeyboardAwareScrollView>
				</View>
			</Modal>

			{/* delete project */}
			<Modal visible={confirmModalVisible} transparent animationType="fade" onRequestClose={() => setConfirmModalVisible(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalTitle}>
							{confirmAction === "edit" ? "Möchten Sie den Projektnamen wirklich ändern?" : "Möchten Sie dieses Projekt wirklich löschen?"}
						</Text>
						<View style={{ flexDirection: "row", marginTop: 16, width: "100%" }}>
							<TouchableOpacity
								style={[styles.addButton, { flex: 1, marginRight: 8 }]}
								onPress={() => {
									setConfirmModalVisible(false);
									if (confirmAction === "edit") {
										setEditModalVisible(true);
									} else if (confirmAction === "delete" && selectedProject) {
										// Call delete API
										(async () => {
											try {
												const res = await fetch(`${BACKEND_URL}/api/projects/delete/${selectedProject._id}`, {
													method: "DELETE",
												});
												if (res.ok) {
													handleRefresh();
												} else {
													alert("Fehler beim Löschen");
												}
											} catch (e) {
												alert("Fehler beim Löschen");
											}
										})();
									}
								}}
							>
								<Text style={styles.addButtonText}>Ja</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.addButton, { flex: 1, backgroundColor: "#ccc", marginLeft: 8 }]}
								onPress={() => setConfirmModalVisible(false)}
							>
								<Text style={[styles.addButtonText, { color: "#1268B0" }]}>Abbrechen</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#1268B0" },
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingTop: 40,
		paddingBottom: 12,
		backgroundColor: "#f8fafc",
	},
	headerTitle: { color: "#1268B0", fontSize: 28, fontWeight: "700" },
	topSection: {
		backgroundColor: "#f8fafc",
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 4,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
	},
	backBtn: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#0b1f55",
		paddingVertical: 6,
		paddingHorizontal: 10,
		borderRadius: 8,
	},
	backText: {
		color: "#fff",
		fontWeight: "600",
		marginLeft: 6,
	},

	container: {
		flex: 1,
		backgroundColor: "#f8fafc",
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 78,
		overflow: "hidden",
	},

	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		borderRadius: 25,
		paddingHorizontal: 16,
		paddingVertical: 8,
		elevation: 3,
		marginBottom: 6,
		borderWidth: 1,
		borderColor: "#ddd",
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: "#000",
	},

	filterRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginVertical: 10,
	},
	filterButton: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "#ddd",
		flex: 1,
		marginRight: 8,
	},
	filterText: {
		color: "#1268B0",
		fontSize: 14,
		fontWeight: "600",
		marginRight: 4,
	},
	iconToggle: {
		padding: 8,
		backgroundColor: "#fff",
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#ddd",
	},
	iconActive: { backgroundColor: "#1268B0", borderColor: "#1268B0" },

	projectCard: {
		backgroundColor: "#fff",
		padding: 14,
		flexDirection: "row",
		alignItems: "center",
		borderColor: "#e6e9ee",
		borderWidth: 1,
		borderTopWidth: 0,
	},
	avatar: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: "#f59e0b",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	avatarText: {
		color: "#fff",
		fontWeight: "700",
		fontSize: 16,
	},
	projectTitle: {
		fontWeight: "700",
		color: "#1268B0",
		fontSize: 15,
	},
	date: {
		color: "#666",
		fontSize: 13,
		marginBottom: 3,
	},
	iconRight: {
		flexDirection: "row",
		gap: 10,
	},
	emptyText: {
		color: "#777",
		textAlign: "center",
		marginTop: 30,
	},

	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.45)",
		justifyContent: "center",
		alignItems: "center",
		padding: 16,
	},
	modalContainer: {
		backgroundColor: "#fff",
		width: "100%",
		maxWidth: 560,
		borderRadius: 12,
		padding: 18,
		alignItems: "center",
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: "700",
		marginBottom: 12,
		color: "#1268B0",
	},
	modalOption: {
		width: "100%",
		paddingVertical: 14,
		paddingHorizontal: 16,
		alignItems: "center",
		borderRadius: 10,
		marginBottom: 6,
		backgroundColor: "#f6f8fb",
	},
	modalOptionSelected: {
		backgroundColor: "#1268B0",
	},
	modalOptionText: {
		color: "#1268B0",
		fontWeight: "600",
		fontSize: 16,
		textAlign: "center",
	},
	modalOptionTextSelected: {
		color: "#fff",
	},

	damagedBadge: {
		backgroundColor: "#dc3545",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 12,
		marginTop: 4,
		alignSelf: "flex-start",
	},
	damagedBadgeText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "600",
	},
	projectCardDamaged: {
		backgroundColor: "#fff5f5", // light red background
		// borderColor: "#dc3545", // red border
		borderWidth: 1.5,
	},
	input: {
		width: "100%",
		borderWidth: 1,
		borderColor: "#e6eef8",
		borderRadius: 8,
		padding: 10,
		marginBottom: 10,
		backgroundColor: "#fbfdff",
	},

	addButton: {
		width: "100%",
		backgroundColor: "#1268B0",
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 12,
	},
	addButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
