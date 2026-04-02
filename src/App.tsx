import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Nav from "./components/Nav";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Trademarks from "./pages/Trademarks";
import TrademarkDetail from "./pages/TrademarkDetail";
import Check from "./pages/Check";

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
          path="/trademarks"
          element={<ProtectedRoute><Trademarks /></ProtectedRoute>}
        />
        <Route
          path="/trademarks/:id"
          element={<ProtectedRoute><TrademarkDetail /></ProtectedRoute>}
        />
        <Route
          path="/check"
          element={<ProtectedRoute><Check /></ProtectedRoute>}
        />
      </Routes>
    </div>
  );
}
