import { Navigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { Spinner } from "./ui/Spinner";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
