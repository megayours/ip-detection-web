import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();

  // If we're already signed in (e.g. landed here directly), bounce to /registry.
  useEffect(() => {
    if (user) navigate("/registry");
  }, [user, navigate]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-black">M</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to access your IP registry, cases and monitored sources.
          </p>
        </div>

        <button
          onClick={signIn}
          className="w-full px-4 py-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl text-sm font-semibold hover:from-rose-600 hover:to-rose-700 transition-all shadow-lg shadow-rose-500/20"
        >
          Continue with WorkOS
        </button>

        <p className="text-center text-xs text-slate-400 leading-relaxed">
          Sign in with Google, Microsoft, or your company SSO.
          <br />
          Everyone with an email at the same domain shares the same workspace.
        </p>
      </div>
    </div>
  );
}
