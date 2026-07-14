import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger.js';
import { tenantStorage } from './tenantStorage.js';
import prisma from '../lib/db.js';

// Cache to store domain -> tenantId mappings (TTL: 5 mins)
const domainCache = new Map<string, { tenantId: string; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  let tenantId = req.headers['x-tenant-id'] as string;

  if (!tenantId && req.query.tenantId) {
    tenantId = req.query.tenantId as string;
  }

  // Support webhook URLs with tenantId in the path, e.g., /webhook/12345
  if (!tenantId) {
    const match = req.path.match(/\/webhook\/([^\/\?]+)/);
    if (match) {
      tenantId = match[1];
    }
  }

  // Inject default tenant for integration tests
  if (!tenantId && process.env.NODE_ENV === 'test') {
    tenantId = 'tenant-1';
  }

  // SINGLE_TENANT_MODE: Automatically resolve to the first available tenant in the database
  if (process.env.SINGLE_TENANT_MODE === 'true') {
    // If we already cached the default tenant, use it immediately (avoid DB roundtrips)
    const cachedDefault = domainCache.get('__SINGLE_TENANT_DEFAULT__');
    if (cachedDefault && cachedDefault.expiresAt > Date.now()) {
      tenantId = cachedDefault.tenantId;
    } else {
      try {
        const firstTenant = await (prisma as any).tenant.findFirst();
        if (firstTenant) {
          tenantId = firstTenant.id;
          // Cache it for 5 minutes
          domainCache.set('__SINGLE_TENANT_DEFAULT__', { tenantId, expiresAt: Date.now() + CACHE_TTL });
        }
      } catch (err) {
        logger.error({ err }, 'Failed to resolve default tenant for SINGLE_TENANT_MODE');
      }
    }
  }

  let domain = req.headers['x-tenant-domain'] as string;

  // 智慧去頭機制 (Smart Subdomain Stripping): 
  // 讓 admin.yummy-steak.com, store.yummy-steak.com 都能精準對應到 yummy-steak.com
  if (domain) {
    domain = domain.replace(/^(admin|store|erp|www)\./i, '');
    // 支援 Option A 架構 (例如 demo.admin.shutterorder.pro -> demo.shutterorder.pro)
    domain = domain.replace(/\.admin\./i, '.');
    domain = domain.replace(/\.store\./i, '.');
  }

  if (!tenantId && domain) {
    // 1. Check Cache
    const cached = domainCache.get(domain);
    if (cached && cached.expiresAt > Date.now()) {
      tenantId = cached.tenantId;
    } else {
      // 2. Lookup DB
      try {
        const tenant = await (prisma as any).tenant.findUnique({
          where: { domain }
        });
        if (tenant) {
          tenantId = tenant.id;
          domainCache.set(domain, { tenantId, expiresAt: Date.now() + CACHE_TTL });
        }
      } catch (err) {
        logger.error({ err, domain }, 'Failed to resolve tenant by domain');
      }
    }
  }

  if (tenantId) {
    logger.debug({ tenantId, domain, path: req.path }, 'Tenant resolved from request');
  }

  (req as any).tenantId = tenantId || null;

  tenantStorage.run({ tenantId: tenantId || null }, () => {
    next();
  });
};

export const recoverTenantContext = (req: Request, res: Response, next: NextFunction) => {
  const tenantId = (req as any).tenantId || null;
  tenantStorage.run({ tenantId }, () => {
    next();
  });
};

export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  const store = tenantStorage.getStore();
  if (!store?.tenantId) {
    // Whitelist global paths that are allowed to run without a specific tenant
    if (
      req.path.startsWith('/api/platform-admin') || 
      req.path.startsWith('/api/auth') ||
      req.path.startsWith('/api/dashboard') ||
      req.path.startsWith('/api/health') ||
      req.path.startsWith('/api/docs') ||
      req.path.startsWith('/api/openapi.json') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/shutter-erp') ||
      req.path.startsWith('/api/settings')
    ) {
      return next();
    }
    res.status(400).json({ success: false, error: 'Tenant domain or ID is required' });
    return;
  }
  next();
};
