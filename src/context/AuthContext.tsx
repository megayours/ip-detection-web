import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
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

// Where to send the user after a successful sign-in. ProtectedRoute /
// AdminRoute write to this when bouncing an unauthenticated visitor to /login;
// the OAuth round-trip preserves it because it's a same-tab navigation, then
// AuthContext consumes + clears it after the callback token lands.
const RETURN_TO_KEY = "auth_return_to";

export function stashReturnTo(path: string) {
  // Only store same-origin paths starting with "/" — never an absolute URL —
  // to prevent a hostile referrer from turning sign-in into an open redirect.
  if (!path.startsWith("/") || path.startsWith("//")) return;
  // Don't loop back to /login or /; both would defeat the purpose.
  if (path === "/" || path.startsWith("/login")) return;
  try {
    sessionStorage.setItem(RETURN_TO_KEY, path);
  } catch {
    // Storage unavailable (private mode, etc.) — silently fall back to default.
  }
}

function consumeReturnTo(): string | null {
  try {
    const v = sessionStorage.getItem(RETURN_TO_KEY);
    if (v) sessionStorage.removeItem(RETURN_TO_KEY);
    if (!v || !v.startsWith("/") || v.startsWith("//")) return null;
    return v;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // After WorkOS callback the backend redirects us back here with `?token=…`
    // in the URL. Consume it once, persist into localStorage, then strip it
    // from the URL so refreshes don't re-process the same token.
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");
    let justSignedIn = false;
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      justSignedIn = true;
      urlParams.delete("token");
      const newSearch = urlParams.toString();
      const newUrl =
        window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }

    if (getToken()) {
      getMe()
        .then(({ user }) => {
          if (user) {
            setUser(user);
            // Send the user back to the page they originally tried to visit
            // (stashed by ProtectedRoute / AdminRoute before bouncing them
            // through /login).
            if (justSignedIn) {
              const returnTo = consumeReturnTo();
              if (returnTo) navigate(returnTo, { replace: true });
            }
          } else {
            setToken(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [navigate]);

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
