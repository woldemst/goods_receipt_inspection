import { Slot, Redirect, usePathname } from "expo-router";
import { useAuth, AuthProvider } from "../context/auth-context";
import { ActivityIndicator, View } from "react-native";

function AuthGate() {
	const { user, loading } = useAuth();
	const pathName = usePathname();

	if (loading) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	if (!user && pathName !== "/login") {
		return <Redirect href="/login" />;
	}

	if (user && pathName === "/login") {
		return <Redirect href="/tabs/projectView" />;
	}

	return <Slot />; // normal route rendering
}

export default function RootLayout() {
	return (
		<AuthProvider>
			<AuthGate />
		</AuthProvider>
	);
}
