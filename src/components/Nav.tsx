import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold text-gray-900">
            IP Detection
          </Link>
          {user && (
            <>
              <Link to="/trademarks" className="text-sm text-gray-600 hover:text-gray-900">
                My Trademarks
              </Link>
              <Link to="/check" className="text-sm text-gray-600 hover:text-gray-900">
                Check Image
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          ) : (
            <Link to="/login" className="text-sm text-blue-600 hover:text-blue-800">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
