import Constants from "expo-constants";
import axios from "axios";

const apiUrl = Constants.easConfig?.extra?.BACKEND_URL;

export const api = axios.create({
	baseURL: apiUrl,
	timeout: 15000,
});

export async function login(email: string, password: string) {
	const { data } = await api.post("/auth/login", { email, password });
	return data;
}

export async function fetchProjects() {
	const { data } = await api.get("/projects");
	return data;
}
