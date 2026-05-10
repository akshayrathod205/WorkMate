import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Projects from "./components/Projects";
import ProjectDetails from "./components/ProjectDetails";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Spinner } from "./components/ui/Spinner";

const Dashboard = lazy(() => import("./components/Dashboard"));
const AddTeamMembers = lazy(() => import("./components/AddTeamMembers"));
const CreateTask = lazy(() => import("./components/CreateTask"));
const CreateProject = lazy(() => import("./components/CreateProject"));

const RouteFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <Spinner />
  </div>
);

const App = () => {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <ProjectDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id/add-team-members"
            element={
              <ProtectedRoute>
                <AddTeamMembers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id/create-task"
            element={
              <ProtectedRoute>
                <CreateTask />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-project"
            element={
              <ProtectedRoute>
                <CreateProject />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
