import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ['localhost', /^https:\/\/yourserver\.io\/api/],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

import './i18n/index.js';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { TenantProvider } from './context/TenantContext.js';
import { getDatabase } from './lib/db/database.js';

// 初始化本地資料庫
getDatabase().catch(console.error);

import { Provider } from 'react-redux';
import { store } from './store/index.js';
import AdminLayout from './components/AdminLayout.js';
import RequireRole from './components/RequireRole.js';
import Login from './pages/Login.js';
import ResetPassword from './pages/ResetPassword.js';
import Dashboard from './pages/Dashboard.js';
import LocationList from './pages/locations/LocationList.js';
import LocationForm from './pages/locations/LocationForm.js';
import CategoryList from './pages/menu/CategoryList.js';
import CategoryForm from './pages/menu/CategoryForm.js';
import MenuItemList from './pages/menu/MenuItemList.js';
import MenuItemForm from './pages/menu/MenuItemForm.js';
import AIMenuDetection from './pages/menu/AIMenuDetection.js';
import StockManagement from './pages/menu/StockManagement.tsx';
import BranchRequisitions from './pages/menu/BranchRequisitions.tsx';
import AllergenList from './pages/menu/AllergenList.js';
import DietaryPreferenceList from './pages/menu/DietaryPreferenceList.js';
import MealtimeList from './pages/menu/MealtimeList.js';
import TableList from './pages/operations/TableList.js';
import OrderList from './pages/operations/OrderList.js';
import BankReconciliation from './pages/operations/BankReconciliation.js';
import OrderCreate from './pages/operations/OrderCreate.js';
import OrderDetailPage from './pages/operations/OrderDetail.js';
import ReservationList from './pages/operations/ReservationList.js';
import ReservationDetail from './pages/operations/ReservationDetail.js';
import PromotionsHub from './pages/crm/PromotionsHub.js';
import CouponForm from './pages/crm/CouponForm.js';
import ReviewList from './pages/crm/ReviewList.js';
import KitchenDisplay from './pages/operations/KitchenDisplay.js';
import CounterDisplay from './pages/operations/CounterDisplay.js';
import AutomationRuleList from './pages/crm/AutomationRuleList.js';
import AutomationRuleForm from './pages/crm/AutomationRuleForm.js';
import MarketingDashboard from './pages/crm/MarketingDashboard.js';
import DeliveryZoneList from './pages/operations/DeliveryZoneList.js';
import CustomerLoyalty from './pages/crm/CustomerLoyalty.js';
import LegalPageList from './pages/design/LegalPageList.js';
import LegalPageForm from './pages/design/LegalPageForm.js';
import CookieCategoryList from './pages/design/CookieCategoryList.js';
import ConsentLog from './pages/design/ConsentLog.js';
import DesignLanding from './pages/design/DesignLanding.js';
import DesignBranding from './pages/design/DesignBranding.js';
import DesignTheme from './pages/design/DesignTheme.js';
import DesignTemplates from './pages/design/DesignTemplates.js';
import StaffList from './pages/hr/StaffList.js';
import StaffInvite from './pages/hr/StaffInvite.js';
import StaffEdit from './pages/hr/StaffEdit.js';
import AcceptInvite from './pages/hr/AcceptInvite.js';
import CustomerList from './pages/crm/CustomerList.js';
import Settings from './pages/settings/Settings.js';
import DeveloperMetrics from './pages/settings/DeveloperMetrics.js';
import AuditLog from './pages/settings/AuditLog.js';
import SettingsGeneral from './pages/settings/SettingsGeneral.js';
import SettingsOrder from './pages/settings/SettingsOrder.js';
import SettingsReservation from './pages/settings/SettingsReservation.js';
import SettingsMail from './pages/settings/SettingsMail.js';
import SettingsPayments from './pages/settings/SettingsPayments.js';
import SettingsReviews from './pages/settings/SettingsReviews.js';
import SettingsAdvanced from './pages/settings/SettingsAdvanced.js';
import SettingsPermissions from './pages/settings/SettingsPermissions.js';
import SettingsLine from './pages/settings/SettingsLine.js';
import SettingsGoogle from './pages/settings/SettingsGoogle.js';
import SettingsNotifications from './pages/settings/SettingsNotifications.js';
import SettingsInvoice from './pages/settings/SettingsInvoice.js';
import Attendance from './pages/hr/Attendance.js';
import AttendanceRecords from './pages/hr/AttendanceRecords.js';
import Leave from './pages/hr/Leave.js';
import AttendanceApprovals from './pages/hr/AttendanceApprovals.js';
import AttendanceQRGenerator from './pages/hr/AttendanceQRGenerator.js';
import PayrollManagement from './pages/hr/PayrollManagement.js';
import PayrollDetail from './pages/hr/PayrollDetail.js';
import JobRoleSettings from './pages/hr/JobRoleSettings.js';
import RosterManagement from './pages/hr/RosterManagement.js';
import Finance from './pages/operations/Finance.js';
import { ShiftRequirementsPage } from './pages/hr/ShiftRequirementsPage.js';
import ApproveIntegrations from './pages/settings/ApproveIntegrations.js';
import LocationLayout from './pages/locations/LocationLayout.js';

import './index.css';
import { ConfirmGlobal } from './components/ConfirmGlobal.tsx';
import { Toaster } from 'react-hot-toast';

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
        <Route path="/accept-invite" element={<AcceptInvite />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/approve-integrations" element={<Navigate to={`/?redirect=/approve-integrations${encodeURIComponent(window.location.search)}`} />} />
        <Route path="*" element={<Login onLogin={login} />} />
      </Routes>
    );
  }

  return (
    <AdminLayout onLogout={logout}>
      <Routes>
        {/* All roles */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/approve-integrations" element={<RequireRole roles={['SUPER_ADMIN']}><ApproveIntegrations /></RequireRole>} />
        <Route path="/orders" element={<OrderList />} />
        <Route path="/reconciliation" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><BankReconciliation /></RequireRole>} />
        <Route path="/orders/new" element={<OrderCreate />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/reservations" element={<ReservationList />} />
        <Route path="/reservations/:id" element={<ReservationDetail />} />
        <Route path="/reviews" element={<ReviewList />} />
        <Route path="/customers" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><CustomerList /></RequireRole>} />
        <Route path="/kitchen" element={<KitchenDisplay />} />
        <Route path="/counter" element={<CounterDisplay />} />

        {/* MANAGER+ */}
        <Route path="/locations" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><LocationList /></RequireRole>} />
        <Route path="/locations/new" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><LocationForm /></RequireRole>} />
        <Route path="/locations/:id/*" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><LocationLayout /></RequireRole>} />
        
        <Route path="/menu" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><Navigate to="/menu/items" replace /></RequireRole>} />
        <Route path="/menu/categories" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><CategoryList /></RequireRole>} />
        <Route path="/menu/categories/new" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><CategoryForm /></RequireRole>} />
        <Route path="/menu/categories/:id" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><CategoryForm /></RequireRole>} />
        <Route path="/menu/stock" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><StockManagement /></RequireRole>} />
        <Route path="/menu/requisitions" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><BranchRequisitions /></RequireRole>} />
        <Route path="/menu/items" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><MenuItemList /></RequireRole>} />
        <Route path="/menu/items/ai-detect" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><AIMenuDetection /></RequireRole>} />
        <Route path="/menu/items/new" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><MenuItemForm /></RequireRole>} />
        <Route path="/menu/items/:id" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><MenuItemForm /></RequireRole>} />
        <Route path="/menu/allergens" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><AllergenList /></RequireRole>} />
        <Route path="/menu/dietary" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DietaryPreferenceList /></RequireRole>} />
        <Route path="/menu/mealtimes" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><MealtimeList /></RequireRole>} />
        <Route path="/promotions/loyalty" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><CustomerLoyalty /></RequireRole>} />

        <Route path="/promotions" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><PromotionsHub /></RequireRole>} />
        <Route path="/promotions/marketing" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><MarketingDashboard /></RequireRole>} />
        <Route path="/promotions/coupons/new" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><CouponForm /></RequireRole>} />
        <Route path="/promotions/coupons/:id" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><CouponForm /></RequireRole>} />
        <Route path="/automation" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><AutomationRuleList /></RequireRole>} />
        <Route path="/automation/new" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><AutomationRuleForm /></RequireRole>} />
        <Route path="/automation/:id" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><AutomationRuleForm /></RequireRole>} />
        <Route path="/coupons" element={<Navigate to="/promotions" replace />} />
        <Route path="/loyalty" element={<Navigate to="/promotions" replace />} />
        <Route path="/design" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><Navigate to="/design/landing" replace /></RequireRole>} />
        <Route path="/design/landing" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DesignLanding /></RequireRole>} />
        <Route path="/design/branding" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DesignBranding /></RequireRole>} />
        <Route path="/design/theme" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DesignTheme /></RequireRole>} />
        <Route path="/design/templates" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DesignTemplates /></RequireRole>} />
        <Route path="/legal" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><Navigate to="/legal/pages" replace /></RequireRole>} />
        <Route path="/legal/pages" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><LegalPageList /></RequireRole>} />
        <Route path="/legal/pages/:slug" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><LegalPageForm /></RequireRole>} />
        <Route path="/legal/cookies" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><CookieCategoryList /></RequireRole>} />
        <Route path="/legal/consent" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><ConsentLog /></RequireRole>} />

        {/* Settings — MANAGER+ (sub-pages have their own role checks) */}
        <Route path="/settings" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><Settings /></RequireRole>} />
        <Route path="/settings/general" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><SettingsGeneral /></RequireRole>} />
        <Route path="/settings/order" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><SettingsOrder /></RequireRole>} />
        <Route path="/settings/reservation" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><SettingsReservation /></RequireRole>} />
        <Route path="/settings/mail" element={<RequireRole roles={['SUPER_ADMIN']}><SettingsMail /></RequireRole>} />
        <Route path="/settings/payment" element={<RequireRole roles={['SUPER_ADMIN']}><SettingsPayments /></RequireRole>} />
        <Route path="/settings/review" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><SettingsReviews /></RequireRole>} />
        <Route path="/settings/advanced" element={<RequireRole roles={['SUPER_ADMIN']}><SettingsAdvanced /></RequireRole>} />
        <Route path="/settings/permissions" element={<RequireRole roles={['SUPER_ADMIN']}><SettingsPermissions /></RequireRole>} />
        <Route path="/settings/line" element={<RequireRole roles={['SUPER_ADMIN']}><SettingsLine /></RequireRole>} />
        <Route path="/settings/google" element={<RequireRole roles={['SUPER_ADMIN']}><SettingsGoogle /></RequireRole>} />
        <Route path="/settings/invoice" element={<RequireRole roles={['SUPER_ADMIN']}><SettingsInvoice /></RequireRole>} />
        <Route path="/settings/notifications" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><SettingsNotifications /></RequireRole>} />


        {/* Developer — MANAGER+ for metrics, SUPER_ADMIN for audit */}
        <Route path="/developer" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><Navigate to="/developer/metrics" replace /></RequireRole>} />
        <Route path="/developer/metrics" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><DeveloperMetrics /></RequireRole>} />
        <Route path="/developer/audit-log" element={<RequireRole roles={['SUPER_ADMIN']}><AuditLog /></RequireRole>} />

        {/* SUPER_ADMIN only */}
        <Route path="/staff" element={<RequireRole roles={['SUPER_ADMIN']}><StaffList /></RequireRole>} />
        <Route path="/staff/invite" element={<RequireRole roles={['SUPER_ADMIN']}><StaffInvite /></RequireRole>} />
        <Route path="/staff/:id" element={<RequireRole roles={['SUPER_ADMIN']}><StaffEdit /></RequireRole>} />

        {/* Attendance */}
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/attendance/records" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><AttendanceRecords /></RequireRole>} />
        <Route path="/attendance/approvals" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><AttendanceApprovals /></RequireRole>} />
        <Route path="/attendance/qr-generator" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><AttendanceQRGenerator /></RequireRole>} />
        <Route path="/attendance/leave" element={<Leave />} />
        <Route path="/attendance/payroll" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><PayrollManagement /></RequireRole>} />
        <Route path="/payroll/:id" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><PayrollDetail /></RequireRole>} />
        <Route path="/attendance/job-roles" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><JobRoleSettings /></RequireRole>} />
        <Route path="/attendance/roster" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><RosterManagement /></RequireRole>} />
        <Route path="/attendance/requirements" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><ShiftRequirementsPage /></RequireRole>} />
        <Route path="/finance" element={<RequireRole roles={['SUPER_ADMIN', 'MANAGER']}><Finance /></RequireRole>} />
      </Routes>
    </AdminLayout>
  );
}

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <TenantProvider>
        <AuthProvider>
          <AppRoutes />
          <ConfirmGlobal />
          <Toaster position="top-center" />
        </AuthProvider>
      </TenantProvider>
    </BrowserRouter>
  );
}

const params = new URLSearchParams(window.location.search);
const overrideTenantId = params.get('set_tenant_id');
if (overrideTenantId) {
  localStorage.setItem('tenantId', overrideTenantId);
  window.location.href = window.location.pathname;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div className="p-8 text-center"><h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1><p>We have been notified and are working on a fix.</p></div>}>
      <Provider store={store}>
        <App />
      </Provider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
