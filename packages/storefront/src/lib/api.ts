/// <reference types="vite/client" />
export const API_URL = (import.meta.env.VITE_API_URL_PUBLIC || '').replace(/\/$/, '');
export const API_BASE = `${API_URL}/api`;
export const RESOURCE_BASE = API_URL;
