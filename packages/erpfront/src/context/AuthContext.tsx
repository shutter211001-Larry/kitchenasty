import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from '../lib/api';
import { useTranslation } from "react-i18next";
interface User {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "STAFF";
}
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => {
  const {
    t
  } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await api.get("/auth/me");
      setUser(response.data);
    } catch (error) {
      console.error("Auto login check failed, clearing token", error);
      localStorage.removeItem("token");
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
      const response = await api.post("/auth/login", {
        email,
        password
      });
      const {
        token,
        user
      } = response.data;
      localStorage.setItem("token", token);
      setUser(user);
    } catch (error) {
      console.error("Login error", error);
      throw error;
    }
  };
  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };
  return <AuthContext.Provider value={{
    user,
    loading,
    login,
    logout
  }}>
      {children}
    </AuthContext.Provider>;
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};