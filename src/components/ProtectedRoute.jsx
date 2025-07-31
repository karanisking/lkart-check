import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/lkart/" replace />;
  }

  return children;
};

export default ProtectedRoute;