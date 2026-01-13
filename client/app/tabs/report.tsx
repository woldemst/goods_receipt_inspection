import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	Modal,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	Image,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";
import axios from "axios";
import { SafeAreaView } from "react-native-safe-area-context";

import ImageViewing from "react-native-image-viewing";

import { useAuth } from "../../context/auth-context";
import { Project } from "../../shared/types";

export default function Report() {
	const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;
	const { user, userId } = useAuth();
	const router = useRouter();
	const params = useLocalSearchParams();
	const preselectedProjectId = params.projectId as string | undefined;

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [image, setImage] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const [projects, setProjects] = useState<Project[]>([]);
	const [project, setProject] = useState<Project | null>(null);
	const [showProjectPicker, setShowProjectPicker] = useState(false);

	// --- NEW: State for the “Create Project” modal --------------------
	const [showCreateProject, setShowCreateProject] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [newDesc, setNewDesc] = useState("");
	const [creating, setCreating] = useState(false);

	//  image picker
	const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
	const [images, setImages] = useState<string[]>([]);
	const [currentImageIndex, setCurrentImageIndex] = useState(0);

	// status
	const [status, setStatus] = useState<"ok" | "damaged">("ok"); // checkbox state
	const [projectSearch, setProjectSearch] = useState("");

	useEffect(() => {
		fetchProjects();
	}, []);

	useEffect(() => {
		if (preselectedProjectId && projects.length > 0) {
			const found = projects.find((p) => p._id === preselectedProjectId);
			if (found) setProject(found);
		}
	}, [preselectedProjectId, projects]);

	const fetchProjects = async () => {
		setLoading(true);
		try {
			const res = await fetch(`${BACKEND_URL}/api/projects/all`);
			if (res.ok) {
				const data = await res.json();
				setProjects(data);
			} else {
				setProjects([]);
			}
		} catch (e) {
			console.error("Failed to fetch projects:", e);
		}
		setLoading(false);
	};

	/* ----------  NEW: Create a project ------------------------------ */
	const createProject = async () => {
		if (!newTitle.trim() || !newDesc.trim()) {
			Alert.alert("Error", "Bitte Titel und Beschreibung angeben");
			return;
		}
		setCreating(true);
		try {
			const res = await axios.post(`${BACKEND_URL}/api/projects/create`, {
				title: newTitle.trim(),
				description: newDesc.trim(),
				userId, // backend can use this or ignore
				imageUri: null, // optional
				createdAt: new Date(),
			});
			const newProj = res.data;
			setProjects((prev) => [...prev, newProj]); // add to list
			setProject(newProj); // select it
			setShowCreateProject(false);
			setNewTitle("");
			setNewDesc("");
		} catch (e) {
			console.error("Project creation failed", e);
			Alert.alert("Error", "Fehler beim Erstellen des Projekts");
		} finally {
			setCreating(false);
		}
	};

	const requestCameraPermission = async () => {
		const { status } = await ImagePicker.requestCameraPermissionsAsync();
		if (status !== "granted") {
			Alert.alert("Kamerazugriff verweigert", "Bitte erlaube den Zugriff auf die Kamera in den iPhone-Einstellungen.");
			return false;
		}
		return true;
	};

	const pickMedia = async () => {
		Alert.alert("Medien auswählen", "Möchtest du ein neues Foto aufnehmen oder aus der Galerie wählen?", [
			{
				text: "Aufnehmen",
				onPress: async () => {
					const granted = await requestCameraPermission();
					if (!granted) return;

					const result = await ImagePicker.launchCameraAsync({
						mediaTypes: ["images"],
						quality: 0.8,
					});

					if (!result.canceled) {
						setImages((prev) => [...prev, result.assets[0].uri]);
					}
				},
			},
			{
				text: "Aus Galerie",
				onPress: async () => {
					const result = await ImagePicker.launchImageLibraryAsync({
						mediaTypes: ["images"],
						quality: 0.8,
						allowsMultipleSelection: true,
					});
					if (!result.canceled) {
						const selectedImages = result.assets.map((asset) => asset.uri);
						setImages((prev) => [...prev, ...selectedImages]);
					}
				},
			},
			{ text: "Abbrechen", style: "cancel" },
		]);
	};
	const submit = async () => {
		if (!project) return Alert.alert("Projekt fehlt", "Bitte wählen oder erstellen Sie ein Projekt.");

		setLoading(true);

		try {
			const userEmail = user;
			const formData = new FormData();

			formData.append("title", title);
			formData.append("description", description);
			formData.append("userEmail", userEmail || "");
			formData.append("projectId", project._id || "");
			formData.append("damaged", status === "damaged" ? "true" : "false");

			images.forEach((uri, index) => {
				formData.append("images", {
					uri,
					name: `report_${Date.now()}_${index}.jpg`,
					type: "image/jpeg",
				} as any);
			});

			const res = await fetch(`${BACKEND_URL}/api/reports`, {
				method: "POST",
				// ❗ do NOT set Content-Type manually, RN will set the multipart boundary
				body: formData,
			});

			setLoading(false);

			if (res.ok) {
				setTitle("");
				setDescription("");
				setImages([]);
				setProject(null);
				setStatus("ok");
				Alert.alert("Erfolg", "Ihr Prüfbericht wurde erfolgreich erstellt.", [{ text: "OK", onPress: () => router.replace("./projectView") }]);
			} else {
				const data = await res.json();
				Alert.alert("Fehler", data.error || "Speichern fehlgeschlagen");
			}
		} catch (error) {
			setLoading(false);
			const message = error instanceof Error ? error.message : String(error);
			Alert.alert("Fehler", "Speichern fehlgeschlagen: " + message);
		}
	};

	return (
		<>
			<SafeAreaView style={styles.safeArea}>
				<KeyboardAvoidingView
					style={{ flex: 1 }}
					behavior={"padding"}
					// keyboardVerticalOffset={80} // space above keyboard
				>
					<ScrollView showsVerticalScrollIndicator={false} style={{ width: "100%" }} keyboardShouldPersistTaps="handled">
						<View style={styles.container}>
							<View style={styles.logoWrap}>
								<Image source={require("../../assets/images/thenex_logo.png")} style={styles.logo} resizeMode="contain" />
							</View>
							<View style={{ width: "100%", justifyContent: "space-between" }}>
								<Text style={styles.title}>Prüfbericht erstellen</Text>

								{/* Title */}
								<View style={styles.section}>
									<Text style={styles.sectionTitle}>Überschrift</Text>
									<TextInput placeholder="Überschrift" style={styles.input} value={title} onChangeText={setTitle} />
								</View>

								{/* Description */}
								<View style={styles.section}>
									<Text style={styles.sectionTitle}>Beschreibung</Text>
									<TextInput
										placeholder="Beschreibung"
										style={[styles.input, { minHeight: 80 }]}
										value={description}
										onChangeText={setDescription}
										multiline
									/>
								</View>

								{/* Status */}
								<View style={{ flexDirection: "row", marginBottom: 20, width: "100%" }}>
									{["ok", "damaged"].map((s) => (
										<TouchableOpacity
											key={s}
											onPress={() => setStatus(s as "ok" | "damaged")}
											style={{
												flex: 1,
												paddingVertical: 12,
												marginHorizontal: 5,
												borderRadius: 12,
												alignItems: "center",
												borderWidth: 1,
												borderColor: status === s ? (s === "ok" ? "#28a745" : "#dc3545") : "#ccc",
												backgroundColor: status === s ? (s === "ok" ? "#28a745" : "#dc3545") : "#f0f0f0",
											}}
										>
											<Text style={{ color: status === s ? "#fff" : "#222", fontWeight: "600" }}>{s === "ok" ? "OK" : "Defekt"}</Text>
										</TouchableOpacity>
									))}
								</View>

								{/* Media picker */}
								<View style={styles.section}>
									<Text style={styles.sectionTitle}>Fotos / Videos</Text>
									<TouchableOpacity style={styles.mediaButton} onPress={pickMedia}>
										<Ionicons name={images.length ? "checkmark-circle" : "camera"} size={20} color="#fff" style={{ marginRight: 8 }} />
										<Text style={styles.buttonText}>{images.length ? `${images.length} hinzugefügt` : "Medien hinzufügen"}</Text>
									</TouchableOpacity>

									{images.length > 0 && (
										<View style={styles.imagePreviewGrid}>
											{images.map((img, index) => (
												<TouchableOpacity
													key={index}
													onPress={() => {
														setCurrentImageIndex(index);
														setIsImageViewerVisible(true);
													}}
													style={styles.imagePreviewItem}
												>
													<Image source={{ uri: img }} style={styles.imagePreview} />
												</TouchableOpacity>
											))}
										</View>
									)}
									{/* to open the taken images for viewing | Doesn't work on PC */}
									<ImageViewing
										images={images.map((uri) => ({ uri }))}
										imageIndex={currentImageIndex}
										visible={isImageViewerVisible}
										onRequestClose={() => setIsImageViewerVisible(false)}
									/>
								</View>

								{/* Project picker */}
								<View style={[styles.section, { marginBottom: 0 }]}>
									<Text style={styles.sectionTitle}>Projekt</Text>
									<TouchableOpacity
										style={[styles.input, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }]}
										onPress={() => {
											setShowProjectPicker(true);
										}}
									>
										<Text style={{ color: project ? "#222" : "#999", fontSize: 15 }}>
											{project ? `Projekt: ${project.title}` : "Projekt auswählen"}
										</Text>
										<Ionicons name="chevron-down" size={18} color="#1268B0" />
									</TouchableOpacity>
								</View>

								{/* Submit */}
								<TouchableOpacity style={styles.submitButton} onPress={submit}>
									<Text style={styles.buttonText}>Absenden</Text>
								</TouchableOpacity>
							</View>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>

			{/* Modal for selecting project */}
			<Modal visible={showProjectPicker} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={16} style={{ width: "100%" }}>
						<ScrollView
							contentContainerStyle={{
								flexGrow: 1,
								justifyContent: "center",
								alignItems: "center",
							}}
							keyboardShouldPersistTaps="handled"
						>
							<View style={[styles.modalContainer, { paddingBottom: 10, maxHeight: 420 }]}>
								<Text style={styles.modalTitle}>Projekt auswählen</Text>

								{/* Search */}
								<View style={styles.searchBar}>
									<Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />

									<TextInput
										placeholder="Projekt suchen"
										placeholderTextColor="#999"
										value={projectSearch}
										onChangeText={setProjectSearch}
										style={styles.searchInput}
									/>

									{projectSearch ? (
										<TouchableOpacity onPress={() => setProjectSearch("")}>
											<Ionicons name="close-circle" size={20} color="#666" />
										</TouchableOpacity>
									) : null}

									{/* Add new project */}
									<TouchableOpacity
										onPress={() => {
											setShowProjectPicker(false);
											setShowCreateProject(true);
										}}
										style={{ marginLeft: 10 }}
									>
										<Ionicons name="add-circle-outline" size={22} color="#1268B0" />
									</TouchableOpacity>
								</View>

								{/* Project list */}
								{loading ? (
									<View style={styles.modalLoading}>
										<ActivityIndicator size="large" color="#1268B0" />
										<Text style={styles.modalLoadingText}>Lade Projekte...</Text>
									</View>
								) : (
									<ScrollView
										style={{ width: "100%", maxHeight: 300, marginTop: 10 }}
										contentContainerStyle={{ paddingBottom: 10 }}
										showsVerticalScrollIndicator={false}
									>
										{projects
											.filter(
												(p) =>
													!projectSearch ||
													p.title?.toLowerCase().includes(projectSearch.toLowerCase()) ||
													p.shortId?.toLowerCase().includes(projectSearch.toLowerCase())
											)
											.map((p, index) => (
												<TouchableOpacity
													key={p._id ?? index}
													style={[styles.projectOption, project?._id === p._id && styles.projectOptionActive]}
													onPress={() => {
														setProject(p);
														setShowProjectPicker(false);
														setProjectSearch("");
													}}
												>
													<Ionicons
														name={project?._id === p._id ? "checkmark-circle" : "folder"}
														size={20}
														color={project?._id === p._id ? "#fff" : "#1268B0"}
														style={{ marginRight: 10 }}
													/>
													<Text style={[styles.projectOptionText, project?._id === p._id && { color: "#fff" }]}>{p.title}</Text>
												</TouchableOpacity>
											))}
									</ScrollView>
								)}

								{/* Cancel */}
								<TouchableOpacity onPress={() => setShowProjectPicker(false)} style={{ marginTop: 10 }}>
									<Text style={styles.modalCloseText}>Abbrechen</Text>
								</TouchableOpacity>
							</View>
						</ScrollView>
					</KeyboardAvoidingView>
				</View>
			</Modal>

			{/* ---- Modal for creating a new project ---- */}
			<Modal visible={showCreateProject} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={16} style={{ width: "100%" }}>
						<ScrollView
							contentContainerStyle={{
								flexGrow: 1,
								justifyContent: "center",
								alignItems: "center",
							}}
							keyboardShouldPersistTaps="handled"
						>
							<View style={[styles.modalContainer]}>
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
						</ScrollView>
					</KeyboardAvoidingView>
				</View>
			</Modal>
		</>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: "#f4f6fb" },
	container: {
		flex: 1,
		backgroundColor: "#f4f6fb",
		paddingTop: 0,
		paddingHorizontal: 16,
		alignItems: "center",
		paddingBottom: 78,
	},

	logoWrap: { width: "100%", alignItems: "center", paddingVertical: 40 },
	logo: { width: 140, height: 50 },

	title: {
		fontSize: 24,
		fontWeight: "700",
		color: "#1268B0",
		textAlign: "center",
		marginBottom: 24,
	},

	section: {
		width: "100%",
		backgroundColor: "#fff",
		padding: 16,
		borderRadius: 16,
		marginBottom: 16,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
	},

	sectionTitle: {
		fontSize: 16,
		fontWeight: "600",
		marginBottom: 8,
		color: "#1268B0",
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

	mediaButton: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#1268B0",
		paddingVertical: 14,
		borderRadius: 12,
	},
	buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },

	imagePreviewGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "center",
		marginTop: 12,
	},
	imagePreviewItem: {
		width: 70,
		height: 70,
		borderRadius: 10,
		margin: 6,
		overflow: "hidden",
		backgroundColor: "#eee",
	},
	imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },

	statusRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 8,
	},
	statusButton: {
		flex: 1,
		paddingVertical: 12,
		marginHorizontal: 5,
		borderRadius: 12,
		alignItems: "center",
	},
	statusOk: { backgroundColor: "#28a745" },
	statusDamaged: { backgroundColor: "#dc3545" },
	statusInactive: { backgroundColor: "#eaeaea" },

	submitButton: {
		backgroundColor: "#1268B0",
		paddingVertical: 16,
		borderRadius: 14,
		alignItems: "center",
		shadowColor: "#1268B0",
		shadowOpacity: 0.2,
		shadowOffset: { width: 0, height: 2 },
		shadowRadius: 6,
		marginTop: 20,
	},

	// ----- Modal Styling -----
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
	modalHeader: {
		fontSize: 18,
		fontWeight: "700",
		marginBottom: 12,
		color: "#1268B0",
	},
	modalCloseButton: {
		marginTop: 16,
		backgroundColor: "#eee",
		borderRadius: 10,
		paddingVertical: 10,
		alignItems: "center",
	},
	modalCloseText: { color: "#1268B0", fontWeight: "600", fontSize: 16, textAlign: "center", paddingVertical: 10 },

	scrollContent: {},

	button: {
		width: "100%",
		backgroundColor: "#1268B0",
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: "center",
		marginTop: 8,
		shadowColor: "#1268B0",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.12,
		shadowRadius: 4,
	},
	modalContent: {
		backgroundColor: "#fff",
		borderRadius: 18,
		padding: 28,
		alignItems: "center",
		width: 340,
		shadowColor: "#1268B0",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.18,
		shadowRadius: 8,
	},

	modalTitle: {
		fontSize: 22,
		fontWeight: "bold",
		color: "#1268B0",
		marginBottom: 16,
	},
	projectTab: {
		backgroundColor: "#fff",
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 20,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: "#1268B0",
	},

	modalLoading: { alignItems: "center", marginVertical: 20 },
	modalLoadingText: { color: "#1268B0", fontWeight: "600", marginTop: 8 },

	projectOption: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f4f6fb",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		marginBottom: 10,
	},
	projectOptionActive: {
		backgroundColor: "#1268B0",
	},
	projectOptionText: {
		fontWeight: "600",
		color: "#1268B0",
	},

	addNewProjectButton: {},
	addNewProjectText: {
		marginLeft: 8,
		color: "#1268B0",
		fontWeight: "600",
	},

	modalActionButton: {
		flex: 1,
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
	},
	modalActionText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "600",
	},
	searchBar: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#fff",
		paddingHorizontal: 16,
		elevation: 3,
		marginBottom: 6,
		justifyContent: "center",
		borderWidth: 2,
		borderColor: "#1268B0",
		borderStyle: "dashed",
		borderRadius: 12,
		paddingVertical: 12,
		marginTop: 6,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: "#000",
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
