import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';


const targetUrl = process.env.VITE_API_URL_PUBLIC ? 
  (process.env.VITE_API_URL_PUBLIC.startsWith('http') ? process.env.VITE_API_URL_PUBLIC : `https://${process.env.VITE_API_URL_PUBLIC}`) 
  : 'http://localhost:3000';

const proxyConfig = {
  '/api': { target: targetUrl, changeOrigin: true },
  '/uploads': { target: targetUrl, changeOrigin: true },
  '/shutter-erp': { target: targetUrl, changeOrigin: true },
  '/socket.io': { target: targetUrl, ws: true, changeOrigin: true },
};

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5000000,
      },
      manifest: {
        name: 'Shutter Admin',
        short_name: 'Shutter Admin',
        description: 'Admin Dashboard',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  preview: { allowedHosts: true, proxy: proxyConfig },
  server: {
    port: 5173,
    proxy: proxyConfig
  }
});
