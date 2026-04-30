import { Navigate, useLocation } from 'react-router-dom';
import { useContext, type JSX } from 'react';
import { AuthContext } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: JSX.Element;
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const authContext = useContext(AuthContext);
  const location = useLocation();

  if (!authContext) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const { isAuthenticated, user } = authContext;

  if (!isAuthenticated || !user) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.userType)) {
    // Role not authorized, redirect to their specific dashboard or home
    const rolePaths: Record<string, string> = {
      Client: '/client/dashboard',
      Lawyer: '/lawyer/dashboard',
      Junior: '/junior/dashboard',
    };
    
    return <Navigate to={rolePaths[user.userType] || '/'} replace />;
  }

  return children;
};

export default ProtectedRoute;
