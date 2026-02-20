import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  children?: { path: string; label: string }[];
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '□' },
  { path: '/locations', label: 'Locations', icon: '◎' },
  {
    path: '/menu',
    label: 'Menu',
    icon: '☰',
    children: [
      { path: '/menu/items', label: 'Items' },
      { path: '/menu/categories', label: 'Categories' },
    ],
  },
  { path: '/orders', label: 'Orders', icon: '📋' },
  { path: '/reservations', label: 'Reservations', icon: '🗓' },
  { path: '/coupons', label: 'Coupons', icon: '🏷' },
  { path: '/reviews', label: 'Reviews', icon: '⭐' },
  { path: '/kitchen', label: 'Kitchen', icon: '🍳' },
  { path: '/automation', label: 'Automation', icon: '⚡' },
  { path: '/loyalty', label: 'Loyalty', icon: '🎁' },
  {
    path: '/design',
    label: 'Design',
    icon: '🎨',
    children: [
      { path: '/design/landing', label: 'Landing Page' },
      { path: '/design/branding', label: 'Branding' },
      { path: '/design/theme', label: 'Theme' },
    ],
  },
  {
    path: '/legal',
    label: 'Legal',
    icon: '⚖',
    children: [
      { path: '/legal/pages', label: 'Pages' },
      { path: '/legal/cookies', label: 'Cookie Categories' },
      { path: '/legal/consent', label: 'Consent Log' },
    ],
  },
];

export default function AdminLayout({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="px-6 py-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-primary-400">KitchenAsty</h1>
          <p className="text-xs text-gray-400 mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            return (
              <div key={item.path}>
                <Link
                  to={item.children ? item.children[0].path : item.path}
                  className={`flex items-center px-6 py-3 text-sm transition-colors ${
                    isActive
                      ? 'bg-gray-800 text-primary-400 border-r-2 border-primary-400'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                </Link>
                {item.children && isActive && (
                  <div className="bg-gray-950">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`block pl-14 pr-6 py-2 text-xs transition-colors ${
                          location.pathname.startsWith(child.path)
                            ? 'text-primary-400'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Admin</span>
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
