import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
	user: string | null; // email
	userId: string | null;
	token: string | null;
	firstName: string | null;
	lastName: string | null;
	avatar: string | null;
	isAdmin: boolean;
	loading: boolean;
	login: (email: string, password: string) => Promise<boolean>;
	logout: () => Promise<void>;
	register: (email: string, password: string, firstName?: string, lastName?: string, avatar?: string) => Promise<boolean>;
	setUserAndToken: (
		email: string | null,
		id: string | null,
		t: string | null,
		fName?: string | null,
		lName?: string | null,
		av?: string | null,
		admin?: boolean
	) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
	user: null,
	userId: null,
	token: null,
	firstName: null,
	lastName: null,
	avatar: null,
	isAdmin: false,
	loading: true,
	login: async () => false,
	logout: async () => {},
	register: async () => false,
	setUserAndToken: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<string | null>(null); // email
	const [userId, setUserId] = useState<string | null>(null);
	const [token, setToken] = useState<string | null>(null);
	const [firstName, setFirstName] = useState<string | null>(null);
	const [lastName, setLastName] = useState<string | null>(null);
	const [avatar, setAvatar] = useState<string | null>(null);
	const [isAdmin, setIsAdmin] = useState<boolean>(false);
	const [loading, setLoading] = useState<boolean>(true);

	const BACKEND_URL = (Constants.expoConfig?.extra?.BACKEND_URL || "").replace(/\/+$/, "");

	const validateSession = async (tok: string | null) => {
		if (!tok) return false;

		try {
			const res = await fetch(`${BACKEND_URL}/api/users/me`, {
				headers: {
					Authorization: `Bearer ${tok}`,
				},
			});

			if (!res.ok) return false;

			const data = await res.json();

			await setUserAndToken(data.email, data._id, tok, data.firstName, data.lastName, data.avatar, Boolean(data.isAdmin));

			return true;
		} catch (err) {
			console.warn("Session validate error:", err);
			return false;
		}
	};

	useEffect(() => {
		(async () => {
			try {
				const [storedUser, storedUserId, storedToken, storedFirstName, storedLastName, storedAvatar, storedIsAdmin] = await Promise.all([
					AsyncStorage.getItem("user"),
					AsyncStorage.getItem("userId"),
					AsyncStorage.getItem("token"),
					AsyncStorage.getItem("firstName"),
					AsyncStorage.getItem("lastName"),
					AsyncStorage.getItem("avatar"),
					AsyncStorage.getItem("isAdmin"),
				]);

					if (storedToken) {
						setUser(storedUser);
						setUserId(storedUserId);
						setToken(storedToken);
						setFirstName(storedFirstName);
						setLastName(storedLastName);
						setAvatar(storedAvatar);
						setIsAdmin(storedIsAdmin === "true");

						const ok = await validateSession(storedToken);
					if (!ok) await logout();
				}
			} catch (err) {
				console.warn("Auth restore error:", err);
				await logout();
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	// helper to set user/token both in state and AsyncStorage
	const setUserAndToken = async (
		email: string | null,
		id: string | null,
		t: string | null,
		fName: string | null = null,
		lName: string | null = null,
		av: string | null = null,
		admin: boolean = false
	) => {
		try {
			setUser(email);
			setUserId(id);
			setToken(t);
			setFirstName(fName);
			setLastName(lName);
			setAvatar(av);
			setIsAdmin(admin);

			if (email) await AsyncStorage.setItem("user", email);
			else await AsyncStorage.removeItem("user");

			if (id) await AsyncStorage.setItem("userId", id);
			else await AsyncStorage.removeItem("userId");

			if (t) await AsyncStorage.setItem("token", t);
			else await AsyncStorage.removeItem("token");

			if (fName) await AsyncStorage.setItem("firstName", fName);
			else await AsyncStorage.removeItem("firstName");

			if (lName) await AsyncStorage.setItem("lastName", lName);
			else await AsyncStorage.removeItem("lastName");

			if (av) await AsyncStorage.setItem("avatar", av);
			else await AsyncStorage.removeItem("avatar");

			await AsyncStorage.setItem("isAdmin", String(admin || false));
		} catch (err) {
			console.warn("setUserAndToken error:", err);
		}
	};

	const login = async (email: string, password: string) => {
		try {
			const res = await fetch(`${BACKEND_URL}/api/users/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			});

			if (!res.ok) {
				// let caller handle UX; return false
				return false;
			}

			const data = await res.json();
			// expected response from server: { _id, email, firstName, lastName, avatar, isAdmin, token }
			const tok = data?.token || null;
			const id = data?._id || null;
			const mail = data?.email || email;
			const fName = data?.firstName || null;
			const lName = data?.lastName || null;
			const av = data?.avatar || null;
			const admin = Boolean(data?.isAdmin);

			await setUserAndToken(mail, id, tok, fName, lName, av, admin);
			return true;
		} catch (err) {
			console.error("Login error:", err);
			return false;
		}
	};

	const logout = async () => {
		try {
			setUser(null);
			setUserId(null);
			setToken(null);
			setFirstName(null);
			setLastName(null);
			setAvatar(null);
			setIsAdmin(false);
			await AsyncStorage.multiRemove(["user", "userId", "token", "firstName", "lastName", "avatar", "isAdmin"]);
		} catch (err) {
			console.warn("Logout error:", err);
		}
	};

	const register = async (email: string, password: string, fName?: string, lName?: string, av?: string) => {
		try {
			const res = await fetch(`${BACKEND_URL}/api/users/register`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password, firstName: fName, lastName: lName, avatar: av }),
			});

			if (!res.ok) {
				return false;
			}

			const data = await res.json();
			// server returns token on register in our server.js
			const tok = data?.token || null;
			const id = data?._id || null;
			const mail = data?.email || email;
			const first = data?.firstName || fName || null;
			const last = data?.lastName || lName || null;
			const avatarUrl = data?.avatar || av || null;
			const admin = Boolean(data?.isAdmin);

			await setUserAndToken(mail, id, tok, first, last, avatarUrl, admin);
			return true;
		} catch (err) {
			console.error("Register error:", err);
			return false;
		}
	};

	return (
		<AuthContext.Provider
			value={{
				user,
				userId,
				token,
				firstName,
				lastName,
				avatar,
				isAdmin,
				loading,
				login,
				logout,
				register,
				setUserAndToken,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export function useAuth() {
	return useContext(AuthContext);
}
