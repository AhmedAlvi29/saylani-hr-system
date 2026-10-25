import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiRequest } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isSetupComplete: boolean;
  companyName: string;
  welcomeMessage: string | null;
  setWelcomeMessage: (msg: string | null) => void;
  login: (token: string, user: User, companyName?: string) => void;
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
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  const checkSetup = async (): Promise<boolean> => {
    try {
      const data = await apiRequest<{ isSetupComplete: boolean; companyName?: string }>('/setup/status');
      const complete = Boolean(data.isSetupComplete);
      setIsSetupComplete(complete);
      if (data.companyName) setCompanyName(data.companyName);
      return complete;
    } catch (err) {
      console.warn('Could not verify setup status with backend:', err);
      setIsSetupComplete(false);
      return false;
    }
  };

  const fetchCurrentUser = async () => {
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const userData = await apiRequest<User>('/auth/me');
      setUser(userData);
      if (userData.companyName) {
        setCompanyName(userData.companyName);
      }
    } catch (err) {
      console.warn('Session expired or invalid token:', err);
      logout();
    }
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      setIsLoading(true);
      try {
        await Promise.all([checkSetup(), fetchCurrentUser()]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = (newToken: string, newUser: User, newCompanyName?: string) => {
    localStorage.setItem('saylani_hcm_token', newToken);
    setToken(newToken);
    setUser(newUser);
    if (newCompanyName) {
      setCompanyName(newCompanyName);
    } else if (newUser.companyName) {
      setCompanyName(newUser.companyName);
    }
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
        welcomeMessage,
        setWelcomeMessage,
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
