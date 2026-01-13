import { ExpoRoot } from "expo-router";
import { KeyboardProvider } from "react-native-keyboard-controller";

// @ts-ignore: require.context is a webpack feature used by expo-router
const ctx = require.context("./app");

export default function App() {
	return (
		<KeyboardProvider>
			<ExpoRoot context={ctx} />
		</KeyboardProvider>
	);
}
