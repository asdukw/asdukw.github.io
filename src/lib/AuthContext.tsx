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
  getAuthApiBase,
  getAdminUserId,
  fetchCurrentUser,
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
    fetchCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const login = useCallback(() => {
    const base = getAuthApiBase();
    window.location.href = `${base}/api/auth/login`;
  }, []);

  const logout = useCallback(() => {
    const base = getAuthApiBase();
    window.location.href = `${base}/api/auth/logout`;
  }, []);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const adminId = getAdminUserId();
    return adminId !== null && user.id === adminId;
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
