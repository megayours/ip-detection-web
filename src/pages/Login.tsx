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
          <div className="flex gap-1 justify-center mb-4">
            <div className="w-3.5 h-8 rounded-sm bg-stone-900" />
            <div className="w-3.5 h-8 rounded-sm bg-stone-900" />
            <div className="w-3.5 h-8 rounded-sm bg-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Welcome</h1>
          <p className="mt-2 text-sm text-stone-500">
            Sign in to access your IP registry, cases and monitored sources.
          </p>
        </div>

        <button
          onClick={signIn}
          className="w-full px-4 py-3 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-all"
        >
          Continue with WorkOS
        </button>

        <p className="text-center text-xs text-stone-400 leading-relaxed">
          Sign in with Google, Microsoft, or your company SSO.
          <br />
          Everyone with an email at the same domain shares the same workspace.
        </p>
      </div>
    </div>
  );
}
