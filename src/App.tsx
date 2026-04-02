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
  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/trademarks"
            element={
              <ProtectedRoute>
                <Trademarks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trademarks/:id"
            element={
              <ProtectedRoute>
                <TrademarkDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/check"
            element={
              <ProtectedRoute>
                <Check />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
