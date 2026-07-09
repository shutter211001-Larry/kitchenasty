import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/

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
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Shutter ERP',
        short_name: 'Shutter ERP',
        description: 'ERP System',
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
})
