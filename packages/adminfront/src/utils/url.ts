import { RESOURCE_BASE } from '../lib/api.js';

export function getFullUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${RESOURCE_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
