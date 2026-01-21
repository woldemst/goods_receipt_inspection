import { StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SecureStore from "expo-secure-store";
import React, { useEffect, useState } from "react";

import LoginScreen from "./src/screens/LoginScreen";
import ProjectListScreen from "./src/screens/ProjectListScreen";
import { api } from "./src/api";

const Stack = createNativeStackNavigator;
export default function App() {
	const [token, setToken] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		async function init() {
			const savedToken = await SecureStore.getItemAsync("token");
			if (savedToken) {
				setToken(savedToken);
				api.defaults.headers.common.Authorization = `Bearer ${savedToken}`;
			}
		}
		init();
	}, []);
	return (
		<NavigationContainer>
			<Stack.Navigator screenOptions={{ headerShown: false }}>

			</Stack.Navigator>
		</NavigationContainer>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
		alignItems: "center",
		justifyContent: "center",
	},
});
