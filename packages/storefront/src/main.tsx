import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { CartProvider } from './context/CartContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import Layout from './components/Layout.js';
import Home from './pages/Home.js';
import Locations from './pages/Locations.js';
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import Account from './pages/Account.js';
import Menu from './pages/Menu.js';
import Checkout from './pages/Checkout.js';
import OrderConfirmation from './pages/OrderConfirmation.js';
import Reservations from './pages/Reservations.js';
import OrderHistory from './pages/OrderHistory.js';
import OrderStatus from './pages/OrderStatus.js';
import AuthCallback from './pages/AuthCallback.js';
import PrivacyPolicy from './pages/PrivacyPolicy.js';
import Impressum from './pages/Impressum.js';
import NotFound from './pages/NotFound.js';
import './i18n/index.js';
import './index.css';

import { Navigate } from 'react-router-dom';
import { useTheme } from './context/ThemeContext.js';

function ConditionalRoute({ 
  element, 
  condition 
}: { 
  element: React.ReactNode; 
  condition: (settings: any) => boolean 
}) {
  const { settings } = useTheme();
  return condition(settings) ? <>{element}</> : <Navigate to="/" replace />;
}

function BrandingGuard({ children }: { children: React.ReactNode }) {
  const { isInitialized } = useTheme();
  
  if (!isInitialized) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#f8fafc] dark:bg-[#0f172a] z-[9999]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <CartProvider>
        <BrandingGuard>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route 
                path="/locations" 
                element={<ConditionalRoute element={<Locations />} condition={(s) => s.navShowLocations !== false} />} 
              />
              <Route path="/menu" element={<Menu />} />
              <Route 
                path="/reservations" 
                element={<ConditionalRoute element={<Reservations />} condition={(s) => s.navShowReservations !== false} />} 
              />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order/:id" element={<OrderConfirmation />} />
              <Route 
                path="/login" 
                element={<ConditionalRoute element={<Login />} condition={(s) => s.showMembership !== false} />} 
              />
              <Route 
                path="/register" 
                element={<ConditionalRoute element={<Register />} condition={(s) => s.showMembership !== false} />} 
              />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route 
                path="/account" 
                element={<ConditionalRoute element={<Account />} condition={(s) => s.showMembership !== false} />} 
              />
              <Route 
                path="/account/orders" 
                element={<ConditionalRoute element={<OrderHistory />} condition={(s) => s.showMembership !== false} />} 
              />
              <Route path="/orders/:id" element={<OrderStatus />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/impressum" element={<Impressum />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrandingGuard>
        </CartProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
