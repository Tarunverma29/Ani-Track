import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SearchPage from "./pages/SearchPage";
import AnimePage from "./pages/AnimePage";
import WatchPage from "./pages/WatchPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user, loading, login, register, logout } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={login} />} />
        <Route path="/register" element={<RegisterPage onRegister={register} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold text-purple-400">
            Ani-Track
          </Link>
          <Link to="/" className="text-sm text-gray-400 hover:text-gray-200">
            Search
          </Link>
          <Link to="/history" className="text-sm text-gray-400 hover:text-gray-200">
            History
          </Link>
          <Link to="/settings" className="text-sm text-gray-400 hover:text-gray-200">
            Settings
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user.username}</span>
          <button
            onClick={logout}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/anime/:id" element={<AnimePage />} />
          <Route path="/watch/:id/:episode" element={<WatchPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
