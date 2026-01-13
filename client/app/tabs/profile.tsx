import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../context/auth-context";

type LocalAvatar = { uri: string; name: string; type: string };

export default function Profile() {
	const { user, userId, token, firstName, lastName, avatar, isAdmin, logout, setUserAndToken } = useAuth();
	const router = useRouter();
	const [newAvatar, setNewAvatar] = React.useState<LocalAvatar | null>(null);

	const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
	const BACKEND_URL = React.useMemo(() => (Constants.expoConfig?.extra?.BACKEND_URL || "").replace(/\/+$/, ""), []);

	const resolvedAvatar = React.useMemo(() => {
		if (newAvatar?.uri) return newAvatar.uri;
		if (!avatar) return null;
		if (avatar.startsWith("http") || avatar.startsWith("data:")) return avatar;
		const sanitizedAvatar = avatar.replace(/^(\.\.\/)+/, "").replace(/^\/+/, "");
		if (!sanitizedAvatar) return null;
		if (BACKEND_URL) return `${BACKEND_URL}/${sanitizedAvatar}`;
		return `/${sanitizedAvatar}`;
	}, [newAvatar, avatar, BACKEND_URL]);

	const requestCameraPermission = async () => {
		const { status } = await ImagePicker.requestCameraPermissionsAsync();
		if (status !== "granted") {
			Alert.alert("Kamerazugriff verweigert", "Bitte erlaube den Zugriff auf die Kamera in den iPhone-Einstellungen.");
			return false;
		}
		return true;
	};

	const pickAvatar = async () => {
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
						const asset = result.assets[0];
						if (asset?.uri) {
							setNewAvatar({
								uri: asset.uri,
								name: asset.fileName ?? `avatar_${userId ?? "user"}.jpg`,
								type: asset.mimeType ?? "image/jpeg",
							});
						}
					}
				},
			},
			{
				text: "Aus Galerie",
				onPress: async () => {
					const result = await ImagePicker.launchImageLibraryAsync({
						mediaTypes: ["images"],
						quality: 0.8,
					});

					if (!result.canceled) {
						const asset = result.assets[0];
						if (asset?.uri) {
							setNewAvatar({
								uri: asset.uri,
								name: asset.fileName ?? `avatar_${userId ?? "user"}.jpg`,
								type: asset.mimeType ?? "image/jpeg",
							});
						}
					}
				},
			},
			{ text: "Abbrechen", style: "cancel" },
		]);
	};

	const handleChangeAvatar = async () => {
		if (!newAvatar) return;
		// console.log(userId, token, BACKEND_URL);

		if (!userId || !token || !BACKEND_URL) {
			return Alert.alert("Fehler", "Fehlende Benutzerdaten. Bitte melde dich erneut an.");
		}

		try {
			setUploadingAvatar(true);
			const formData = new FormData();
			formData.append("avatar", {
				uri: newAvatar.uri,
				name: newAvatar.name,
				type: newAvatar.type,
			} as any);

			const res = await fetch(`${BACKEND_URL}/api/users/${userId}`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			});

			if (res.status === 401) {
				Alert.alert("Sitzung abgelaufen", "Bitte melde dich erneut an.", [
					{
						text: "OK",
						onPress: async () => {
							await logout();
							router.replace("/login");
						},
					},
				]);
				return;
			}

			if (res.ok) {
				const updatedUser = await res.json();
				await setUserAndToken(
					updatedUser?.email ?? user ?? null,
					updatedUser?._id ?? userId,
					token,
					updatedUser?.firstName ?? firstName,
					updatedUser?.lastName ?? lastName,
					updatedUser?.avatar ?? avatar,
					updatedUser?.isAdmin ?? isAdmin
				);
				setNewAvatar(null);
				Alert.alert("Erfolg", "Avatar wurde aktualisiert.");
			} else {
				const error = await res.json().catch(() => null);
				Alert.alert("Fehler", error?.error || "Avatar konnte nicht geaendert werden.");
			}
		} catch (err) {
			Alert.alert("Fehler", "Avatar konnte nicht geaendert werden.");
		} finally {
			setUploadingAvatar(false);
		}
	};

	const handleLogout = async () => {
		await logout();
		router.replace("/login");
	};

	const handleManageUsers = () => router.push("/user/userManagement");

	return (
		<View style={styles.background}>
			<View style={styles.container}>
				<View style={styles.logoWrap}>
					<Image source={require("../../assets/images/thenex_logo.png")} style={styles.logo} resizeMode="contain" />
				</View>

				<View style={{ width: "100%", height: "70%", justifyContent: "space-between" }}>
					<Text style={styles.title}>Profil</Text>

					{/* Avatar Section */}
					<View style={styles.avatarSection}>
						{resolvedAvatar ? (
							<Image source={{ uri: resolvedAvatar }} style={styles.avatar} />
						) : (
							<Ionicons name="person-circle" size={90} color="#1268B0" />
						)}
						<TouchableOpacity style={styles.avatarButton} onPress={pickAvatar}>
							<Text style={styles.avatarButtonText}>Bild aendern</Text>
						</TouchableOpacity>
						{newAvatar && (
							<TouchableOpacity
								style={[styles.avatarButton, { backgroundColor: "#22bb33", flexDirection: "row", alignItems: "center", gap: 6 }]}
								onPress={handleChangeAvatar}
								disabled={uploadingAvatar}
							>
								{uploadingAvatar ? <ActivityIndicator size="small" color="#fff" /> : null}
								<Text style={[styles.avatarButtonText, { color: "#fff" }]}>{uploadingAvatar ? "Wird gespeichert..." : "Speichern"}</Text>
							</TouchableOpacity>
						)}
					</View>

					{/* User Info */}
					<View style={styles.infoSection}>
						<Text style={styles.info}>Vorname: {firstName || ""}</Text>
						<Text style={styles.info}>Nachname: {lastName || ""}</Text>
						<Text style={styles.info}>Email: {user}</Text>
					</View>

					{/* Buttons */}
					<View>
						<TouchableOpacity style={styles.submitButton} onPress={handleLogout}>
							<Text style={styles.submitButtonText}>Logout</Text>
						</TouchableOpacity>

						{isAdmin && (
							<TouchableOpacity style={styles.adminButton} onPress={handleManageUsers}>
								<Text style={styles.adminButtonText}>Alle Benutzer verwalten</Text>
							</TouchableOpacity>
						)}
					</View>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	background: { flex: 1 },

	container: {
		width: "100%",
		height: "100%",
		maxWidth: 450,
		backgroundColor: "#f0f4f8",
		padding: 16,
		paddingBottom: 78,
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 10,
		elevation: 4,
		justifyContent: "space-between",
	},

	title: { fontSize: 24, fontWeight: "bold", color: "#1268B0", marginBottom: 20, textAlign: "center" },

	avatarSection: { alignItems: "center", marginBottom: 20 },
	avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: "#1268B0", marginBottom: 10 },
	avatarButton: { backgroundColor: "#fff", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16, marginTop: 6, elevation: 2 },
	avatarButtonText: { color: "#1268B0", fontWeight: "600" },

	infoSection: { width: "100%", marginBottom: 20, alignItems: "center" },
	info: { fontSize: 16, color: "#222", marginBottom: 8 },

	submitButton: { width: "100%", backgroundColor: "#1268B0", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 12 },
	submitButtonText: { color: "#fff", fontSize: 17, fontWeight: "600" },

	adminButton: {
		width: "100%",
		backgroundColor: "#e6f0ff",
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
		borderWidth: 1,
		borderColor: "#1268B0",
	},
	adminButtonText: { color: "#1268B0", fontWeight: "700", fontSize: 16 },

	logoWrap: { width: "100%", alignItems: "center", paddingVertical: 80 },
	logo: { width: 160, height: 50 },
});
