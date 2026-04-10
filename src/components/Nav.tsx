import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";

const DEMO_MAILTO =
  "mailto:antonio.palma@megayours.com?subject=MegaYours%20Demo%20Request";

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the user dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors ${
      pathname === path
        ? "text-stone-900"
        : "text-stone-400 hover:text-stone-700"
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-cream/80 backdrop-blur-md border-b border-stone-200/60">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <svg width="38" height="24" viewBox="0 0 56 36" className="shrink-0">
              <path d="M2,10 L2,4 L8,4" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round"/>
              <path d="M48,4 L54,4 L54,10" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round"/>
              <path d="M2,26 L2,32 L8,32" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round"/>
              <path d="M48,32 L54,32 L54,26" stroke="#b91c1c" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round"/>
              <rect x="8" y="8" width="8" height="20" rx="2" fill="currentColor"/>
              <rect x="19" y="8" width="8" height="20" rx="2" fill="currentColor"/>
              <rect x="30" y="8" width="8" height="20" rx="2" fill="currentColor"/>
              <rect x="41" y="8" width="8" height="20" rx="2" fill="#b91c1c"/>
            </svg>
            <span className="text-sm font-bold tracking-tight text-stone-900">MegaYours</span>
          </Link>
          {user && (
            <div className="flex items-center gap-6">
              <Link to="/registry" className={linkClass("/registry")}>
                Registry
              </Link>
              <Link to="/check" className={linkClass("/check")}>
                Scan
              </Link>
              <Link to="/cases" className={linkClass("/cases")}>
                Cases
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
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 group"
                title={user.email ?? user.display_name ?? ""}
              >
                <Avatar pictureUrl={user.picture_url} name={user.display_name ?? user.email} size={28} />
                <span className="hidden sm:inline text-sm font-medium text-stone-700 group-hover:text-stone-900 transition-colors">
                  {user.display_name || user.email || "Account"}
                </span>
                <svg
                  className={`w-3 h-3 text-stone-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-stone-200 rounded-xl shadow-lg shadow-stone-200/50 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-stone-100">
                    <div className="text-sm font-bold text-stone-900 truncate">
                      {user.display_name || "Signed in"}
                    </div>
                    {user.email && (
                      <div className="text-xs text-stone-500 truncate">{user.email}</div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      setMenuOpen(false);
                      await logout();
                      navigate("/");
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a
              href={DEMO_MAILTO}
              className="px-4 py-1.5 bg-stone-900 text-white text-sm font-semibold rounded-full hover:bg-stone-800 transition-colors"
            >
              Request a demo
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
