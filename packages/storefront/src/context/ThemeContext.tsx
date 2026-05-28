import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE } from '../lib/api.js';
import { getFullUrl } from '../utils/url.js';

interface HeroSection {
  title?: string;
  subtitle?: string;
  ctaPrimaryText?: string;
  ctaPrimaryLink?: string;
  ctaSecondaryText?: string;
  ctaSecondaryLink?: string;
  backgroundImage?: string;
}

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface CtaSection {
  title?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
}

interface MenuSection {
  title?: string;
  description?: string;
  translations?: {
    title?: Record<string, string>;
    description?: Record<string, string>;
  };
}

export interface SiteSettings {
  id: string;
  siteName: string;
  siteTitle: string;
  favicon: string | null;
  logo: string | null;
  colorPrimary: string;
  colorSecondary: string;
  darkMode: 'light' | 'dark' | 'system';
  storefrontTemplate: string;
  heroSection: HeroSection | null;
  menuSection: MenuSection | null;
  featuresSection: FeatureItem[] | null;
  ctaSection: CtaSection | null;
  orderSettings?: {
    enabled?: boolean;
    deliveryEnabled?: boolean;
    pickupEnabled?: boolean;
    frozenDeliveryEnabled?: boolean;
    allowGuestCheckout?: boolean;
    minOrderDelivery?: number;
    minOrderPickup?: number;
    minOrderFrozen?: number;
    deliveryLeadTime?: number;
    pickupLeadTime?: number;
    frozenLeadTime?: number;
    frozenDeliveryFee?: number;
    enableFutureOrdering?: boolean;
    taxRate?: number;
    loyaltyEarnRate?: number;
    loyaltyRedeemRate?: number;
  };
  paymentSettings?: {
    cashEnabled?: boolean;
    stripeEnabled?: boolean;
    paypalEnabled?: boolean;
  };
  reservationSettings?: {
    enabled?: boolean;
  };
  navShowHome?: boolean;
  navShowLocations?: boolean;
  navShowMenu?: boolean;
  navShowReservations?: boolean;
  showMembership?: boolean;
  loyaltyProgramEnabled?: boolean;
  lineSettings?: {
    liffId?: string;
    officialAccountUrl?: string;
  };
  orderStatusMessage?: string;
  orderStatusMessageTranslations?: Record<string, string>;
}

interface ThemeContextType {
  settings: SiteSettings;
  isDark: boolean;
  isInitialized: boolean;
}

const defaultSettings: SiteSettings = {
  id: 'default',
  siteName: 'KitchenAsty',
  siteTitle: 'KitchenAsty - Order Online',
  favicon: null,
  logo: null,
  colorPrimary: '#ea580c',
  colorSecondary: '#9333ea',
  darkMode: 'light',
  storefrontTemplate: 'classic',
  heroSection: null,
  menuSection: null,
  featuresSection: null,
  ctaSection: null,
};

const ThemeContext = createContext<ThemeContextType>({
  settings: defaultSettings,
  isDark: false,
  isInitialized: false,
});

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generatePalette(hex: string): Record<string, string> {
  const [h, s] = hexToHsl(hex);
  const shades: Record<string, number> = {
    '50': 96, '100': 90, '200': 80, '300': 70, '400': 60,
    '500': 50, '600': 40, '700': 33, '800': 26, '900': 20, '950': 12,
  };
  const result: Record<string, string> = {};
  for (const [key, lightness] of Object.entries(shades)) {
    result[key] = hslToHex(h, s, lightness);
  }
  return result;
}

function applyColorVars(prefix: string, hex: string) {
  const palette = generatePalette(hex);
  const root = document.documentElement;
  for (const [shade, color] of Object.entries(palette)) {
    root.style.setProperty(`--color-${prefix}-${shade}`, color);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(() => !!localStorage.getItem('site_settings'));
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const cached = localStorage.getItem('site_settings');
    if (cached) {
      try {
        return { ...defaultSettings, ...JSON.parse(cached) };
      } catch (e) {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const data = json.data;
          if (data.logo) data.logo = getFullUrl(data.logo);
          if (data.favicon) data.favicon = getFullUrl(data.favicon);
          if (data.heroSection?.backgroundImage) {
            data.heroSection.backgroundImage = getFullUrl(data.heroSection.backgroundImage);
          }
          const finalSettings = { ...defaultSettings, ...data };
          setSettings(finalSettings);
          localStorage.setItem('site_settings', JSON.stringify(finalSettings));
          setIsInitialized(true);
        }
      })
      .catch(() => {
        setIsInitialized(true);
      });
  }, []);

  useEffect(() => {
    applyColorVars('primary', settings.colorPrimary);
    applyColorVars('secondary', settings.colorSecondary);
  }, [settings.colorPrimary, settings.colorSecondary]);

  useEffect(() => {
    const { darkMode } = settings;
    let dark = false;
    if (darkMode === 'dark') dark = true;
    else if (darkMode === 'system') dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(dark);
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings.darkMode]);

  useEffect(() => {
    document.title = settings.siteTitle;
  }, [settings.siteTitle]);

  useEffect(() => {
    if (settings.favicon) {
      let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.favicon;
    }
  }, [settings.favicon]);

  const [isHeroLoaded, setIsHeroLoaded] = useState(false);

  // Preload Hero Image
  useEffect(() => {
    const bgImage = settings.heroSection?.backgroundImage || '/images/default-hero.png';
    if (!bgImage) {
      setIsHeroLoaded(true);
      return;
    }

    const img = new Image();
    img.src = bgImage;
    img.onload = () => setIsHeroLoaded(true);
    img.onerror = () => setIsHeroLoaded(true); // Don't block the app if image fails
  }, [settings.heroSection?.backgroundImage]);

  return (
    <ThemeContext.Provider value={{ settings, isDark, isInitialized: isInitialized && isHeroLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
