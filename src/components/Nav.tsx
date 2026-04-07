import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors ${
      pathname === path
        ? "text-slate-900"
        : "text-slate-400 hover:text-slate-700"
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center">
              <span className="text-white text-xs font-black">M</span>
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900">MegaYours</span>
          </Link>
          {user && (
            <div className="flex items-center gap-6">
              <Link to="/trademarks" className={linkClass("/trademarks")}>
                Registry
              </Link>
              <Link to="/check" className={linkClass("/check")}>
                Scan
              </Link>
              <Link to="/test" className={linkClass("/test")}>
                Test
              </Link>
              <Link to="/reviews" className={linkClass("/reviews")}>
                Reviews
              </Link>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/login"
              className="text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
