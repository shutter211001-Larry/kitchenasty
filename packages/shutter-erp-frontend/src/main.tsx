import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.tsx'

// Global Axios Interceptor to dynamically redirect all local API calls to the production backend URL
axios.interceptors.request.use((config) => {
  const backendUrl = import.meta.env.VITE_API_URL_PUBLIC || '';
  if (config.url && config.url.startsWith('http://localhost:3000')) {
    if (backendUrl) {
      config.url = config.url.replace('http://localhost:3000', backendUrl);
    } else if (import.meta.env.PROD) {
      // In same-domain production, replace http://localhost:3000 with relative shutter-erp prefix path!
      config.url = config.url.replace('http://localhost:3000', '/shutter-erp');
    } else {
      // Local development! Map to the local backend's shutter-erp mounted router
      config.url = config.url.replace('http://localhost:3000', 'http://localhost:3000/shutter-erp');
    }
  }
  return config;
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
