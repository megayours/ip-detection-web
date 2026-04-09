import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, register, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate("/registry");
    return null;
  }

  async function handleRegister() {
    setError("");
    setLoading(true);
    try {
      await register();
      navigate("/registry");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      await login();
      navigate("/registry");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-black">M</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome</h1>
          <p className="mt-2 text-sm text-slate-500">
            Authenticate with a passkey — no passwords, no email.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl text-sm font-semibold hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 transition-all shadow-lg shadow-rose-500/20"
          >
            Sign in with Passkey
          </button>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full px-4 py-3 bg-white text-slate-700 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all"
          >
            Create Account
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          Passkeys are phishing-resistant and never leave your device.
        </p>
      </div>
    </div>
  );
}
