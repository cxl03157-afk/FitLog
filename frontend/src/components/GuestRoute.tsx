import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const GuestRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading…</div>;
  return !isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};

export default GuestRoute;
