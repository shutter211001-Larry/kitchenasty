import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n/index.js';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';

import AdminLayout from './components/AdminLayout.js';
import RequireRole from './components/RequireRole.js';
import Login from './pages/Login.js';
import ResetPassword from './pages/ResetPassword.js';
import Dashboard from './pages/Dashboard.js';
import TenantList from './pages/TenantList.tsx';
import TenantCreate from './pages/TenantCreate.tsx';
import TenantIntegrations from './pages/TenantIntegrations.tsx';

import './index.css';

function AppRoutes() {
  const { token, user, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || !user) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Login onLogin={login} />} />
      </Routes>
    );
  }

  return (
    <AdminLayout onLogout={logout}>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Tenants */}
        <Route path="/tenants" element={<TenantList />} />
        <Route path="/tenants/new" element={<TenantCreate />} />
        <Route path="/tenants/:id/integrations" element={<TenantIntegrations />} />
        
      </Routes>
    </AdminLayout>
  );
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
