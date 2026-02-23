import React, { createContext, useContext, useState, ReactNode, useEffect, useRef, PropsWithChildren } from 'react';
import { User } from '../types';
import { authAPI } from '../services/apiService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, otp: string) => Promise<boolean>;
  logout: () => void;
  register: (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
    security_question: string;
    security_answer: string;
    otp: string;
  }) => Promise<{ success: boolean; error?: string }>;
  sendOtp: (email: string, type?: 'login' | 'register') => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; security_question?: string; error?: string }>;
  resetPassword: (email: string, security_answer: string, new_password: string) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string;
  setAuthError: (error: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const hasChecked = useRef(false);

  // Check auth ONCE on mount — no flickering, no re-renders during check
  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const checkAuth = async () => {
      try {
        // Try to verify session with backend first
        const data = await authAPI.getCurrentUser();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('authUser', JSON.stringify(data.user));
        } else {
          // Backend responded but no session — stay logged out
          localStorage.removeItem('authUser');
        }
      } catch {
        // Backend not available — DON'T clear localStorage, DON'T set user
        // User will need to login through the backend when it's available
        // We intentionally stay on the login page to avoid stale state
        localStorage.removeItem('authUser');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string, otp: string): Promise<boolean> => {
    try {
      setAuthError('');
      const data = await authAPI.login(email, password, otp);
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('authUser', JSON.stringify(data.user));
        return true;
      }
      return false;
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please try again.');
      return false;
    }
  };

  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
    security_question: string;
    security_answer: string;
    otp: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthError('');
      await authAPI.register(userData);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed.' };
    }
  };

  const sendOtp = async (email: string, type: 'login' | 'register' = 'register'): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthError('');
      await authAPI.sendOtp(email, type);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send OTP.' };
    }
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; security_question?: string; error?: string }> => {
    try {
      const data = await authAPI.forgotPassword(email);
      return { success: true, security_question: data.security_question };
    } catch (err: any) {
      return { success: false, error: err.message || 'Email not found.' };
    }
  };

  const resetPassword = async (email: string, security_answer: string, new_password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await authAPI.resetPassword(email, security_answer, new_password);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Password reset failed.' };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore logout errors
    }
    setUser(null);
    localStorage.removeItem('authUser');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      register,
      sendOtp,
      forgotPassword,
      resetPassword,
      isAuthenticated: !!user,
      isLoading,
      authError,
      setAuthError
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
