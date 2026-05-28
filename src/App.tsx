import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { stashReturnTo } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Registry from "./pages/Registry";
import RegistryDetail from "./pages/RegistryDetail";
import RegistryAudit from "./pages/RegistryAudit";
import RegistryWizard from "./pages/RegistryWizard";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import Clearance from "./pages/Clearance";
import ClearanceReviewNew from "./pages/ClearanceReviewNew";
import IpReviewDetail from "./pages/IpReviewDetail";
import Findings from "./pages/Findings";
import Inbox from "./pages/Inbox";
import Monitors from "./pages/Monitors";
import Dashboard from "./pages/Dashboard";
import BrandsCatalog from "./pages/BrandsCatalog";
import DesignsCatalog from "./pages/DesignsCatalog";
import PopCultureCatalog from "./pages/PopCultureCatalog";
import Admin from "./pages/Admin";
import AdminIpDetail from "./pages/AdminIpDetail";
import Settings from "./pages/Settings";

function TrademarkRedirect() {
  const { id } = useParams();
  return <Navigate to={`/ips/${id}`} replace />;
}

function RegistryRedirect() {
  const { id } = useParams();
  return <Navigate to={`/ips/${id}`} replace />;
}

function RegistryAuditRedirect() {
  const { id } = useParams();
  return <Navigate to={`/ips/${id}/audit`} replace />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) {
    stashReturnTo(location.pathname + location.search + location.hash);
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) {
    stashReturnTo(location.pathname + location.search + location.hash);
    return <Navigate to="/login" />;
  }
  if (user.role !== "admin") {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <h1 className="text-xl font-black text-stone-900">Admin access required</h1>
        <p className="mt-2 text-sm text-stone-500">
          Your account doesn't have the admin role. Ask your workspace owner to
          promote you, or run <code className="px-1 rounded bg-stone-100">
            scripts/promote_admin.sh
          </code> against the API.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * `/` is special: signed-in users see the Dashboard (inside the app shell);
 * everyone else sees the marketing Landing page. We split it as two route
 * branches keyed on auth — the protected branch keeps the same AppShell as
 * every other authed route, no extra redirect hop.
 */
function HomeSwitch() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (user) {
    // Defer to the authed AppShell — the layout route handles rendering.
    return <Navigate to="/dashboard" replace />;
  }
  return <Landing />;
}

export default function App() {
  return (
    <Routes>
      {/* Signed-in routes (AppShell layout) */}
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/ips" element={<Registry />} />
        <Route path="/ips/new" element={<RegistryWizard />} />
        <Route path="/ips/:id" element={<RegistryDetail />} />
        <Route path="/ips/:id/audit" element={<RegistryAudit />} />
        {/* Findings + Clearance (no mode) both redirect to /inbox. Routes kept
            so deep links (dashboard KPIs, old bookmarks) keep landing somewhere. */}
        <Route path="/findings" element={<Findings />} />
        <Route path="/monitors" element={<Monitors />} />
        <Route path="/clearance" element={<Clearance />} />
        <Route path="/ip-reviews/new" element={<ClearanceReviewNew />} />
        <Route path="/ip-reviews/:id" element={<IpReviewDetail />} />
        <Route path="/clearance/brands/catalog" element={<BrandsCatalog />} />
        <Route path="/clearance/designs/catalog" element={<DesignsCatalog />} />
        <Route path="/clearance/pop/catalog" element={<PopCultureCatalog />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Admin (separate gate, same shell) */}
      <Route element={<AdminRoute><AppShell /></AdminRoute>}>
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/ips/:id" element={<AdminIpDetail />} />
      </Route>

      {/* Public: landing OR auth-aware dashboard switch */}
      <Route path="/" element={<HomeSwitch />} />
      <Route path="/login" element={<Login />} />

      {/* Redirects — preserve old URLs */}
      <Route path="/registry" element={<Navigate to="/ips" replace />} />
      <Route path="/registry/new" element={<Navigate to="/ips/new" replace />} />
      <Route path="/registry/:id" element={<RegistryRedirect />} />
      <Route path="/registry/:id/audit" element={<RegistryAuditRedirect />} />
      <Route path="/monitoring" element={<Navigate to="/inbox?tab=monitoring" replace />} />
      <Route path="/monitoring/*" element={<Navigate to="/inbox?tab=monitoring" replace />} />
      <Route path="/trademarks" element={<Navigate to="/ips" replace />} />
      <Route path="/trademarks/:id" element={<TrademarkRedirect />} />
      <Route path="/ip-reviews" element={<Navigate to="/inbox?tab=clearance" replace />} />
      <Route path="/design-match" element={<Navigate to="/clearance?mode=visual" replace />} />
    </Routes>
  );
}
