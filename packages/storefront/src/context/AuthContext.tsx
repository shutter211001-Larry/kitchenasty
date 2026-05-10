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
  const { settings, isInitialized: isThemeInitialized } = useTheme();
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
    // Wait for theme/settings to be loaded from server
    if (!isThemeInitialized) return;

    const liffId = settings.lineSettings?.liffId;
    const isExplicitLogout = localStorage.getItem('explicit_logout') === 'true';
    const hasToken = !!localStorage.getItem('token');
    const urlParams = new URLSearchParams(window.location.search);
    const hasLineCode = urlParams.has('code');

    console.log('[Auth] Global check:', { liffId, hasToken, hasLineCode });

    // If we have a token, we are already logged in
    if (hasToken) {
      return; 
    }

    // If no LIFF ID or user explicitly logged out, stop here
    if (!liffId || (isExplicitLogout && !hasLineCode)) {
      setIsLoading(false);
      return;
    }

    const initLiff = async () => {
      try {
        const liff = (window as any).liff;
        if (!liff) {
          console.error('[Auth] LIFF SDK not found on window');
          setIsLoading(false);
          return;
        }

        console.log('[Auth] Initializing LIFF with ID:', liffId);
        await liff.init({ liffId });
        
        if (liff.isLoggedIn()) {
          console.log('[Auth] LIFF is logged in, getting profile...');
          const profile = await liff.getProfile();
          const userEmail = liff.getDecodedIDToken()?.email;

          console.log('[Auth] Calling backend line/login...');
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
            console.log('[Auth] Backend login success!');
            localStorage.setItem('token', data.data.token);
            localStorage.removeItem('explicit_logout');
            setToken(data.data.token);
            setUser(data.data.customer || data.data.user || data.data);
          } else {
            console.error('[Auth] Backend login failed:', data.error);
          }
        } else {
          console.log('[Auth] LIFF not logged in');
          // If we're on a path that needs login or if we want to force it
          // we could call liff.login() here, but we wait for user for now
        }
      } catch (err) {
        console.warn('[Auth] Global LIFF init/login error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initLiff();
  }, [isThemeInitialized, settings.lineSettings?.liffId, token]);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

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
    const res = await fetch(`${API_BASE}/auth/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('token', data.data.token);
    localStorage.removeItem('explicit_logout');
    setToken(data.data.token);
    setUser(data.data.customer || data.data.user || data.data);
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
