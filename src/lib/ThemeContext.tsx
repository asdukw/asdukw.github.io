import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "site.theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
// 移动端地址栏配色，和 --background 的 light/dark 值保持一致。
const THEME_COLOR: Record<ResolvedTheme, string> = {
	light: "#ffffff",
	dark: "#0a0a0a",
};

function readStoredMode(): ThemeMode {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored === "light" || stored === "dark" || stored === "system"
			? stored
			: "system";
	} catch {
		return "system";
	}
}

function systemPrefersDark(): boolean {
	return typeof window !== "undefined" && window.matchMedia(DARK_QUERY).matches;
}

interface ThemeContextValue {
	mode: ThemeMode;
	resolved: ResolvedTheme;
	setMode: (mode: ThemeMode) => void;
	toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
	const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark);

	useEffect(() => {
		if (mode !== "system") return;
		const mql = window.matchMedia(DARK_QUERY);
		const onChange = () => setSystemDark(mql.matches);
		onChange();
		mql.addEventListener("change", onChange);
		return () => mql.removeEventListener("change", onChange);
	}, [mode]);

	const resolved: ResolvedTheme =
		mode === "system" ? (systemDark ? "dark" : "light") : mode;

	useEffect(() => {
		const root = document.documentElement;
		root.classList.toggle("dark", resolved === "dark");
		root.style.colorScheme = resolved;
		document
			.querySelector('meta[name="theme-color"]')
			?.setAttribute("content", THEME_COLOR[resolved]);
	}, [resolved]);

	const setMode = useCallback((next: ThemeMode) => {
		setModeState(next);
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// ignore storage failures
		}
	}, []);

	const toggleTheme = useCallback(() => {
		setMode(systemPrefersDark() ? "light" : "dark");
	}, [setMode]);

	const value = useMemo(
		() => ({ mode, resolved, setMode, toggleTheme }),
		[mode, resolved, setMode, toggleTheme],
	);

	return (
		<ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (!ctx) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return ctx;
}
