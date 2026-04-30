import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  allowedRoles?: Array<'Client' | 'Lawyer' | 'Junior' | 'Admin'>;
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    // Not logged in, redirect to login
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.userType)) {
    // Logged in but doesn't have the right role, redirect to their respective dashboard
    const rolePaths = {
      Client: '/client/dashboard',
      Lawyer: '/lawyer/dashboard',
      Junior: '/junior/dashboard',
      Admin: '/admin/dashboard'
    };
    return <Navigate to={rolePaths[user.userType] || '/'} replace />;
  }

  // Authorized, render the children
  return <Outlet />;
};

export default ProtectedRoute;
