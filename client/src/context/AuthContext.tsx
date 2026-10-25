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
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('saylani_hcm_token'));

  // Instant rehydration from localStorage so refresh is < 50ms with zero blank screen
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('saylani_hcm_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [companyName, setCompanyName] = useState<string>(() => {
    return localStorage.getItem('saylani_hcm_company') || 'Saylani HCM Lite';
  });

  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(() => {
    return localStorage.getItem('saylani_hcm_setup_complete') !== 'false';
  });

  // If token and user profile already exist in storage, do NOT block the UI with a spinner!
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    const hasToken = Boolean(localStorage.getItem('saylani_hcm_token'));
    const hasUser = Boolean(localStorage.getItem('saylani_hcm_user'));
    return hasToken && !hasUser;
  });

  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  const checkSetup = async (): Promise<boolean> => {
    try {
      const data = await apiRequest<{ isSetupComplete: boolean; companyName?: string }>('/setup/status');
      const complete = Boolean(data.isSetupComplete);
      setIsSetupComplete(complete);
      localStorage.setItem('saylani_hcm_setup_complete', String(complete));
      if (data.companyName) {
        setCompanyName(data.companyName);
        localStorage.setItem('saylani_hcm_company', data.companyName);
      }
      return complete;
    } catch (err) {
      console.warn('Could not verify setup status with backend:', err);
      return isSetupComplete;
    }
  };

  const fetchCurrentUser = async () => {
    if (!token) {
      setUser(null);
      localStorage.removeItem('saylani_hcm_user');
      return;
    }

    try {
      const userData = await apiRequest<User>('/auth/me');
      setUser(userData);
      localStorage.setItem('saylani_hcm_user', JSON.stringify(userData));
      if (userData.companyName) {
        setCompanyName(userData.companyName);
        localStorage.setItem('saylani_hcm_company', userData.companyName);
      }
    } catch (err) {
      console.warn('Session expired or invalid token:', err);
      logout();
    }
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        await Promise.all([checkSetup(), fetchCurrentUser()]);
      } catch (err) {
        console.warn('Background auth refresh failed:', err);
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
  }, [token]);

  const login = (newToken: string, newUser: User, newCompanyName?: string) => {
    localStorage.setItem('saylani_hcm_token', newToken);
    localStorage.setItem('saylani_hcm_user', JSON.stringify(newUser));
    localStorage.setItem('saylani_hcm_setup_complete', 'true');
    setToken(newToken);
    setUser(newUser);
    setIsSetupComplete(true);
    const cName = newCompanyName || newUser.companyName || companyName;
    if (cName) {
      localStorage.setItem('saylani_hcm_company', cName);
      setCompanyName(cName);
    }
  };

  const logout = () => {
    localStorage.removeItem('saylani_hcm_token');
    localStorage.removeItem('saylani_hcm_user');
    localStorage.removeItem('saylani_hcm_company');
    sessionStorage.removeItem('saylani_hcm_admin_dashboard');
    sessionStorage.removeItem('saylani_hcm_hr_dashboard');
    sessionStorage.removeItem('saylani_hcm_employee_dashboard');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updated: Partial<User>) => {
    if (user) {
      const merged = { ...user, ...updated };
      setUser(merged);
      localStorage.setItem('saylani_hcm_user', JSON.stringify(merged));
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
