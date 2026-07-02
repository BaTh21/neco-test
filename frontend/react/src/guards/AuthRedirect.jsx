import { Backdrop, CircularProgress, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthRedirect = ({ children }) => {
  const { isAuthenticated, loading, checkAuthStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const verifyAuthentication = async () => {
      await checkAuthStatus();
      setAuthChecked(true);
    };

    verifyAuthentication();
  }, [checkAuthStatus]);

  useEffect(() => {
    if (authChecked && !loading && isAuthenticated) {
      // Already logged in → redirect to dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [authChecked, loading, isAuthenticated, navigate]);

  // Show loading spinner while checking auth
  if (loading || !authChecked) {
    return (
      <Backdrop
        open={true}
        sx={{ zIndex: 1300, color: '#fff', flexDirection: 'column', gap: 2 }}
      >
        <CircularProgress color="inherit" />
        <Typography variant="h6" color="inherit">
          Checking authentication...
        </Typography>
      </Backdrop>
    );
  }

  // If not logged in, render the children (login/register forms)
  return children;
};

export default AuthRedirect;
