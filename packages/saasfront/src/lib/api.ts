/// <reference types="vite/client" />
let rawApiUrl = import.meta.env.VITE_API_URL_PUBLIC || '';
if (rawApiUrl && !rawApiUrl.startsWith('http')) {
  rawApiUrl = `https://${rawApiUrl}`;
}
export const API_URL = rawApiUrl.replace(/\/$/, '').replace(/\/api$/, '');
export const API_BASE = `${API_URL}/api`;
export const RESOURCE_BASE = API_URL;

const getTenantId = () => {
  const saved = localStorage.getItem('tenantId');
  if (saved) return saved;
  // SaaS Platform does not belong to a tenant, never infer from subdomain
  return '';
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const tenantId = getTenantId();
  const domain = window.location.hostname;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
    'x-tenant-domain': domain,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  const data = await res.json();

  if (!res.ok) {
    const error = data.error || `Request failed: ${res.status}`;
    const errorMsg = typeof error === 'string' ? error : JSON.stringify(error);
    const err = new Error(errorMsg);
    (err as any).data = error; // Attach original error data
    throw err;
  }

  return data;
}

function withIdempotency(body: unknown) {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return { ...body, idempotencyKey: crypto.randomUUID() };
  }
  return body;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(withIdempotency(body)) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(withIdempotency(body)) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(withIdempotency(body)) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
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
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Upload failed: ${res.status}`);
    return data;
  },
};
