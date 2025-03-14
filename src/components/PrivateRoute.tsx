import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { auth } from '../lib/firebase';

interface PrivateRouteProps {
  children: React.ReactNode;
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const { currentUser } = useAuth();

  useEffect(() => {
    // Force refresh the token to get the latest email verification status
    if (currentUser) {
      currentUser.reload();
    }
  }, [currentUser]);

  // First check if user is logged in
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // Then check email verification
  if (!auth.currentUser?.emailVerified) {
    return <Navigate to="/verify-email" />;
  }

  return <>{children}</>;
}

export default PrivateRoute;