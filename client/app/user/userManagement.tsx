import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Image,
	ActivityIndicator,
	FlatList,
	Modal,
	TextInput,
	Switch,
	KeyboardAvoidingView,
	Platform,
	Alert,
} from "react-native";
import Constants from "expo-constants";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/auth-context";
import { User } from "../../shared/types";

export default function UserManagement() {
	const router = useRouter();
	const { user, userId } = useAuth();
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	// Editing
	const [editUser, setEditUser] = useState<User | null>(null);
	const [editFirstName, setEditFirstName] = useState("");
	const [editLastName, setEditLastName] = useState("");
	const [editPassword, setEditPassword] = useState("");
	const [editIsAdmin, setEditIsAdmin] = useState(false);
	const [saving, setSaving] = useState(false);

	// Adding
	const [addModalVisible, setAddModalVisible] = useState(false);
	const [newFirstName, setNewFirstName] = useState("");
	const [newLastName, setNewLastName] = useState("");
	const [newEmail, setNewEmail] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [newIsAdmin, setNewIsAdmin] = useState(false);
	const [creating, setCreating] = useState(false);

	const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

	const fetchAllUsers = async () => {
		setLoading(true);
		try {
			const res = await fetch(`${BACKEND_URL}/api/admin/users/`);
			if (res.ok) {
				const data: User[] = await res.json();

				const filtered = data.filter((u) => u.email !== user);
				setUsers(filtered);
			} else {
				setUsers([]);
			}
		} catch (e) {
			console.error("fetchAllUsers error:", e);
			setUsers([]);
		}
		setLoading(false);
	};

	useEffect(() => {
		fetchAllUsers();
	}, [user]);

	const onRefresh = async () => {
		setRefreshing(true);
		await fetchAllUsers();
		setRefreshing(false);
	};

	// Start editing
	const startEditUser = (u: User) => {
		setEditUser(u);
		setEditFirstName(u.firstName || "");
		setEditLastName(u.lastName || "");
		setEditPassword("");
		setEditIsAdmin(!!u.isAdmin);
	};

	// Save edited user
	const saveUser = async () => {
		if (!editUser) return;
		setSaving(true);
		try {
			const res = await fetch(`${BACKEND_URL}/api/admin/users/${editUser._id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					firstName: editFirstName,
					lastName: editLastName,
					password: editPassword ? editPassword : undefined,
					isAdmin: editIsAdmin,
				}),
			});
			if (res.ok) {
				Alert.alert("Erfolg", "Benutzerdaten gespeichert");
				setEditUser(null);
				await fetchAllUsers();
			} else {
				const text = await res.text().catch(() => "");
				console.warn("saveUser response not ok:", text);
				Alert.alert("Fehler", "Speichern fehlgeschlagen");
			}
		} catch (e) {
			console.error("saveUser error:", e);
			Alert.alert("Fehler", "Speichern fehlgeschlagen");
		}
		setSaving(false);
	};

	// Create new user
	const createUser = async () => {
		if (!newFirstName.trim() || !newLastName.trim() || !newPassword.trim() || !newEmail.trim()) {
			Alert.alert("Fehler", "Bitte Vorname, Nachname, E-Mail und Passwort eingeben.");
			return;
		}
		setCreating(true);
		try {
			const res = await fetch(`${BACKEND_URL}/api/admin/users/`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					firstName: newFirstName.trim(),
					lastName: newLastName.trim(),
					email: newEmail.trim(),
					password: newPassword,
					isAdmin: newIsAdmin,
				}),
			});
			if (res.ok) {
				Alert.alert("Erfolg", "Benutzer angelegt");
				setAddModalVisible(false);
				setNewFirstName("");
				setNewLastName("");
				setNewEmail("");
				setNewPassword("");
				setNewIsAdmin(false);
				await fetchAllUsers();
			} else {
				const text = await res.text().catch(() => "");
				console.warn("createUser response not ok:", text);
				Alert.alert("Fehler", "Benutzer konnte nicht angelegt werden");
			}
		} catch (e) {
			console.error("createUser error:", e);
			Alert.alert("Fehler", "Benutzer konnte nicht angelegt werden");
		}
		setCreating(false);
	};

	// Delete user
	const deleteUser = (u: User) => {
		if (u.email === user) {
			Alert.alert("Aktion nicht erlaubt", "Sie können Ihren eigenen Account nicht löschen.");
			return;
		}
		Alert.alert("Benutzer löschen", `Möchten Sie ${u.email} wirklich löschen?`, [
			{ text: "Abbrechen", style: "cancel" },
			{
				text: "Löschen",
				style: "destructive",
				onPress: async () => {
					try {
						const res = await fetch(`${BACKEND_URL}/api/admin/users/${u._id}`, { method: "DELETE" });
						if (res.ok) {
							Alert.alert("Erfolg", "Benutzer gelöscht");
							await fetchAllUsers();
						} else {
							Alert.alert("Fehler", "Löschen fehlgeschlagen");
						}
					} catch (e) {
						console.error("deleteUser error:", e);
						Alert.alert("Fehler", "Löschen fehlgeschlagen");
					}
				},
			},
		]);
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.screen}>
				<View style={styles.logoWrap}>
					<Image source={require("../../assets/images/Thenex_Logo_2015_AVADA_700_Transparent.png")} style={styles.logo} resizeMode="contain" />
				</View>
				<View style={styles.header}>
					<View style={styles.row}>
						<TouchableOpacity onPress={() => router.push("/tabs/profile")} style={styles.backBtn}>
							<Ionicons name="arrow-back" size={24} color="#1268B0" />
						</TouchableOpacity>
						<Text style={styles.cardTitleMain}>Benutzerverwaltung</Text>
						<View style={{ width: 48 }}></View>
					</View>
					<View style={styles.row}>
						<TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
							<Text style={styles.addButtonText}>Benutzer hinzufügen</Text>
						</TouchableOpacity>
					</View>
				</View>

				{loading ? (
					<ActivityIndicator size="large" color="#1268B0" style={{ marginTop: 20 }} />
				) : (
					<FlatList
						style={{ flex: 1 }}
						contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 }}
						data={users}
						keyExtractor={(item) => item._id}
						ListEmptyComponent={<Text style={styles.emptyText}>Keine Benutzer gefunden</Text>}
						refreshing={refreshing}
						onRefresh={onRefresh}
						renderItem={({ item }) => (
							<View style={styles.userCard}>
								<View style={styles.cardMain}>
									<View style={{ flex: 1 }}>
										<Text style={styles.cardTitle}>
											{item.firstName || ""} {item.lastName || ""}
										</Text>
										<Text style={styles.userEmail}>{item.email}</Text>
										<Text style={styles.description}>Admin: {item.isAdmin ? "Ja" : "Nein"}</Text>
									</View>
									<View style={styles.cardActions}>
										<TouchableOpacity onPress={() => startEditUser(item)} style={styles.actionBtn}>
											<Text style={styles.actionText}>Bearbeiten</Text>
										</TouchableOpacity>
										<TouchableOpacity onPress={() => deleteUser(item)} style={[styles.actionBtn, { marginTop: 8 }]}>
											<Text style={[styles.actionText, { color: "#ff3333" }]}>Löschen</Text>
										</TouchableOpacity>
									</View>
								</View>
							</View>
						)}
					/>
				)}

				{/* Edit Modal */}
				<Modal animationType="fade" transparent={true} visible={!!editUser} onRequestClose={() => setEditUser(null)}>
					<KeyboardAvoidingView style={styles.modalBackground} behavior={Platform.OS === "ios" ? "padding" : "height"}>
						<View style={styles.modalContainer}>
							<Text style={styles.modalTitle}>Benutzer bearbeiten</Text>
							<TextInput style={styles.input} placeholder="Vorname" value={editFirstName} onChangeText={setEditFirstName} />
							<TextInput style={styles.input} placeholder="Nachname" value={editLastName} onChangeText={setEditLastName} />
							<TextInput
								style={styles.input}
								placeholder="Neues Passwort (optional)"
								value={editPassword}
								onChangeText={setEditPassword}
								secureTextEntry
							/>
							<View style={styles.switchRow}>
								<Text>Admin:</Text>
								<Switch value={editIsAdmin} onValueChange={setEditIsAdmin} />
							</View>
							<TouchableOpacity style={styles.addButton} onPress={saveUser} disabled={saving}>
								<Text style={styles.addButtonText}>{saving ? "Speichern..." : "Speichern"}</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={() => setEditUser(null)} style={{ marginTop: 10 }}>
								<Text style={{ textAlign: "center", color: "#1268B0", fontWeight: "600" }}>Abbrechen</Text>
							</TouchableOpacity>
						</View>
					</KeyboardAvoidingView>
				</Modal>

				{/* Add Modal */}
				<Modal animationType="fade" transparent={true} visible={addModalVisible} onRequestClose={() => setAddModalVisible(false)}>
					<KeyboardAvoidingView style={styles.modalBackground} behavior={Platform.OS === "ios" ? "padding" : "height"}>
						<View style={styles.modalContainer}>
							<Text style={styles.modalTitle}>Neuen Benutzer erstellen</Text>
							<TextInput style={styles.input} placeholder="Vorname" value={newFirstName} onChangeText={setNewFirstName} />
							<TextInput style={styles.input} placeholder="Nachname" value={newLastName} onChangeText={setNewLastName} />
							<TextInput
								style={styles.input}
								placeholder="E-Mail"
								value={newEmail}
								onChangeText={setNewEmail}
								keyboardType="email-address"
								autoCapitalize="none"
							/>
							<TextInput style={styles.input} placeholder="Passwort" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
							<View style={styles.switchRow}>
								<Text>Admin:</Text>
								<Switch value={newIsAdmin} onValueChange={setNewIsAdmin} />
							</View>
							<TouchableOpacity style={styles.addButton} onPress={createUser} disabled={creating}>
								<Text style={styles.addButtonText}>{creating ? "Erstellen..." : "Erstellen"}</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={() => setAddModalVisible(false)} style={{ marginTop: 10 }}>
								<Text style={{ textAlign: "center", color: "#1268B0", fontWeight: "600" }}>Abbrechen</Text>
							</TouchableOpacity>
						</View>
					</KeyboardAvoidingView>
				</Modal>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: "#1268B0" },
	screen: { flex: 1, backgroundColor: "#1268B0" },
	header: {
		paddingTop: 8,
		backgroundColor: "#fff",
		borderRadius: 18,
		padding: 16,
		paddingBottom: 22,
		elevation: 8,
		marginHorizontal: 24,
		marginBottom: 8,
		// flex: 1
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		// flex: 1,
	},
	backBtn: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 6,
		paddingHorizontal: 12,
		borderRadius: 10,
	},
	backText: {
		color: "#fff",
		fontWeight: "600",
		fontSize: 16,
		marginLeft: 6,
	},
	logoWrap: { marginTop: 12, marginBottom: 16, width: "100%", alignItems: "center" },
	logo: { width: 180, height: 60 },

	cardTitleMain: { fontSize: 22, fontWeight: "700", color: "#1268B0", textAlign: "center", marginBottom: 0 },

	addButton: {
		width: "100%",
		backgroundColor: "#1268B0",
		paddingVertical: 12,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginTop: 12,
	},
	addButtonText: { color: "#fff", fontWeight: "700", fontSize: 16 },

	userCard: {
		backgroundColor: "#f9f9f9",
		borderRadius: 14,
		padding: 18,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		elevation: 2,
		minHeight: 90, // <-- makes each card taller
		flexDirection: "row",
		alignItems: "center",
	},
	cardMain: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		width: "100%",
	},
	cardTitle: {
		fontWeight: "700",
		fontSize: 18,
		marginBottom: 6,
		color: "#0f172a",
	},
	userEmail: {
		color: "#0b63d6",
		fontSize: 15,
		marginBottom: 4,
	},
	description: {
		color: "#222",
		fontSize: 14,
		marginBottom: 0,
	},
	cardActions: {
		alignItems: "flex-end",
		marginLeft: 16,
	},
	actionBtn: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 8,
		backgroundColor: "#f6f8fb",
		marginBottom: 4,
		minWidth: 90,
		alignItems: "center",
	},
	actionText: {
		color: "#1268B0",
		fontWeight: "600",
		fontSize: 15,
	},

	emptyText: { color: "#888", fontSize: 16, textAlign: "center", marginTop: 20 },

	// Modal styles
	modalBackground: {
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
	},
	modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#1268B0" },
	input: {
		borderWidth: 1,
		borderColor: "#e6eef8",
		borderRadius: 8,
		padding: 10,
		marginBottom: 10,
		backgroundColor: "#fbfdff",
	},
	switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
});
