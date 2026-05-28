import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Inbox,
  Library,
  Radar,
  ShieldCheck,
  Settings as SettingsIcon,
  Shield,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Avatar from "./Avatar";
import { listIpReviews, needsAttention, getMonitoringFindingsCount } from "../api";

/** Inbox badge polling cadence. Cheap server-side aggregation + small payload,
 *  but no need to refetch every few seconds — the badge is a glanceable
 *  notification, not a live counter. */
const INBOX_POLL_MS = 60_000;

const BP_OPEN_KEY = "appshell.bp.open";

/**
 * Application shell — left sidebar (lg+) / off-canvas drawer (below lg) +
 * `<Outlet/>` main pane. Every signed-in route renders inside this so the
 * navigation, user menu, and notification badges are owned in one place.
 */
export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [inboxCount, setInboxCount] = useState(0);
  const [monitoringCount, setMonitoringCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Brand Protection group expanded/collapsed state. Persist, but auto-expand
  // whenever the active path belongs to a BP child route.
  const bpPathActive =
    pathname === "/findings" ||
    pathname.startsWith("/findings/") ||
    pathname === "/ips" ||
    pathname.startsWith("/ips/") ||
    pathname === "/monitors" ||
    pathname.startsWith("/monitors/");
  const [bpOpen, setBpOpen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(BP_OPEN_KEY);
      if (v === "0") return false;
      if (v === "1") return true;
    } catch {
      /* ignore */
    }
    return true;
  });
  useEffect(() => {
    if (bpPathActive && !bpOpen) setBpOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpPathActive]);
  useEffect(() => {
    try {
      localStorage.setItem(BP_OPEN_KEY, bpOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [bpOpen]);

  // Poll the inbox + monitoring badge counts while the user is signed in.
  // Refetch on path change too — when the lawyer locks a decision or triages
  // a finding and navigates back, the badge updates without waiting a tick.
  useEffect(() => {
    if (!user) {
      setInboxCount(0);
      setMonitoringCount(0);
      return;
    }
    let alive = true;
    async function refresh() {
      try {
        const [{ reviews }, { count }] = await Promise.all([
          listIpReviews({ limit: 200 }),
          getMonitoringFindingsCount(),
        ]);
        if (!alive) return;
        setInboxCount(reviews.filter(needsAttention).length);
        setMonitoringCount(count);
      } catch {
        // Non-fatal — badges just stay at the prior value.
      }
    }
    void refresh();
    const t = setInterval(refresh, INBOX_POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user, pathname]);

  // Close mobile drawer on navigation.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function isActive(to: string) {
    return pathname === to || pathname.startsWith(`${to}/`);
  }

  const sidebar = (
    <aside className="h-full flex flex-col bg-cream border-r border-stone-200/60">
      {/* Logo + brand */}
      <div className="px-5 pt-5 pb-4">
        <Link to="/" className="flex items-center gap-2">
          <svg width="28" height="18" viewBox="0 0 56 36" className="shrink-0">
            <path d="M2,10 L2,4 L8,4" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
            <path d="M48,4 L54,4 L54,10" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
            <path d="M2,26 L2,32 L8,32" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
            <path d="M48,32 L54,32 L54,26" stroke="#b91c1c" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round" />
            <rect x="8" y="8" width="8" height="20" rx="2" fill="currentColor" />
            <rect x="19" y="8" width="8" height="20" rx="2" fill="currentColor" />
            <rect x="30" y="8" width="8" height="20" rx="2" fill="currentColor" />
            <rect x="41" y="8" width="8" height="20" rx="2" fill="#b91c1c" />
          </svg>
          <span className="text-sm font-bold tracking-tight text-stone-900">MegaYours</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 overflow-y-auto">
        <NavItem to="/" icon={<Home size={18} />} label="Dashboard" active={pathname === "/"} />

        <NavGroup
          label="Brand Protection"
          open={bpOpen}
          onToggle={() => setBpOpen((v) => !v)}
        >
          <NavItem
            to="/findings"
            icon={<Inbox size={18} />}
            label="Findings"
            active={isActive("/findings")}
            badge={monitoringCount}
          />
          <NavItem
            to="/ips"
            icon={<Library size={18} />}
            label="Intellectual Properties"
            active={isActive("/ips")}
          />
          <NavItem
            to="/monitors"
            icon={<Radar size={18} />}
            label="Monitoring"
            active={isActive("/monitors")}
          />
        </NavGroup>

        <NavItem
          to="/clearance"
          icon={<ShieldCheck size={18} />}
          label="Clearance"
          active={isActive("/clearance")}
          badge={inboxCount}
        />
      </nav>

      {/* Footer: settings + admin + user menu */}
      <div className="px-3 pb-3 pt-2 border-t border-stone-200/60 space-y-0.5">
        <NavItem
          to="/settings"
          icon={<SettingsIcon size={18} />}
          label="Settings"
          active={isActive("/settings")}
        />
        {user?.role === "admin" && (
          <NavItem
            to="/admin"
            icon={<Shield size={18} />}
            label="Admin"
            active={isActive("/admin")}
          />
        )}
        {user && <UserMenu user={user} onLogout={async () => { await logout(); navigate("/"); }} />}
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-cream text-stone-900 font-[Inter,system-ui,sans-serif]">
      {/* Mobile topbar */}
      <div className="lg:hidden sticky top-0 z-30 bg-cream/90 backdrop-blur-md border-b border-stone-200/60 h-12 flex items-center px-3 gap-3">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-md hover:bg-stone-100 text-stone-700"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <svg width="22" height="14" viewBox="0 0 56 36">
            <rect x="8" y="8" width="8" height="20" rx="2" fill="currentColor" />
            <rect x="19" y="8" width="8" height="20" rx="2" fill="currentColor" />
            <rect x="30" y="8" width="8" height="20" rx="2" fill="currentColor" />
            <rect x="41" y="8" width="8" height="20" rx="2" fill="#b91c1c" />
          </svg>
          <span className="text-sm font-bold tracking-tight">MegaYours</span>
        </Link>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block lg:w-64 lg:h-screen lg:sticky lg:top-0 lg:shrink-0">
          {sidebar}
        </div>

        {/* Off-canvas drawer (mobile) */}
        {drawerOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="absolute inset-0 bg-stone-900/40"
              onClick={() => setDrawerOpen(false)}
              aria-hidden
            />
            <div className="relative w-64 h-full bg-cream shadow-xl flex flex-col">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute top-3 right-3 p-2 rounded-md hover:bg-stone-100 text-stone-600 z-10"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
              {sidebar}
            </div>
          </div>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 lg:h-screen lg:overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavItem({
  to,
  icon,
  label,
  active,
  badge,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
}) {
  const base =
    "group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors";
  const cls = active
    ? `${base} bg-stone-100 text-stone-900 font-semibold`
    : `${base} hover:bg-stone-50 text-stone-700`;
  return (
    <Link to={to} className={cls}>
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {badge && badge > 0 ? (
        <span
          title={`${badge} item${badge === 1 ? "" : "s"}`}
          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function NavGroup({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-400 hover:text-stone-600 transition-colors"
      >
        <span>{label}</span>
        <ChevronDown
          size={12}
          className={`transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

function UserMenu({
  user,
  onLogout,
}: {
  user: { email: string | null; display_name: string | null; picture_url: string | null };
  onLogout: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative pt-2 mt-2 border-t border-stone-200/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
        title={user.email ?? user.display_name ?? ""}
      >
        <Avatar pictureUrl={user.picture_url} name={user.display_name ?? user.email} size={28} />
        <span className="flex-1 min-w-0 text-left text-sm font-medium text-stone-800 truncate">
          {user.display_name || user.email || "Account"}
        </span>
        <ChevronDown
          size={12}
          className={`text-stone-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute bottom-full mb-1.5 left-0 right-0 bg-white border border-stone-200 rounded-xl shadow-lg shadow-stone-200/50 overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-stone-100">
            <div className="text-sm font-bold text-stone-900 truncate">
              {user.display_name || "Signed in"}
            </div>
            {user.email && (
              <div className="text-xs text-stone-500 truncate">{user.email}</div>
            )}
          </div>
          <button
            onClick={async () => {
              setOpen(false);
              await onLogout();
            }}
            className="w-full text-left px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
