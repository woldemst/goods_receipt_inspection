// app/index.tsx
import { Redirect } from "expo-router";
import { useAuth } from "../context/auth-context";

export default function Index() {
	const { user } = useAuth();

	if (user) {
		return <Redirect href="/tabs/projectView" />;
	} else {
		return <Redirect href="/login" />;
	}
}
