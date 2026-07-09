/// <reference types="vite/client" />
let rawApiUrl = import.meta.env.VITE_API_URL_PUBLIC || '';
if (rawApiUrl && !rawApiUrl.startsWith('http')) {
  rawApiUrl = `https://${rawApiUrl}`;
}
export const API_URL = rawApiUrl.replace(/\/$/, '');
export const API_BASE = `${API_URL}/api`;
export const RESOURCE_BASE = API_URL;

const getTenantId = () => {
  const saved = localStorage.getItem('tenantId');
  if (saved) return saved;
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const parts = hostname.split('.');
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'admin') {
      return parts[0];
    }
  }
  return '';
};

async function request<T = any>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const tenantId = getTenantId();
  const domain = window.location.hostname;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
    'x-tenant-domain': domain,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const fullPath = path.startsWith('/') ? path : `/${path}`;
  const res = await fetch(`${API_BASE}${fullPath}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  
  if (!res.ok) {
    throw new Error(data.error || data.message || 'API request failed');
  }
  
  return data;
}

function prepareBody(body: unknown) {
  if (body === undefined || body === null) return undefined;
  let parsed = body;
  if (typeof body === 'string') {
    try { parsed = JSON.parse(body); } catch { return body; } // If it's a plain string, just return it
  }
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    parsed = { ...parsed, idempotencyKey: crypto.randomUUID() };
  }
  return JSON.stringify(parsed);
}

export const api = {
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: prepareBody(body) }),
  patch: <T = any>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: prepareBody(body) }),
  put: <T = any>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: prepareBody(body) }),
  delete: <T = any>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
  upload: async <T = any>(path: string, formData: FormData): Promise<T> => {
    const token = localStorage.getItem('token');
    const tenantId = getTenantId();
    const domain = window.location.hostname;
    const headers: Record<string, string> = {};
    if (tenantId) headers['x-tenant-id'] = tenantId;
    headers['x-tenant-domain'] = domain;
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Upload failed');
    }
    
    return data;
  },
};
