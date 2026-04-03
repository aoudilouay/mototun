import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppShellSkeleton } from './loading/RouteSkeletons';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();
  const loadingAccent = location.pathname.startsWith('/fournisseur')
    ? 'emerald'
    : location.pathname.startsWith('/admin')
      ? 'slate'
      : 'cyan';

  if (loading) {
    return <AppShellSkeleton accent={loadingAccent} />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    if (user?.role === 'Revendeur') {
      return <Navigate to="/revendeur/dashboard" replace />;
    } else if (user?.role === 'Fournisseur') {
      return <Navigate to="/fournisseur/dashboard" replace />;
    } else if (user?.role === 'Admin') {
      return <Navigate to="/admin/users" replace />;
    } else {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
