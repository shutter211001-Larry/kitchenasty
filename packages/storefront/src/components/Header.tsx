import { Suspense, useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import { useCart } from '../context/CartContext.js';
import { useTheme } from '../context/ThemeContext.js';
import LanguageSwitcher from './LanguageSwitcher.js';
import { headerVariants } from '../templates/headers/index.js';
import type { TemplateId } from '../templates/index.js';
import { useRecentOrders } from '../hooks/useRecentOrders.js';

function ClassicHeader() {
  const { t } = useTranslation();
  const { user, logout, isLoading } = useAuth();
  const { itemCount, setIsOpen: openCart } = useCart();
  const { settings } = useTheme();
  const { recentOrders } = useRecentOrders();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Close mobile menu on scroll or click outside
  useEffect(() => {
    if (!mobileOpen) return;

    const handleScroll = () => {
      setMobileOpen(false);
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileOpen]);

  const navLinks = [
    settings.navShowHome && { to: '/', label: t('nav.home') },
    settings.navShowLocations && { to: '/locations', label: t('nav.locations') },
    settings.navShowMenu && { to: '/menu', label: t('nav.menu') },
    settings.navShowReservations && settings.reservationSettings?.enabled && { to: '/reservations', label: t('nav.reservations') },
  ].filter(Boolean) as { to: string; label: string }[];

  function isActive(path: string) {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  return (
    <header ref={headerRef} className="surface-card shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            {settings.logo ? (
              <img src={settings.logo} alt={settings.siteName} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">{settings.siteName.charAt(0)}</span>
              </div>
            )}
            <span className="text-xl font-bold text-main">{settings.siteName}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-sub hover:text-main hover:bg-surface'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth + cart + language */}
          <div className="hidden md:flex items-center gap-3">

            {!user && recentOrders.length > 0 && (
              <Link
                to={`/orders/${recentOrders[0].id}`}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded-md flex items-center gap-1"
                title={t('autoGen.store.key3')}
              >
                <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-xs font-bold hidden lg:inline">{t('nav.trackOrder')}</span>
              </Link>
            )}

            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                onClick={() => openCart(true)}
                className="relative p-2 text-sub hover:text-main hover:bg-surface rounded-md"
                aria-label={t('nav.openCart')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 cart-badge text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </button>
            </div>
            {settings.showMembership && (
              isLoading ? (
                <div className="w-5 h-5 border-2 border-input border-t-primary-600 rounded-full animate-spin" />
              ) : user ? (
                <>
                  <Link
                    to="/account"
                    className="text-sm text-sub hover:text-main"
                  >
                    {user.name}
                  </Link>
                  <button
                    onClick={logout}
                    className="text-sm text-hint hover:text-sub"
                  >
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm text-sub hover:text-main"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {t('nav.signUp')}
                  </Link>
                </>
              )
            )}
          </div>

          {/* Mobile cart + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <LanguageSwitcher />
            <button
              onClick={() => openCart(true)}
              className="relative p-2 text-sub hover:text-main hover:bg-surface rounded-md"
              aria-label={t('nav.openCart')}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 cart-badge text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>
          <button
            className="p-2 rounded-md text-sub hover:text-main hover:bg-surface"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t('nav.toggleMenu')}
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-input surface-card">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(link.to)
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-sub hover:text-main hover:bg-surface'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {!user && recentOrders.length > 0 && (
              <div className="px-3 py-2 border-t border-gray-100 mt-2">
                <Link
                  to={`/orders/${recentOrders[0].id}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 text-primary-600 font-medium py-2"
                >
                  <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {t('nav.trackRecentOrder')}
                </Link>
              </div>
            )}
            {settings.showMembership && (
              <div className="border-t border-gray-200 pt-3 mt-3">
                {isLoading ? (
                  <div className="px-3 py-2 text-sm text-gray-500">{t('autoGen.store.key4')}</div>
                ) : user ? (
                  <>
                    <Link
                      to="/account"
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-sub hover:text-main"
                    >
                      {t('nav.myAccount')}
                    </Link>
                    <button
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="block w-full text-left px-3 py-2 text-base font-medium text-hint hover:text-sub"
                    >
                      {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-sub hover:text-main"
                    >
                      {t('nav.login')}
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-primary-600 hover:text-primary-700"
                    >
                      {t('nav.signUp')}
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default function Header() {
  const { settings } = useTheme();
  const templateId = (settings.storefrontTemplate || 'classic') as TemplateId;
  const VariantHeader = headerVariants[templateId];

  if (VariantHeader) {
    return (
      <Suspense fallback={<div className="h-16 surface-card" />}>
        <VariantHeader />
      </Suspense>
    );
  }

  return <ClassicHeader />;
}
