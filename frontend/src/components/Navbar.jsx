import { Link, useNavigate } from "react-router-dom";
import { Sun, Moon, LogOut, Folder, BarChart3 } from "lucide-react";
import { useAuth } from "../AuthContext";
import { useTheme } from "../ThemeContext";
import { Avatar } from "./ui/Avatar";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  const handleSignOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/dashboard" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          WorkMate
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="btn-secondary hidden sm:inline-flex">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </Link>
          <Link to="/projects" className="btn-secondary hidden sm:inline-flex">
            <Folder className="h-4 w-4" />
            Projects
          </Link>

          <button
            onClick={toggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {user && (
            <>
              <div className="ml-2 hidden items-center gap-2 sm:flex">
                <Avatar name={user.name} size={28} />
                <div className="text-sm">
                  <div className="font-medium text-slate-900 dark:text-slate-100">{user.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{user.role}</div>
                </div>
              </div>
              <button onClick={handleSignOut} className="btn-secondary" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
