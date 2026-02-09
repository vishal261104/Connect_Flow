import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi, authToken } from "../services/api.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		const bootstrap = async () => {
			const token = authToken.get();
			if (!token) {
				setLoading(false);
				return;
			}
			try {
				const me = await authApi.me();
				if (!cancelled) setUser(me);
			} catch {
				authToken.clear();
				if (!cancelled) setUser(null);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};
		bootstrap();
		return () => {
			cancelled = true;
		};
	}, []);

	const value = useMemo(() => {
		return {
			user,
			loading,
			login: async ({ email, password }) => {
				const result = await authApi.login({ email, password });
				authToken.set(result?.token ?? "");
				setUser(result?.user ?? null);
				return result?.user ?? null;
			},
			register: async ({ email, password }) => {
				const result = await authApi.register({ email, password });
				authToken.set(result?.token ?? "");
				setUser(result?.user ?? null);
				return result?.user ?? null;
			},
			logout: async () => {
				try {
					await authApi.logout();
				} catch {
					// ignore
				}
				authToken.clear();
				setUser(null);
			},
		};
	}, [user, loading]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within AuthProvider");
	return ctx;
};
