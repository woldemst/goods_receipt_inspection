import Constants from "expo-constants";
import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, ActivityIndicator, StyleSheet, Image, ScrollView, TouchableOpacity, TextInput, FlatList, RefreshControl } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { File, Paths } from "expo-file-system";
import { fetch } from "expo/fetch";
import * as Sharing from "expo-sharing";

import { Project, Report } from "../../shared/types";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

export default function ProjectDetails() {
	const { id } = useLocalSearchParams();
	const router = useRouter();
	const [project, setProject] = useState<Project | null>(null);
	const [reports, setReports] = useState<Report[]>([]);
	const [filteredReports, setFilteredReports] = useState<Report[]>([]);
	const [loading, setLoading] = useState(true);

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedDateFilter, setSelectedDateFilter] = useState("Neueste"); // Use "Neueste" as default (matches modal)
	const [selectedTypeFilter, setSelectedTypeFilter] = useState("Alle");
	const [showDateModal, setShowDateModal] = useState(false);
	const [showTypeModal, setShowTypeModal] = useState(false);

	const [selectedReport, setSelectedReport] = useState<Report | null>(null);

	// edit modals
	const [showReportModal, setShowReportModal] = useState(false);
	const [editReportModalVisible, setEditReportModalVisible] = useState(false);
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [savingEdit, setSavingEdit] = useState(false);

	const [confirmModalVisible, setConfirmModalVisible] = useState(false);
	const [confirmAction, setConfirmAction] = useState<"edit" | "delete" | null>(null);

	// refresh control
	const [refreshing, setRefreshing] = useState(false);

	// info of the project
	const [showProjectInfoModal, setShowProjectInfoModal] = useState(false);

	const projectCache = useRef<Project | null>(null);

	const handlePullToRefresh = async () => {
		setRefreshing(true);
		projectCache.current = null;
		await fetchProjectDetails(true);
		setRefreshing(false);
	};

	const fetchProjectDetails = async (forceRefresh = false) => {
		if (!id) return;
		if (projectCache.current && !forceRefresh) {
			setProject(projectCache.current);
			setReports(projectCache.current.reports || []);
			setFilteredReports(projectCache.current.reports || []);
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(`${BACKEND_URL}/api/projects/${id}`);
			if (res.ok) {
				const data = await res.json();
				setProject(data);
				setReports(data.reports || []);
				setFilteredReports(data.reports || []);
				projectCache.current = data; // cache the full project object
			} else {
				setProject(null);
				setReports([]);
				setFilteredReports([]);
			}
		} catch (err) {
			console.error("Error fetching projects:", err);
			setProject(null);
			setReports([]);
			setFilteredReports([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchProjectDetails();
	}, [id]);

	useEffect(() => {
		let list = [...reports];

		// --- Type Filter (Status) ---
		if (selectedTypeFilter === "Defekt") {
			list = list.filter((p) => p.isDamaged);
		} else if (selectedTypeFilter === "Okay") {
			list = list.filter((p) => !p.isDamaged);
		}

		// --- Search Filter ---
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			list = list.filter((p) => p.title?.toLowerCase().includes(q) || (p.shortId && p.shortId.toLowerCase().includes(q)));
		}

		// --- Date Sorting ---
		list.sort((a, b) => {
			const dateA = a.date ? new Date(a.date).getTime() : 0;
			const dateB = b.date ? new Date(b.date).getTime() : 0;
			if (selectedDateFilter === "Neueste") {
				return dateB - dateA; // newest first
			} else if (selectedDateFilter === "Älteste") {
				return dateA - dateB; // oldest first
			}
			return 0;
		});

		setFilteredReports(list);
	}, [searchQuery, selectedDateFilter, selectedTypeFilter, reports]);

	async function generateAndDownloadPdf(reportId: string) {
		try {
			// 1️⃣ Call the server endpoint that generates the PDF and returns it
			const url = `${BACKEND_URL}/api/reports/pdf/${reportId}`;
			const response = await fetch(url);

			if (!response.ok) throw new Error("Failed to generate PDF");

			// 2️⃣ Create local file object
			const fileName = `server_${reportId}.pdf`;
			const localFile = new File(Paths.cache, fileName);

			// 3️⃣ Write PDF bytes to local file
			const bytes = await response.arrayBuffer();
			localFile.write(new Uint8Array(bytes));

			console.log("PDF saved at:", localFile.uri);

			// 4️⃣ Share or open the PDF
			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(localFile.uri);
			} else {
				console.log("PDF ready to use at:", localFile.uri);
			}
		} catch (err) {
			console.error("Error generating/downloading PDF:", err);
		}
	}
	if (loading) {
		return (
			<View style={styles.centered}>
				<ActivityIndicator color="#1268B0" size="large" />
				<Text style={{ marginTop: 10 }}>Lädt Projektdaten…</Text>
			</View>
		);
	}

	if (!project) {
		return (
			<View style={styles.centered}>
				<Text style={styles.error}>Projekt nicht gefunden</Text>
				<TouchableOpacity onPress={() => router.back()}>
					<Text style={styles.link}>← Zurück</Text>
				</TouchableOpacity>
			</View>
		);
	}

	return (
		<View style={{ flex: 1 }}>
			{/* Header */}
			<View style={styles.container}>
				<View style={styles.header}>
					<TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
						<Ionicons name="arrow-back" size={22} />
						<Text style={styles.backText}></Text>
					</TouchableOpacity>
					<Text style={styles.headerTitle}>{project.title}</Text>
					<TouchableOpacity style={{ alignItems: "center", justifyContent: "center", width: 48 }} onPress={() => setShowProjectInfoModal(true)}>
						<Ionicons name="information-circle-outline" size={22} />
					</TouchableOpacity>
				</View>

				{/* project details */}
				{/* <View>
					<Text style={styles.desc}>{project.description}</Text>

					{project.imageUri && <Image source={{ uri: project.imageUri }} style={styles.image} />}
				</View> */}

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

				<FlatList
					style={{ flex: 1 }}
					contentContainerStyle={{ paddingBottom: 32 }}
					data={filteredReports}
					keyExtractor={(item) => item._id}
					ListEmptyComponent={<Text style={styles.emptyText}>Keine Berichte gefunden</Text>}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={handlePullToRefresh}
							colors={["#1268B0"]} // Android spinner color
							tintColor="#1268B0" // iOS spinner color
						/>
					}
					renderItem={({ item, index }) => {
						const isFirst = index === 0;
						const isLast = index === filteredReports.length - 1;

						return (
							<TouchableOpacity
								onPress={() => router.push({ pathname: "/report/ReportDetails", params: { id: item._id } })}
								key={item._id}
								style={[
									styles.reportCard,
									isFirst && { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
									isLast && { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderBottomWidth: 1 },
								]}
							>
								<View style={{ flex: 1 }}>
									{/* <Text style={styles.reportDesc}>{item.description}</Text> */}
									<Text style={styles.date}>{item.date ? new Date(item.date).toLocaleDateString() : ""}</Text>
									<Text style={styles.reportTitle}>{item.title}</Text>
									<Text style={styles.date}>ID: {item.shortId}</Text>
									{item.isDamaged && (
										<View style={styles.damagedBadge}>
											<Text style={styles.damagedBadgeText}>Defekt</Text>
										</View>
									)}
								</View>
								<TouchableOpacity
									style={styles.iconRight}
									onPress={() => {
										setSelectedReport(item);
										setShowReportModal(true);
									}}
									hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
								>
									<Ionicons name="ellipsis-horizontal" size={22} color="#1268B0" />
								</TouchableOpacity>
							</TouchableOpacity>
						);
					}}
				/>
				<TouchableOpacity
					style={[styles.addButton, { marginBottom: 48, marginTop: 8 }]}
					onPress={() => {
						router.push({
							pathname: "/tabs/report",
							params: { projectId: project._id, projectTitle: project.title },
						});
					}}
				>
					<Text style={styles.addButtonText}>Prüfbericht hinzufügen</Text>
				</TouchableOpacity>
			</View>

			{/* Filter Modals */}
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

			{/* edit Modals */}
			<Modal visible={showReportModal} transparent animationType="fade" onRequestClose={() => setShowReportModal(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalTitle}>Bericht-Aktionen</Text>
						<TouchableOpacity
							style={styles.modalOption}
							onPress={() => {
								setShowReportModal(false);
								setConfirmAction("edit");
								setConfirmModalVisible(true);
							}}
						>
							<Text style={styles.modalOptionText}>Bearbeiten</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.modalOption}
							onPress={() => {
								setShowReportModal(false);
								setConfirmAction("delete");
								setConfirmModalVisible(true);
							}}
						>
							<Text style={[styles.modalOptionText, { color: "#dc3545" }]}>Löschen</Text>
						</TouchableOpacity>
						
						<TouchableOpacity
							onPress={() => selectedReport && generateAndDownloadPdf(selectedReport._id!)}
							style={[styles.addButton, { backgroundColor: "#1268B0" }]}
						>
							<Text style={styles.addButtonText}>PDF erstellen</Text>
						</TouchableOpacity>

						<TouchableOpacity style={[styles.modalOption, { backgroundColor: "#eee", marginTop: 8 }]} onPress={() => setShowReportModal(false)}>
							<Text style={[styles.modalOptionText, { color: "#1268B0" }]}>Abbrechen</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			<Modal visible={editReportModalVisible} transparent animationType="fade" onRequestClose={() => setEditReportModalVisible(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalTitle}>Bericht bearbeiten</Text>
						<TextInput style={styles.input} placeholder="Titel" value={editTitle} onChangeText={setEditTitle} />
						<TextInput style={styles.input} placeholder="Beschreibung" value={editDescription} onChangeText={setEditDescription} />
						<TouchableOpacity
							style={styles.addButton}
							onPress={async () => {
								if (!selectedReport) return;
								setSavingEdit(true);
								try {
									const res = await fetch(`${BACKEND_URL}/api/reports/${selectedReport._id}`, {
										method: "PUT",
										headers: { "Content-Type": "application/json" },
										body: JSON.stringify({
											title: editTitle,
											description: editDescription,
										}),
									});
									if (res.ok) {
										setEditReportModalVisible(false);
										// Refresh project details/reports here
									} else {
										alert("Fehler beim Speichern");
									}
								} catch (e) {
									alert("Fehler beim Speichern");
								}
								setSavingEdit(false);
							}}
							disabled={savingEdit}
						>
							<Text style={styles.addButtonText}>{savingEdit ? "Speichern..." : "Speichern"}</Text>
						</TouchableOpacity>
						<TouchableOpacity onPress={() => setEditReportModalVisible(false)} style={{ marginTop: 10 }}>
							<Text style={{ textAlign: "center", color: "#1268B0", fontWeight: "600" }}>Abbrechen</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			<Modal visible={confirmModalVisible} transparent animationType="fade" onRequestClose={() => setConfirmModalVisible(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalTitle}>
							{confirmAction === "edit" ? "Möchten Sie den Bericht wirklich bearbeiten?" : "Möchten Sie diesen Bericht wirklich löschen?"}
						</Text>
						<View style={{ flexDirection: "row", marginTop: 16, width: "100%" }}>
							<TouchableOpacity
								style={[styles.addButton, { flex: 1, marginRight: 8 }]}
								onPress={async () => {
									setConfirmModalVisible(false);
									if (confirmAction === "edit") {
										setEditReportModalVisible(true);
									} else if (confirmAction === "delete" && selectedReport) {
										try {
											const res = await fetch(`${BACKEND_URL}/api/reports/delete/${selectedReport._id}`, {
												method: "DELETE",
											});
											if (res.ok) {
												// Refresh project details/reports here
												await fetchProjectDetails(true);
											} else {
												alert("Fehler beim Löschen");
											}
										} catch (e) {
											alert("Fehler beim Löschen");
										}
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

			{/* information of the project  */}
			<Modal visible={showProjectInfoModal} transparent animationType="fade" onRequestClose={() => setShowProjectInfoModal(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContainer}>
						<Text style={styles.modalTitle}>Projekt-Information</Text>
						<Text style={styles.modalText}>Titel: {project?.title}</Text>
						<Text style={styles.modalText}>Beschreibung: {project?.description || "Keine Beschreibung"}</Text>
						<Text style={styles.modalText}>ID: {project?.shortId}</Text>
						{project?.createdAt && <Text style={styles.modalText}>Erstellt am: {new Date(project.createdAt).toLocaleDateString()}</Text>}

						<TouchableOpacity
							style={[styles.addButton, { marginTop: 16, backgroundColor: "#1268B0" }]}
							onPress={() => setShowProjectInfoModal(false)}
						>
							<Text style={styles.addButtonText}>Schließen</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f8fafc",
		padding: 16,
		// borderTopLeftRadius: 20,
		// borderTopRightRadius: 20,
	},
	header: {
		paddingTop: 40,
		paddingBottom: 12,
		backgroundColor: "#f8fafc",
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	headerTitle: { color: "#1268B0", fontSize: 28, fontWeight: "700", marginBottom: 0 },

	backButton: {
		flexDirection: "row",
		alignItems: "center",
		// backgroundColor: "#0b1f55",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
	},
	backText: { color: "#fff", fontWeight: "600", marginLeft: 6 },

	centered: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#fff",
	},

	desc: { fontSize: 16, color: "#333", marginBottom: 16 },
	subtitle: { fontWeight: "bold", fontSize: 18, color: "#1268B0", marginBottom: 12 },

	image: { width: "100%", height: 200, borderRadius: 12, marginVertical: 12 },

	reportCard: {
		backgroundColor: "#fff",
		borderRadius: 0,
		padding: 12,
		borderLeftWidth: 1,
		borderTopWidth: 1,
		borderRightWidth: 1,
		borderColor: "#eee",
		shadowColor: "#1268B0",
		shadowOpacity: 0.1,
		shadowOffset: { width: 0, height: 1 },
		alignItems: "center",
		flexDirection: "row",
		minHeight: 74,
	},

	reportTitle: { fontWeight: "700", color: "#1268B0", fontSize: 16 },
	reportDesc: { color: "#333", marginTop: 4 },
	reportDate: { color: "#666", fontSize: 12, marginTop: 6 },

	date: {
		color: "#666",
		fontSize: 13,
		marginBottom: 3,
	},
	iconRight: {
		flexDirection: "row",
		gap: 10,
	},
	error: { color: "red", fontSize: 18 },
	link: { color: "#1877f2", marginTop: 10 },

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
	modalText: {
		fontSize: 16,
		marginBottom: 8,
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
	damagedBadgeText: {
		color: "#fff",
		fontSize: 12,
		fontWeight: "600",
	},
	damagedBadge: {
		backgroundColor: "#dc3545",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 12,
		marginTop: 4,
		alignSelf: "flex-start",
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
