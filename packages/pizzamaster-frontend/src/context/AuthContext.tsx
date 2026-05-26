import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'STAFF';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync Axios headers with token
  const setAuthHeader = (token: string | null) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('pizza_master_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setAuthHeader(token);
      const response = await axios.get('http://localhost:3000/api/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Auto login check failed, clearing token', error);
      localStorage.removeItem('pizza_master_token');
      setAuthHeader(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email,
        password
      });

      const { token, user: loggedUser } = response.data;
      localStorage.setItem('pizza_master_token', token);
      setAuthHeader(token);
      setUser(loggedUser);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || '登入失敗，請檢查電子郵件或密碼');
    }
  };

  const logout = () => {
    localStorage.removeItem('pizza_master_token');
    setAuthHeader(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
