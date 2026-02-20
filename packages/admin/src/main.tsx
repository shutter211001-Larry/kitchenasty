import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout.js';
import Login from './pages/Login.js';
import Dashboard from './pages/Dashboard.js';
import LocationList from './pages/LocationList.js';
import LocationForm from './pages/LocationForm.js';
import CategoryList from './pages/CategoryList.js';
import CategoryForm from './pages/CategoryForm.js';
import MenuItemList from './pages/MenuItemList.js';
import MenuItemForm from './pages/MenuItemForm.js';
import TableList from './pages/TableList.js';
import OrderList from './pages/OrderList.js';
import OrderDetailPage from './pages/OrderDetail.js';
import ReservationList from './pages/ReservationList.js';
import ReservationDetail from './pages/ReservationDetail.js';
import CouponList from './pages/CouponList.js';
import CouponForm from './pages/CouponForm.js';
import ReviewList from './pages/ReviewList.js';
import KitchenDisplay from './pages/KitchenDisplay.js';
import AutomationRuleList from './pages/AutomationRuleList.js';
import AutomationRuleForm from './pages/AutomationRuleForm.js';
import DeliveryZoneList from './pages/DeliveryZoneList.js';
import CustomerLoyalty from './pages/CustomerLoyalty.js';
import LegalPageList from './pages/LegalPageList.js';
import LegalPageForm from './pages/LegalPageForm.js';
import CookieCategoryList from './pages/CookieCategoryList.js';
import ConsentLog from './pages/ConsentLog.js';
import DesignLanding from './pages/DesignLanding.js';
import DesignBranding from './pages/DesignBranding.js';
import DesignTheme from './pages/DesignTheme.js';
import './index.css';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');

  function handleLogin(newToken: string) {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    setToken('');
  }

  if (!token) {
    return (
      <BrowserRouter>
        <Login onLogin={handleLogin} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <AdminLayout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/locations" element={<LocationList />} />
          <Route path="/locations/new" element={<LocationForm />} />
          <Route path="/locations/:id" element={<LocationForm />} />
          <Route path="/locations/:locationId/tables" element={<TableList />} />
          <Route path="/menu" element={<Navigate to="/menu/items" replace />} />
          <Route path="/menu/categories" element={<CategoryList />} />
          <Route path="/menu/categories/new" element={<CategoryForm />} />
          <Route path="/menu/categories/:id" element={<CategoryForm />} />
          <Route path="/menu/items" element={<MenuItemList />} />
          <Route path="/menu/items/new" element={<MenuItemForm />} />
          <Route path="/menu/items/:id" element={<MenuItemForm />} />
          <Route path="/orders" element={<OrderList />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/reservations" element={<ReservationList />} />
          <Route path="/reservations/:id" element={<ReservationDetail />} />
          <Route path="/coupons" element={<CouponList />} />
          <Route path="/coupons/new" element={<CouponForm />} />
          <Route path="/coupons/:id" element={<CouponForm />} />
          <Route path="/reviews" element={<ReviewList />} />
          <Route path="/kitchen" element={<KitchenDisplay />} />
          <Route path="/automation" element={<AutomationRuleList />} />
          <Route path="/automation/new" element={<AutomationRuleForm />} />
          <Route path="/automation/:id" element={<AutomationRuleForm />} />
          <Route path="/locations/:locationId/delivery-zones" element={<DeliveryZoneList />} />
          <Route path="/loyalty" element={<CustomerLoyalty />} />
          <Route path="/legal" element={<Navigate to="/legal/pages" replace />} />
          <Route path="/legal/pages" element={<LegalPageList />} />
          <Route path="/legal/pages/:slug" element={<LegalPageForm />} />
          <Route path="/legal/cookies" element={<CookieCategoryList />} />
          <Route path="/legal/consent" element={<ConsentLog />} />
          <Route path="/design" element={<Navigate to="/design/landing" replace />} />
          <Route path="/design/landing" element={<DesignLanding />} />
          <Route path="/design/branding" element={<DesignBranding />} />
          <Route path="/design/theme" element={<DesignTheme />} />
        </Routes>
      </AdminLayout>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
