import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';

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
  ChevronDown,
  ChevronRight,
  Server
} from 'lucide-react';

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';

interface NavItem {
  id: string;
  path?: string;
  label: string;
  icon?: React.ReactNode;
  roles: Role[];
  children?: {
    path: string;
    label: string;
    roles: Role[];
  }[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', path: '/', label: '平台總覽', icon: <LayoutDashboard size={20} />, roles: ['SUPER_ADMIN'] },
  {
    id: 'tenants',
    label: '租戶管理',
    icon: <Server size={20} />,
    roles: ['SUPER_ADMIN'],
    children: [
      { path: '/tenants', label: '所有租戶', roles: ['SUPER_ADMIN'] },
      { path: '/tenants/new', label: '建立新租戶', roles: ['SUPER_ADMIN'] },
    ]
  }
];

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: 'bg-indigo-500/20 text-indigo-300',
  MANAGER: 'bg-blue-500/20 text-blue-300',
  STAFF: 'bg-gray-500/20 text-gray-300',
};

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'SaaS 超級管理員',
  MANAGER: '餐廳店長',
  STAFF: '餐廳員工',
};

export default function AdminLayout({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    operations: true,
  });

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredNav = user
    ? navItems
        .filter((item) => item.roles.includes(user.role))
        .map(item => {
          if (item.children) {
            return {
              ...item,
              children: item.children.filter(child => child.roles.includes(user.role))
            };
          }
          return item;
        })
        .filter(item => !item.children || item.children.length > 0)
    : [];

  // Removed restaurant-specific polling for SaaS platform

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isSuperAdmin = user && user.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Backdrop Overlay on mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-45 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[80vw] max-w-[320px] md:w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="px-6 py-4 border-b border-gray-700">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">夏特 SaaS 平台系統</h1>
          <p className="text-xs text-indigo-300 mt-1 uppercase tracking-wider font-medium">超級管理中心</p>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto select-none">
          {filteredNav.map(item => {
            const isGroup = !!item.children;
            const isExpanded = expandedItems[item.id];
            
            // Check if any child is active
            const isChildActive = isGroup && item.children!.some(child => location.pathname === child.path || location.pathname.startsWith(child.path + '/'));
            const isItemActive = !isGroup && item.path && (
              item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
            );

            return (
              <div key={item.id} className="mb-2">
                {isGroup ? (
                  <>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className={`w-full flex items-center justify-between px-6 py-3 text-sm transition-colors ${
                        isChildActive
                          ? 'text-primary-400 font-bold'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="mr-3">{item.icon}</span>
                        <span className="font-medium">{t(item.label) || item.label}</span>
                      </div>
                      <ChevronDown 
                        size={16} 
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {/* Collapsible Children */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="bg-gray-900/50 py-1">
                        {item.children!.map(child => {
                          const isChildActiveNode = location.pathname === child.path || location.pathname.startsWith(child.path + '/');
                          return (
                            <Link
                              key={child.path}
                              to={child.path}
                              onClick={() => setSidebarOpen(false)}
                              className={`flex items-center pl-14 pr-6 py-2 text-sm transition-colors ${
                                isChildActiveNode
                                  ? 'bg-gray-800 text-primary-400 border-r-2 border-primary-400 font-medium'
                                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                              }`}
                            >
                              {t(child.label) || child.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <Link
                    to={item.path!}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-6 py-3 text-sm transition-colors ${
                      isItemActive
                        ? 'bg-gray-800 text-primary-400 border-r-2 border-primary-400 font-bold'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    <span className="font-medium">{t(item.label) || item.label}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* User info at bottom of sidebar */}
        {user && (
          <div className="px-6 py-4 border-t border-gray-700">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[user.role]}`}>
              {ROLE_LABELS[user.role]}
            </span>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          {/* Hamburger menu button for mobile */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            {/* Settings gear */}
            {isSuperAdmin && (
              <Link
                to="/settings"
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Settings"
                aria-label="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            )}

            {/* Separator */}
            <div className="w-px h-6 bg-gray-200" />

            {/* User avatar + dropdown */}
            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="User menu"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 font-medium hidden sm:block">{user.name}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {isSuperAdmin && (
                      <Link
                        to="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        系統設定
                      </Link>
                    )}
                    {onLogout && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onLogout();
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50"
                      >
                        登出系統
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {isOffline && (
          <div className="bg-yellow-500 text-white px-4 py-2 text-sm font-bold flex items-center justify-center shadow-md z-40">
            ⚠️ 網路連線異常，已啟用本地幽靈模式，可繼續點餐與打卡。連線恢復後將自動同步。
          </div>
        )}

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
