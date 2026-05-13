import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../lib/api.js';
import { useTheme } from './ThemeContext.js';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  lineUserId?: string;
  lineDisplayName?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string; phone?: string }) => Promise<void>;
  loginWithToken: (token: string) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.setItem('explicit_logout', 'true');
  }, []);

  // Handle LIFF initialization and auto-login
  useEffect(() => {
    const liffId = settings.lineSettings?.liffId;
    const isExplicitLogout = localStorage.getItem('explicit_logout') === 'true';
    const hasToken = !!localStorage.getItem('token');

    if (!liffId || isExplicitLogout) {
      setIsLoading(false);
      return;
    }

    if (hasToken) {
      // Already has a session, no need to auto-login via LIFF
      return;
    }

    const initLiff = async () => {
      try {
        const liff = (window as any).liff;
        if (!liff) {
          setIsLoading(false);
          return;
        }

        await liff.init({ liffId });

        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          const userEmail = liff.getDecodedIDToken()?.email;

          const res = await fetch(`${API_BASE}/line/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lineUserId: profile.userId,
              lineDisplayName: profile.displayName,
              email: userEmail,
              name: profile.displayName
            }),
          });

          const data = await res.json();
          if (data.success) {
            localStorage.setItem('token', data.data.token);
            setToken(data.data.token);
            setUser(data.data.customer || data.data.user || data.data);
          }
        }
      } catch (err) {
        console.warn('Global LIFF init/login skipped:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initLiff();
  }, [settings.lineSettings?.liffId, token]);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Invalid token');
        return res.json();
      })
      .then((data) => setUser(data.data.customer || data.data.user || data.data))
      .catch(() => logout())
      .finally(() => setIsLoading(false));
  }, [token, logout]);

  async function login(email: string, password: string) {
    console.log('[Auth] Attempting login for:', email);
    try {
      const res = await fetch(`${API_BASE}/auth/customer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('[Auth] Login API failed:', data.error);
        throw new Error(data.error || 'Login failed');
      }
      
      console.log('[Auth] Login successful, storing token...');
      localStorage.setItem('token', data.data.token);
      localStorage.removeItem('explicit_logout');
      
      // Clear LIFF state to prevent cross-contamination if they were using LINE before
      localStorage.removeItem('liff:token'); 
      
      setToken(data.data.token);
      setUser(data.data.customer || data.data.user || data.data);
      console.log('[Auth] State updated');
    } catch (err) {
      console.error('[Auth] Login error:', err);
      throw err;
    }
  }

  function loginWithToken(newToken: string) {
    localStorage.setItem('token', newToken);
    localStorage.removeItem('explicit_logout');
    setToken(newToken);
  }

  async function register(input: { email: string; password: string; name: string; phone?: string }) {
    const res = await fetch(`${API_BASE}/auth/customer/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('token', data.data.token);
    localStorage.removeItem('explicit_logout');
    setToken(data.data.token);
    setUser(data.data.customer || data.data.user || data.data);
  }

  function updateUser(userData: Partial<User>) {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, loginWithToken, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
