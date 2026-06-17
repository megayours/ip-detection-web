import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DEMO_MAILTO =
  "mailto:antonio.palma@unvelar.com?subject=Unvelar%20Demo%20Request";

/**
 * Marketing-page navigation bar. Only rendered by `Landing.tsx` — the
 * signed-in shell has its own sidebar in `AppShell.tsx`.
 */
export default function Nav() {
  const { user } = useAuth();
  return (
    <nav className="sticky top-0 z-50 bg-cream/80 backdrop-blur-md border-b border-stone-200/60">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <svg width="38" height="24" viewBox="0 0 56 36" className="shrink-0">
            <path d="M2,10 L2,4 L8,4" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
            <path d="M48,4 L54,4 L54,10" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
            <path d="M2,26 L2,32 L8,32" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
            <path d="M48,32 L54,32 L54,26" stroke="#b91c1c" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round" />
            <rect x="8" y="8" width="8" height="20" rx="2" fill="currentColor" />
            <rect x="19" y="8" width="8" height="20" rx="2" fill="currentColor" />
            <rect x="30" y="8" width="8" height="20" rx="2" fill="currentColor" />
            <rect x="41" y="8" width="8" height="20" rx="2" fill="#b91c1c" />
          </svg>
          <span className="text-sm font-bold tracking-tight text-stone-900">Unvelar</span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <Link
              to="/"
              className="px-4 py-1.5 bg-stone-900 text-white text-sm font-semibold rounded-full hover:bg-stone-800 transition-colors"
            >
              Open app
            </Link>
          ) : (
            // Sign in intentionally not surfaced — the portal is invite-only for
            // the current demo phase. /login still works as a direct URL.
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
