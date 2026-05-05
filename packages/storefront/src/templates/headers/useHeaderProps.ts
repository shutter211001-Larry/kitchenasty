import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext.js';
import { useCart } from '../../context/CartContext.js';
import { useTheme } from '../../context/ThemeContext.js';

export function useHeaderProps() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { itemCount, setIsOpen: openCart } = useCart();
  const { settings } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    (settings.navShowHome === true || settings.navShowHome === 'true') && { to: '/', label: t('nav.home') },
    (settings.navShowLocations === true || settings.navShowLocations === 'true') && { to: '/locations', label: t('nav.locations') },
    (settings.navShowMenu === true || settings.navShowMenu === 'true') && { to: '/menu', label: t('nav.menu') },
    (settings.navShowReservations === true || settings.navShowReservations === 'true') && { to: '/reservations', label: t('nav.reservations') },
  ].filter(Boolean) as { to: string; label: string }[];

  function isActive(path: string) {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }

  return { t, user, logout, itemCount, openCart, settings, navLinks, isActive, mobileOpen, setMobileOpen };
}
