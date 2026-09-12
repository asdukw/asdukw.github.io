import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import {
	type GitHubUser,
	fetchCurrentUser,
	signInWithGitHub,
	signOut,
	userFromSupabaseUser,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
	user: GitHubUser | null;
	loading: boolean;
	isAdmin: boolean;
	login: () => void;
	logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<GitHubUser | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;

		const loadUser = async () => {
			const currentUser = await fetchCurrentUser();
			if (!active) return;
			setUser(currentUser);
			setLoading(false);
		};

		void loadUser();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setLoading(true);
			void Promise.resolve().then(async () => {
				const currentUser = session?.user
					? await userFromSupabaseUser(session.user)
					: null;
				if (!active) return;
				setUser(currentUser);
				setLoading(false);
			});
		});

		return () => {
			active = false;
			subscription.unsubscribe();
		};
	}, []);

	const login = useCallback(() => {
		void signInWithGitHub().catch((error) => {
			console.error("GitHub sign-in failed", error);
		});
	}, []);

	const logout = useCallback(() => {
		void signOut().catch((error) => {
			console.error("Sign-out failed", error);
		});
	}, []);

	const isAdmin = useMemo(() => {
		return user?.is_admin ?? false;
	}, [user]);

	const value = useMemo(
		() => ({ user, loading, isAdmin, login, logout }),
		[user, loading, isAdmin, login, logout],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext);
	if (!ctx) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return ctx;
}
