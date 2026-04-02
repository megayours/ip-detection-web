import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import {
  getRegisterOptions,
  verifyRegistration,
  getLoginOptions,
  verifyLogin,
  getMe,
  setToken,
  getToken,
  type AuthUser,
} from "../api";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  register: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  async function register() {
    const options = await getRegisterOptions();
    const attestation = await startRegistration({ optionsJSON: options });
    const { token, user } = await verifyRegistration(attestation, options.challenge);
    setToken(token);
    setUser(user);
  }

  async function login() {
    const options = await getLoginOptions();
    const assertion = await startAuthentication({ optionsJSON: options });
    const { token, user } = await verifyLogin(assertion, options.challenge);
    setToken(token);
    setUser(user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
