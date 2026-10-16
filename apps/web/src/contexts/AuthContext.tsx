'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  emailVerifiedAt: string | null;
  status?: string;
  sellerStatus?: string;
  createdAt?: string;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    city?: string;
    locality?: string;
  };
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isLoading: boolean; // Backwards compatibility
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<string>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  refresh: () => Promise<void>; // Backwards compatibility alias
  mode: 'guest' | 'host';
  setMode: (mode: 'guest' | 'host') => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setModeState] = useState<'guest' | 'host'>('guest');

  useEffect(() => {
    const savedMode = window.localStorage.getItem('bidrush-mode');
    if (savedMode === 'guest' || savedMode === 'host') setModeState(savedMode);
  }, []);

  const setMode = (nextMode: 'guest' | 'host') => {
    setModeState(nextMode);
    window.localStorage.setItem('bidrush-mode', nextMode);
  };

  // Check current session on mount via GET /api/v1/auth/me
  const checkSession = useCallback(async () => {
    try {
      const data = await api.get<{ user: AuthUser }>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Login: POST /api/v1/auth/login, sets user state
  const login = async (email: string, password: string): Promise<void> => {
    const data = await api.post<{ user: AuthUser }>('/auth/login', { email, password });
    setUser(data.user);
  };

  // Register: POST /api/v1/auth/register, returns success message
  const register = async (name: string, email: string, password: string, confirmPassword: string): Promise<string> => {
    const data = await api.post<{ user?: AuthUser; message?: string }>('/auth/register', {
      name,
      email,
      password,
      confirmPassword,
    });
    return (
      data?.message ||
      'Account created! Please check your email to verify your account.'
    );
  };

  // Logout: POST /api/v1/auth/logout, clears user
  const logout = async (): Promise<void> => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
    }
  };

  // Refresh auth session: POST /api/v1/auth/refresh
  const refreshAuth = async (): Promise<void> => {
    try {
      const data = await api.post<{ user: AuthUser }>('/auth/refresh', {});
      setUser(data.user);
    } catch {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isLoading: loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshAuth,
    refresh: refreshAuth,
    mode,
    setMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
