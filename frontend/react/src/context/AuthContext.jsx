// context/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getMe } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    accessToken: localStorage.getItem('accessToken') || null,
    refreshToken: localStorage.getItem('refreshToken') || null,
    user: null
  });
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Verify token is valid by fetching user data
      const userData = await getMe();
      setAuth(prev => ({
        ...prev,
        user: userData
      }));
      
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setAuth({
        accessToken: null,
        refreshToken: null,
        user: null
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (tokens, userData = null) => {
    try {
      if (tokens && tokens.access_token) {
        localStorage.setItem('accessToken', tokens.access_token);
        if (tokens.refresh_token) {
          localStorage.setItem('refreshToken', tokens.refresh_token);
        }

        let user = userData;
        
        // Always fetch fresh user data to ensure it's valid
        if (!user) {
          user = await getMe();
        }

        setAuth({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          user: user
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      logout();
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAuth({
      accessToken: null,
      refreshToken: null,
      user: null
    });
  };

  const updateUser = (userData) => {
    setAuth(prev => ({
      ...prev,
      user: userData
    }));
  };

  const value = {
    auth,
    login,
    logout,
    updateUser,
    checkAuthStatus,
    loading,
    isAuthenticated: !!auth.accessToken && !!auth.user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;