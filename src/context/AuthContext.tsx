import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import {
  getMe,
  setToken,
  getToken,
  workosLoginUrl,
  logout as apiLogout,
  type AuthUser,
} from "../api";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // After WorkOS callback the backend redirects us back here with `?token=…`
    // in the URL. Consume it once, persist into localStorage, then strip it
    // from the URL so refreshes don't re-process the same token.
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      urlParams.delete("token");
      const newSearch = urlParams.toString();
      const newUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }

    if (getToken()) {
      getMe()
        .then(({ user }) => {
          if (user) setUser(user);
          else setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function signIn() {
    // Full-page navigation — WorkOS hosted UI takes over from here.
    window.location.href = workosLoginUrl();
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
