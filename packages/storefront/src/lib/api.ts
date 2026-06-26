/// <reference types="vite/client" />
let rawApiUrl = import.meta.env.VITE_API_URL_PUBLIC || '';
if (rawApiUrl && !rawApiUrl.startsWith('http')) {
  rawApiUrl = `https://${rawApiUrl}`;
}
export const API_URL = rawApiUrl.replace(/\/$/, '');
export const API_BASE = `${API_URL}/api`;
export const RESOURCE_BASE = API_URL;
