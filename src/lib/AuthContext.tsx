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
	consumeSessionToken,
	fetchCurrentUser,
	signInWithGitHub,
	signOut,
} from "@/lib/auth";

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

		consumeSessionToken();
		void fetchCurrentUser().then((currentUser) => {
			if (!active) return;
			setUser(currentUser);
			setLoading(false);
		});

		return () => {
			active = false;
		};
	}, []);

	const login = useCallback(() => {
		signInWithGitHub();
	}, []);

	const logout = useCallback(() => {
		setLoading(true);
		void signOut()
			.then(() => setUser(null))
			.catch((error) => console.error("Sign-out failed", error))
			.finally(() => setLoading(false));
	}, []);

	const isAdmin = useMemo(() => user?.is_admin ?? false, [user]);

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
