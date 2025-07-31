import { createContext, useContext } from 'react';

// Create the context with a default undefined value
export const AuthContext = createContext(undefined);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
