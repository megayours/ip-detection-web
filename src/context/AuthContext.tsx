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

// Where to send the user after a successful sign-in.
//
// Two transports because frontend and API live on different origins
// (megayours.com vs ip-detection.yours.fun) and Safari/ITP can drop
// sessionStorage during cross-origin navigation:
//
//   1. sessionStorage["auth_return_to"] — set by ProtectedRoute / AdminRoute
//      so the value survives the click-through to /login. Picked up here when
//      we hand off to WorkOS so the backend can echo it through the OAuth
//      state. Falls back to direct consumption on the way back if the URL
//      param is missing.
//   2. ?next=<path> URL param on the post-callback redirect — bulletproof
//      against storage being wiped, since it travels in the OAuth round-trip
//      itself.
const RETURN_TO_KEY = "auth_return_to";

function isSafePath(p: string | null | undefined): p is string {
  if (!p || !p.startsWith("/") || p.startsWith("//")) return false;
  if (p === "/" || p.startsWith("/login")) return false;
  return true;
}

export function stashReturnTo(path: string) {
  if (!isSafePath(path)) return;
  try {
    sessionStorage.setItem(RETURN_TO_KEY, path);
  } catch {
    // Storage unavailable (private mode, etc.) — silently fall back to default.
  }
}

function readStashedReturnTo(): string | null {
  try {
    const v = sessionStorage.getItem(RETURN_TO_KEY);
    return isSafePath(v) ? v : null;
  } catch {
    return null;
  }
}

function clearStashedReturnTo() {
  try {
    sessionStorage.removeItem(RETURN_TO_KEY);
  } catch {
    /* noop */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // After WorkOS callback the backend redirects us back here with `?token=…`
    // (and optionally `?next=…`) in the URL. Consume both, persist the token
    // into localStorage, then strip them from the URL so refreshes don't
    // re-process the same values.
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get("token");
    const nextFromUrl = urlParams.get("next");
    let justSignedIn = false;
    let returnTo: string | null = null;
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      justSignedIn = true;
      // Prefer the URL param (travels with the OAuth round-trip and survives
      // any storage wipe). Fall back to sessionStorage for older clients or
      // if the start request didn't carry return_to for some reason.
      returnTo = isSafePath(nextFromUrl) ? nextFromUrl : readStashedReturnTo();
      clearStashedReturnTo();
      urlParams.delete("token");
      urlParams.delete("next");
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
            if (justSignedIn && returnTo) navigate(returnTo, { replace: true });
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
    // Hand off the stashed return path so the backend can echo it through the
    // OAuth state and back to us as `?next=…`. Full-page navigation — WorkOS
    // hosted UI takes over from here.
    const returnTo = readStashedReturnTo() ?? undefined;
    window.location.href = workosLoginUrl(returnTo);
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
