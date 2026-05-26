import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Ingredients from './pages/Ingredients';
import Inventory from './pages/Inventory';
import Suppliers from './pages/Suppliers';
import Recipes from './pages/Recipes';
import Settings from './pages/Settings';
import Labels from './pages/Labels';
import Login from './pages/Login';
import Users from './pages/Users';
import Integration from './pages/Integration';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-black tracking-widest text-slate-400">安全防護連線中...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ingredients" element={<Ingredients />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/recipes" element={<Recipes />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/integration" element={<Integration />} />
        <Route path="/users" element={user.role === 'ADMIN' ? <Users /> : <Dashboard />} />
        <Route path="/labels" element={<Labels />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
