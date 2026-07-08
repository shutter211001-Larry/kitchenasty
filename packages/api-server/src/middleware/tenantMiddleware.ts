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

  let domain = req.headers['x-tenant-domain'] as string;

  // 智慧去頭機制 (Smart Subdomain Stripping): 
  // 讓 admin.yummy-steak.com, store.yummy-steak.com 都能精準對應到 yummy-steak.com
  if (domain) {
    domain = domain.replace(/^(admin|store|erp|www)\./i, '');
  }

  if (!tenantId && domain) {
    // 1. Check Cache
    const cached = domainCache.get(domain);
    if (cached && cached.expiresAt > Date.now()) {
      tenantId = cached.tenantId;
    } else {
      // 2. Lookup DB
      try {
        const tenant = await prisma.tenant.findUnique({
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

  tenantStorage.run({ tenantId: tenantId || null }, () => {
    next();
  });
};
