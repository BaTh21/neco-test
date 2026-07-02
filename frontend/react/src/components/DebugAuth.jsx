import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const DebugAuth = ({ children }) => {
  const { updateUser, auth } = useAuth();

  useEffect(() => {
    // Only set debug user if no user exists yet
    if (!auth.user) {
      const debugUser = {
        id: '123',
        username: 'debug_user',
        email: 'debug@example.com',
        token: 'debug-token'
      };
      updateUser(debugUser);
    }
  }, [updateUser, auth.user]);

  return children;
};

export default DebugAuth;
