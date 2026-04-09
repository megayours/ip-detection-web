import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Nav from "./components/Nav";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Registry from "./pages/Registry";
import RegistryDetail from "./pages/RegistryDetail";
import Check from "./pages/Check";
import TestSubmission from "./pages/TestSubmission";
import ReviewQueue from "./pages/ReviewQueue";

function RedirectTrademark() {
  const { id } = useParams();
  return <Navigate to={`/registry/${id}`} replace />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-[Inter,system-ui,sans-serif]">
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/registry"
          element={<ProtectedRoute><Registry /></ProtectedRoute>}
        />
        <Route
          path="/registry/:id"
          element={<ProtectedRoute><RegistryDetail /></ProtectedRoute>}
        />
        <Route path="/trademarks" element={<Navigate to="/registry" replace />} />
        <Route path="/trademarks/:id" element={<RedirectTrademark />} />
        <Route
          path="/check"
          element={<ProtectedRoute><Check /></ProtectedRoute>}
        />
        <Route
          path="/test"
          element={<ProtectedRoute><TestSubmission /></ProtectedRoute>}
        />
        <Route
          path="/reviews"
          element={<ProtectedRoute><ReviewQueue /></ProtectedRoute>}
        />
      </Routes>
    </div>
  );
}
