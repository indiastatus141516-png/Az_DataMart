import React from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import Register from "./components/Register";
import Login from "./components/Login";
import UserDashboard from "./components/UserDashboard";
import AdminDashboard from "./components/AdminDashboard";
import AuthShell from "./components/AuthShell";
import DashboardShell from "./components/DashboardShell";
import { Toaster } from "react-hot-toast";

function App() {
  const DashboardHome = () => {
    const { user, loading } = React.useContext(AuthContext);
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    return user.role === "admin" ? <AdminDashboard /> : <UserDashboard />;
  };

  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2400,
          style: {
            background: "#0f172a",
            color: "#e2e8f0",
            borderRadius: "14px",
            border: "1px solid rgba(148, 163, 184, 0.3)",
          },
        }}
      />
      <Router>
        <Routes>
          <Route element={<AuthShell />}>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
          </Route>

          <Route path="/" element={<DashboardShell />}>
            <Route index element={<DashboardHome />} />
            <Route path="dashboard" element={<DashboardHome />} />
            <Route
              path="user/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/dashboard"
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
