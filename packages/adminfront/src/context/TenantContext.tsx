import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

interface TenantSettings {
  siteName: string;
  logo: string | null;
  colorPrimary: string;
}

interface TenantContextType {
  settings: TenantSettings | null;
  loading: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  return [num >> 16, (num >> 8) & 255, num & 255];
}

function mixRgb(color: [number, number, number], mixColor: [number, number, number], weight: number): [number, number, number] {
  return [
    Math.round(color[0] * (1 - weight) + mixColor[0] * weight),
    Math.round(color[1] * (1 - weight) + mixColor[1] * weight),
    Math.round(color[2] * (1 - weight) + mixColor[2] * weight),
  ];
}

function generatePalette(hex: string) {
  const base = hexToRgb(hex);
  const white: [number, number, number] = [255, 255, 255];
  const black: [number, number, number] = [0, 0, 0];
  return {
    50: mixRgb(base, white, 0.9).join(' '),
    100: mixRgb(base, white, 0.8).join(' '),
    200: mixRgb(base, white, 0.6).join(' '),
    300: mixRgb(base, white, 0.4).join(' '),
    400: mixRgb(base, white, 0.2).join(' '),
    500: base.join(' '),
    600: mixRgb(base, black, 0.2).join(' '),
    700: mixRgb(base, black, 0.4).join(' '),
    800: mixRgb(base, black, 0.6).join(' '),
    900: mixRgb(base, black, 0.8).join(' '),
    950: mixRgb(base, black, 0.9).join(' '),
  };
}

const TenantContext = createContext<TenantContextType>({ settings: null, loading: true });

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real SaaS, this would call an unauthenticated public endpoint to get branding based on the current domain/tenantId
    const fetchSettings = async () => {
      try {
        // We assume /api/settings/public exists
        const res = await api.get<{ data: TenantSettings }>('/settings/public');
        setSettings(res.data);
        
        // Inject CSS variables
        if (res.data.colorPrimary) {
          const palette = generatePalette(res.data.colorPrimary);
          Object.entries(palette).forEach(([shade, rgb]) => {
            document.documentElement.style.setProperty(`--color-primary-${shade}`, rgb);
          });
        }
      } catch (err) {
        console.error('Failed to load tenant settings', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return (
    <TenantContext.Provider value={{ settings, loading }}>
      {children}
    </TenantContext.Provider>
  );
};
