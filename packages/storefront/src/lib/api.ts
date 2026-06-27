/// <reference types="vite/client" />
let rawApiUrl = import.meta.env.VITE_API_URL_PUBLIC || '';

if (!rawApiUrl && typeof window !== 'undefined') {
  // 動態白牌推導: 將 store 網域自動推導為 api 網域 (例如 store.domain.com -> api.domain.com)
  rawApiUrl = window.location.origin.replace(/(:\/\/)?store/, '$1api');
}

if (rawApiUrl && !rawApiUrl.startsWith('http')) {
  rawApiUrl = `https://${rawApiUrl}`;
}
export const API_URL = rawApiUrl.replace(/\/$/, '');
export const API_BASE = `${API_URL}/api`;
export const RESOURCE_BASE = API_URL;
