import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiRequest } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSetupComplete: boolean;
  companyName: string;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  checkSetup: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('saylani_hcm_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(true);
  const [companyName, setCompanyName] = useState<string>('Saylani HCM Lite');

  const checkSetup = async (): Promise<boolean> => {
    try {
      const data = await apiRequest<{ isSetupComplete: boolean; companyName?: string }>('/setup/status');
      setIsSetupComplete(data.isSetupComplete);
      if (data.companyName) setCompanyName(data.companyName);
      return data.isSetupComplete;
    } catch (err) {
      console.error('Failed to check setup status:', err);
      return true;
    }
  };

  const fetchCurrentUser = async () => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const userData = await apiRequest<User>('/auth/me');
      setUser(userData);
    } catch (err) {
      console.warn('Session expired or invalid token:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await checkSetup();
      await fetchCurrentUser();
    };
    init();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('saylani_hcm_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('saylani_hcm_token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isSetupComplete,
        companyName,
        login,
        logout,
        updateUser,
        checkSetup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
