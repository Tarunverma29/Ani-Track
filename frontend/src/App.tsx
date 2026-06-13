import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SearchPage from "./pages/SearchPage";
import AnimePage from "./pages/AnimePage";
import WatchPage from "./pages/WatchPage";
import HistoryPage from "./pages/HistoryPage";
import SettingsPage from "./pages/SettingsPage";
import LibraryPage from "./pages/LibraryPage";
import StatsPage from "./pages/StatsPage";
import { Search, Clock, Settings, LogOut, User, BookMarked, BarChart3 } from "lucide-react";

function NavItem({ to, icon: Icon, label, active }: { to: string; icon: any; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 px-5 border-r relative no-underline transition-colors"
      style={{
        borderColor: "rgba(255,255,255,0.07)",
        background: active ? "#111520" : "transparent",
        color: active ? "#e0e8f0" : "#5a6a7a",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "0.8rem",
        letterSpacing: "0.08em",
      }}
    >
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "#b83040" }} />}
      <Icon size={16} />
      {label}
    </Link>
  );
}

export default function App() {
  const { user, loading, login, register, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "#090b0e", fontFamily: "'JetBrains Mono', monospace", color: "#4a5a6e" }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ background: "#090b0e", minHeight: "100vh" }}>
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={login} />} />
          <Route path="/register" element={<RegisterPage onRegister={register} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  const navItems = [
    { to: "/", icon: Search, label: "SEARCH" },
    { to: "/library", icon: BookMarked, label: "LIBRARY" },
    { to: "/stats", icon: BarChart3, label: "STATS" },
    { to: "/history", icon: Clock, label: "HISTORY" },
    { to: "/settings", icon: Settings, label: "SETTINGS" },
  ];

  const currentPath = location.pathname;
  const showNav = !currentPath.startsWith("/watch");

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: "100vh", background: "#090b0e" }}
    >
      {showNav && (
        <div
          className="flex-shrink-0 flex items-stretch border-b"
          style={{ height: 48, borderColor: "rgba(255,255,255,0.07)", background: "#090b0e" }}
        >
          <div className="flex items-center px-5 border-r gap-3 flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <span style={{ color: "#b83040", fontSize: "0.9rem", letterSpacing: "0.15em" }}>■</span>
            <div>
              <span style={{ color: "#e0e8f0", fontFamily: "'Cinzel', serif", fontSize: "1rem", fontWeight: 700, letterSpacing: "0.12em" }}>
                ANI-TRACK
              </span>
              <span style={{ color: "#4a5a6e", fontFamily: "'Noto Sans JP', sans-serif", fontSize: "0.65rem", marginLeft: 8, letterSpacing: "0.08em" }}>
                追跡
              </span>
            </div>
          </div>

          <div className="flex items-stretch">
            {navItems.map((item) => (
              <NavItem key={item.to} to={item.to} icon={item.icon} label={item.label} active={currentPath === item.to} />
            ))}
          </div>

          <div className="flex-1" />

          <div className="flex items-center px-5 border-l gap-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <User size={15} style={{ color: "#4a5a6e" }} />
            <span style={{ color: "#8a9aaa", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}>{user.username}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5"
              style={{ color: "#b83040", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem", cursor: "pointer", background: "none", border: "none", letterSpacing: "0.06em" }}
            >
              <LogOut size={13} />
              logout
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <div className="max-w-6xl mx-auto p-6">
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/anime/:id" element={<AnimePage />} />
              <Route path="/watch/:id/:episode" element={<WatchPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}
