import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../lib/api.js';

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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(!!localStorage.getItem('token'));

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.setItem('explicit_logout', 'true');
  }, []);

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
