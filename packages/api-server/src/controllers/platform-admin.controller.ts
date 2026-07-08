import { Request, Response } from 'express';
import prisma from '../lib/db.js';
import logger from '../lib/logger.js';
import { Prisma } from '@prisma/client';

export const listTenants = async (req: Request, res: Response) => {
  try {
    const tenants = await (prisma as any).tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { users: true, locations: true, orders: true }
        }
      }
    });

    res.json({ success: true, data: tenants });
  } catch (error) {
    logger.error({ err: error }, 'Failed to list tenants');
    res.status(500).json({ success: false, error: 'Failed to list tenants' });
  }
};

export const createTenant = async (req: Request, res: Response) => {
  try {
    const { name, domain, adminEmail, adminName, adminPassword } = req.body;

    if (!name || !adminEmail || !adminPassword) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Hash password (we assume bcrypt is used elsewhere in auth controller)
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash(adminPassword, 10);

    const trimmedDomain = domain?.trim() || null;

    const newTenant = await (prisma as any).tenant.create({
      data: {
        name,
        domain: trimmedDomain,
        users: {
          create: {
            email: adminEmail,
            name: adminName || 'Admin',
            password: hashedPassword,
            role: 'MANAGER', // The boss of the tenant
          }
        },
        siteSettings: {
          create: {
            siteName: name,
            siteTitle: `${name} - Order Online`,
            colorPrimary: '#ea580c'
          }
        }
      }
    });

    res.status(201).json({ success: true, data: newTenant });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create tenant');
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta?.target as string[])?.join(', ') || 'field';
      res.status(409).json({ success: false, error: `${target === 'email' ? '信箱' : '網域'}已存在，請使用其他名稱 (${target})` });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create tenant' });
    }
  }
};

export const updateTenant = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, domain, isActive } = req.body;

    const tenant = await (prisma as any).tenant.update({
      where: { id },
      data: {
        name,
        domain,
        isActive
      }
    });

    res.json({ success: true, data: tenant });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update tenant');
    res.status(500).json({ success: false, error: 'Failed to update tenant' });
  }
};
