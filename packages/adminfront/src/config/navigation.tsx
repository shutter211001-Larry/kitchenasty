import React from 'react';
import { 
  LayoutDashboard, 
  Wallet, 
  Store, 
  ChefHat, 
  ClipboardList, 
  CalendarDays, 
  MenuSquare,
  Tags,
  MessageSquare,
  Users,
  UserCog,
  Clock,
  CheckSquare,
  CalendarCheck,
  Banknote,
  Briefcase,
  History,
  QrCode,
  MapPin,
  Settings,
  MonitorPlay,
  Palette,
  Paintbrush,
  LayoutTemplate,
  Scale,
  Cookie,
  FileCheck,
  Activity,
  ScrollText,
} from 'lucide-react';

export type Role = 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';

export interface NavItem {
  id: string;
  path?: string;
  label: string;
  icon?: React.ReactNode;
  roles: Role[];
  children?: {
    path: string;
    label: string;
    roles: Role[];
    isErp?: boolean;
  }[];
}

export const navItems: NavItem[] = [
  { id: 'dashboard', path: '/', label: 'nav.dashboard', icon: <LayoutDashboard size={20} />, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
  {
    id: 'store_management',
    label: 'adminLayout.f277f1',
    icon: <Store size={20} />,
    roles: ['SUPER_ADMIN', 'MANAGER'],
    children: [
      { path: '/locations', label: 'adminLayout.c35c40', roles: ['SUPER_ADMIN', 'MANAGER'] },
    ]
  },
  {
    id: 'menu_management',
    label: 'nav.menu',
    icon: <ChefHat size={20} />,
    roles: ['SUPER_ADMIN', 'MANAGER'],
    children: [
      { path: '/menu/categories', label: 'nav.categories', roles: ['SUPER_ADMIN', 'MANAGER'] },
      { path: '/menu/items', label: 'nav.menuItems', roles: ['SUPER_ADMIN', 'MANAGER'] },
      { path: '/menu/allergens', label: 'nav.allergens', roles: ['SUPER_ADMIN', 'MANAGER'] },
      { path: '/menu/dietary', label: 'nav.dietary', roles: ['SUPER_ADMIN', 'MANAGER'] },
      { path: '/menu/mealtimes', label: 'nav.mealtimes', roles: ['SUPER_ADMIN', 'MANAGER'] },
    ]
  },
  {
    id: 'operations',
    label: 'adminLayout.0168dd',
    icon: <Wallet size={20} />,
    roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'],
    children: [
      { path: '/kitchen', label: 'nav.kitchen', roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
      { path: '/orders', label: 'nav.orders', roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
      { path: '/reservations', label: 'nav.reservations', roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
      { path: '/finance', label: 'nav.finance', roles: ['SUPER_ADMIN', 'MANAGER'], isErp: true },
      { path: '/menu/stock', label: 'nav.stockOverview', roles: ['SUPER_ADMIN', 'MANAGER'], isErp: true },
      { path: '/menu/requisitions', label: 'adminLayout.a55fa0', roles: ['SUPER_ADMIN', 'MANAGER'], isErp: true },
    ]
  },
  {
    id: 'crm',
    label: 'adminLayout.d71865',
    icon: <Users size={20} />,
    roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'],
    children: [
      { path: '/customers', label: 'nav.customers', roles: ['SUPER_ADMIN', 'MANAGER'] },
      { path: '/promotions', label: 'nav.promotions', roles: ['SUPER_ADMIN', 'MANAGER'] },
      { path: '/reviews', label: 'nav.reviews', roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
    ]
  },
  {
    id: 'hr',
    label: 'adminLayout.ab8095',
    icon: <Briefcase size={20} />,
    roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'],
    children: [
      { path: '/staff', label: 'nav.staff', roles: ['SUPER_ADMIN'] },
      { path: '/attendance', label: 'nav.checkIn', roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
      { path: '/attendance/leave', label: 'attendance.leaveTitle', roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
      { path: '/attendance/approvals', label: 'adminLayout.66644a', roles: ['SUPER_ADMIN', 'MANAGER'] },
      { path: '/attendance/roster', label: 'adminLayout.bb4285', roles: ['SUPER_ADMIN', 'MANAGER'] },
      { path: '/attendance/payroll', label: 'adminLayout.66a770', roles: ['SUPER_ADMIN', 'MANAGER'] },
      { path: '/attendance/job-roles', label: 'adminLayout.5806c0', roles: ['SUPER_ADMIN', 'MANAGER'] },
      { path: '/attendance/records', label: 'nav.attendanceRecords', roles: ['SUPER_ADMIN', 'MANAGER'] },
      { path: '/attendance/qr-generator', label: 'adminLayout.d863f2', roles: ['SUPER_ADMIN', 'MANAGER'] },
    ]
  },
  {
    id: 'design',
    label: 'nav.design',
    icon: <Palette size={20} />,
    roles: ['SUPER_ADMIN'],
    children: [
      { path: '/design/landing', label: 'nav.landingPage', roles: ['SUPER_ADMIN'] },
      { path: '/design/branding', label: 'nav.branding', roles: ['SUPER_ADMIN'] },
      { path: '/design/theme', label: 'nav.theme', roles: ['SUPER_ADMIN'] },
      { path: '/design/templates', label: 'nav.templates', roles: ['SUPER_ADMIN'] },
    ]
  },
  {
    id: 'legal',
    label: 'nav.legal',
    icon: <Scale size={20} />,
    roles: ['SUPER_ADMIN'],
    children: [
      { path: '/legal/pages', label: 'nav.legalPages', roles: ['SUPER_ADMIN'] },
      { path: '/legal/cookies', label: 'nav.cookieCategories', roles: ['SUPER_ADMIN'] },
      { path: '/legal/consent', label: 'nav.consentLog', roles: ['SUPER_ADMIN'] },
    ]
  },
  {
    id: 'developer',
    label: 'nav.developer',
    icon: <Activity size={20} />,
    roles: ['SUPER_ADMIN'],
    children: [
      { path: '/developer/metrics', label: 'nav.apiMetrics', roles: ['SUPER_ADMIN'] },
      { path: '/developer/audit-log', label: 'nav.auditLog', roles: ['SUPER_ADMIN'] },
    ]
  },
  {
    id: 'system',
    label: 'adminLayout.af21b0',
    icon: <Settings size={20} />,
    roles: ['SUPER_ADMIN'],
    children: [
      { path: '/settings', label: 'nav.settings', roles: ['SUPER_ADMIN'] },
    ]
  }
];

export const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: 'bg-red-500/20 text-red-300',
  MANAGER: 'bg-blue-500/20 text-blue-300',
  STAFF: 'bg-gray-500/20 text-gray-300',
};

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};
