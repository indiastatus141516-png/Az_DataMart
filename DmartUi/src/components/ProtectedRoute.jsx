import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

// Protects a route so only authenticated users can access. If "adminOnly" is true, only admins can access.
// Usage examples:
// <Route path="/admin/dashboard" element={<ProtectedRoute adminOnly={true}><AdminDashboard/></ProtectedRoute>} />
// <Route path="/user/dashboard" element={<ProtectedRoute><UserDashboard/></ProtectedRoute>} />
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading, isAdmin } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // If access is admin-only but user is not admin -> redirect to user dashboard
  if (adminOnly && !isAdmin()) return <Navigate to="/user/dashboard" replace />;

  // If not admin-only (regular user route) but user is admin -> redirect to admin dashboard
  if (!adminOnly && isAdmin())
    return <Navigate to="/admin/dashboard" replace />;

  return children;
};

export default ProtectedRoute;
