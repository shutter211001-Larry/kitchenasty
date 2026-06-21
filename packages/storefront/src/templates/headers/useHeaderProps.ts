import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext.js';
import { useCart } from '../../context/CartContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { useRecentOrders } from '../../hooks/useRecentOrders.js';
// from '../../context/ThemeContext.js';

export function useHeaderProps() {
  const { t } = useTranslation();
  const { user, logout, isLoading } = useAuth();
  const { itemCount, setIsOpen: openCart } = useCart();
  const { settings } = useTheme();
  const { recentOrders } = useRecentOrders();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

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

  // Auto-close mobile menu on scroll
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

  return { t, user, logout, isLoading, itemCount, openCart, settings, navLinks, isActive, mobileOpen, setMobileOpen, headerRef, recentOrders };
}
