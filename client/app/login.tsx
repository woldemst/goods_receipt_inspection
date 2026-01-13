import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
	Alert,
	Image,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	ActivityIndicator,
	Pressable,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
	TouchableWithoutFeedback,
	Keyboard,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/auth-context";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [showPassword, setShowPassword] = useState(false);

	const { login } = useAuth();
	const router = useRouter();

	const handleLogin = async () => {
		const cleanEmail = email.trim().toLowerCase();
		if (!cleanEmail || !password) return Alert.alert("Fehler", "Bitte E-Mail und Passwort eingeben.");

		setSubmitting(true);
		try {
			const ok = await login(cleanEmail, password);
			if (ok) router.replace("/tabs/projectView");
			else Alert.alert("Fehler", "Falsche Zugangsdaten oder Serverfehler.");
		} catch (err) {
			console.error(err);
			Alert.alert("Fehler", "Ein unerwarteter Fehler ist aufgetreten.");
		} finally {
			setSubmitting(false);
		}
	};

	const FormContent = (
		<View style={styles.card}>
			<Text style={styles.title}>Willkommen zurück</Text>
			<Text style={styles.subtitle}>Bitte melden Sie sich an, um fortzufahren</Text>

			{/* Email Input */}
			<Text style={styles.fieldLabel}>E-Mail</Text>
			<View style={styles.inputRow}>
				<MaterialIcons name="person-outline" size={22} />
				<TextInput
					style={styles.input}
					value={email}
					onChangeText={setEmail}
					placeholder="Ihre E-Mail"
					placeholderTextColor="#8a8a8a"
					autoCapitalize="none"
					autoCorrect={false}
					editable={!submitting}
					keyboardType="email-address"
				/>
			</View>

			{/* Password Input */}
			<Text style={styles.fieldLabel}>Passwort</Text>
			<View style={styles.inputRow}>
				<MaterialIcons name="lock-outline" size={22} />
				<TextInput
					style={styles.input}
					value={password}
					onChangeText={setPassword}
					placeholder="Passwort"
					placeholderTextColor="#8a8a8a"
					secureTextEntry={!showPassword}
					editable={!submitting}
				/>
				<Pressable onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
					<Ionicons name={showPassword ? "eye" : "eye-off"} size={20} />
				</Pressable>
			</View>

			{/* Submit Button */}
			<TouchableOpacity style={[styles.button, submitting && { opacity: 0.7 }]} onPress={handleLogin} disabled={submitting}>
				{submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>EINLOGGEN</Text>}
			</TouchableOpacity>
		</View>
	);

	if (Platform.OS === "web") {
		return <SafeAreaView style={styles.screen}>{FormContent}</SafeAreaView>;
	}

	return (
		<SafeAreaView style={styles.screen}>
			<KeyboardAvoidingView
				style={{ flex: 1 }}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
			>
				<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
					<ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
						{FormContent}
					</ScrollView>
				</TouchableWithoutFeedback>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: "#f0f4f8" },
	scrollContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingVertical: 20, paddingHorizontal: 16 },

	logoWrap: { marginBottom: 36, width: "100%", alignItems: "center" },
	logo: { width: 160, height: 50 },

	card: {
		width: "100%",
		maxWidth: 420,
		backgroundColor: "#fff",
		borderRadius: 20,
		padding: 24,
		alignItems: "center",
		shadowColor: "#000",
		shadowOpacity: 0.05,
		shadowRadius: 10,
		elevation: 4,
	},

	title: { fontSize: 22, fontWeight: "700", color: "#1268B0", marginBottom: 6, textAlign: "center" },
	subtitle: { fontSize: 14, color: "#6b6b6b", marginBottom: 20, textAlign: "center" },

	fieldLabel: { alignSelf: "flex-start", color: "#1268B0", fontWeight: "600", marginBottom: 6, fontSize: 14 },

	inputRow: {
		width: "100%",
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f6f6f6",
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 16,
	},

	input: { marginLeft: 8, fontSize: 16, color: "#222", flex: 1, padding: 0 },

	eyeBtn: { paddingHorizontal: 6, paddingVertical: 4 },

	button: { width: "100%", backgroundColor: "#1268B0", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 12 },
	buttonText: { color: "#fff", fontSize: 17, fontWeight: "600", letterSpacing: 0.5 },
});
