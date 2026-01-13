// _layout.tsx
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { useAuth } from "../../context/auth-context";

export default function TabsLayout() {
	const { user, isAdmin, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		const timer = setTimeout(() => {
			if (!user && !loading) {
				router.replace("/login");
			}
		}, 0);
		return () => clearTimeout(timer);
	}, [user, loading, router]);

	if (loading) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#e0f2fe" }}>
				<ActivityIndicator size="large" color="#1268B0" />
			</View>
		);
	}

	if (!user) return null;

	return (
		<Tabs
			screenOptions={({ route }) => ({
				headerShown: false,
				tabBarShowLabel: true,
				tabBarActiveTintColor: "#1268B0",
				tabBarInactiveTintColor: "#94a3b8",
				tabBarLabelStyle: {
					fontSize: 12,
					fontWeight: "600",
					marginBottom: 2,
				},
				tabBarIcon: ({ color, size }) => {
					let iconName: keyof typeof Ionicons.glyphMap = "home";
					if (route.name === "projectView" && isAdmin) iconName = "file-tray-full-outline";
					if (route.name === "report") iconName = "add-circle";
					if (route.name === "profile") iconName = "person";
					return <Ionicons name={iconName} size={22} color={color} />;
				},
				tabBarStyle: {
					position: "absolute",
					height: 60,
					backgroundColor: "#f8fafc",
					borderTopWidth: 0,
					elevation: 6,
					shadowColor: "#000",
					shadowOpacity: 0.1,
					shadowOffset: { width: 0, height: 2 },
					shadowRadius: 6,
				},
			})}
		>
			<Tabs.Screen name="projectView" options={{ title: "Datenbank", headerShown: false }} />
			<Tabs.Screen name="report" options={{ title: "Prüfbericht", headerShown: false }} />
			<Tabs.Screen name="profile" options={{ title: "Benutzer", headerShown: false }} />
		</Tabs>
	);
}
