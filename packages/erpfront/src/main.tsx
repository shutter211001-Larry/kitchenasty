import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import "./i18n";
import "./index.css";
import App from "./App.tsx";

// Global Axios Interceptor to dynamically redirect all local API calls to the production backend URL
axios.interceptors.request.use((config) => {
  let backendUrl = import.meta.env.VITE_API_URL_PUBLIC || "";
  if (!backendUrl && typeof window !== "undefined") {
    // 白牌化動態推導: erp.xxx.com -> api.xxx.com
    backendUrl = window.location.origin.replace(/(:\/\/)?erp/, "$1api");
  }

  if (backendUrl && !backendUrl.startsWith("http")) {
    backendUrl = `https://${backendUrl}`;
  }
  if (config.url && config.url.startsWith("http://localhost:3000")) {
    if (backendUrl) {
      // ERP API is mounted at /shutter-erp on the backend
      const erpBaseUrl = backendUrl.replace(/\/$/, "") + "/shutter-erp";
      config.url = config.url.replace("http://localhost:3000", erpBaseUrl);
    } else if (import.meta.env.PROD) {
      // In same-domain production, replace http://localhost:3000 with relative shutter-erp prefix path!
      config.url = config.url.replace("http://localhost:3000", "/shutter-erp");
    } else {
      // Local development! Map to the local backend's shutter-erp mounted router
      config.url = config.url.replace(
        "http://localhost:3000",
        "http://localhost:3000/shutter-erp",
      );
    }
  }
  return config;
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
