import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, register, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate("/trademarks");
    return null;
  }

  async function handleRegister() {
    setError("");
    setLoading(true);
    try {
      await register();
      navigate("/trademarks");
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
      navigate("/trademarks");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto py-16 space-y-6">
      <h1 className="text-2xl font-bold text-center text-gray-900">Sign In</h1>
      <p className="text-sm text-gray-500 text-center">
        Use a passkey to sign in or create a new account.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          Sign in with Passkey
        </button>
        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full px-4 py-2.5 bg-white text-gray-700 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          Create Account
        </button>
      </div>
    </div>
  );
}
