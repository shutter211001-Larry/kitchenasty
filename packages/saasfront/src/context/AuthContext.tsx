import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';
  phone?: string | null;
  avatar?: string | null;
  lineUserId?: string | null;
  lineDisplayName?: string | null;
  locationId?: string | null;
  preferredLanguage?: string | null;
  tenantId?: string | null;
}

interface AuthContextValue {
  token: string;
  user: User | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api.get<any>('/auth/me')
      .then((data) => {
        if (!cancelled) {
          const fetchedUser = data.data.user;
          // ENFORCE: Only Global SUPER_ADMINs can access saasfront
          if (fetchedUser.role !== 'SUPER_ADMIN' || (fetchedUser.tenantId !== null && fetchedUser.tenantId !== undefined)) {
            throw new Error('SaaS Platform Admin access required');
          }
          setUser(fetchedUser);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          // Token invalid — clear it
          localStorage.removeItem('token');
          setToken('');
          setUser(null);
          // Show alert to explain why they were kicked out
          alert("登入失敗：" + (error.message || "您使用的是一般餐廳帳號，SaaS 總部需要專屬的最高管理員帳號！"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  function login(newToken: string) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  }

  function logout() {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  }

  async function refreshUser() {
    if (!token) return;
    try {
      const data = await api.get<any>('/auth/me');
        const fetchedUser = data.data.user;
        if (fetchedUser.role !== 'SUPER_ADMIN' || (fetchedUser.tenantId !== null && fetchedUser.tenantId !== undefined)) {
          throw new Error('SaaS Platform Admin access required');
        }
        setUser(fetchedUser);
    } catch (error) {
      console.error('Failed to refresh user', error);
    }
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
