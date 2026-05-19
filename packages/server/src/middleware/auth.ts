import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../lib/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export interface JwtPayload {
  id: string;
  email: string | null;
  type: 'staff' | 'customer';
  role?: Role;
}

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends JwtPayload {}
  }
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const token = authHeader.slice(7);
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function requireStaff(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.type !== 'staff') {
    res.status(403).json({ success: false, error: 'Staff access required' });
    return;
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.type !== 'staff' || !req.user.role || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requirePermission(action: string, fallbackRoles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || req.user.type !== 'staff' || !req.user.role) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    const { role } = req.user;

    // SUPER_ADMIN always has all permissions
    if (role === 'SUPER_ADMIN') {
      next();
      return;
    }

    try {
      const settings = await prisma.siteSettings.findUnique({
        where: { id: 'default' },
        select: { generalSettings: true }
      });

      const general = (settings?.generalSettings as any) || {};
      const permissions = general.permissions || {};
      const rolePerms = permissions[role] || {};

      // If specific permission is defined, use it
      if (rolePerms[action] === true) {
        next();
        return;
      }
      if (rolePerms[action] === false) {
        res.status(403).json({ success: false, error: 'Access denied by system settings' });
        return;
      }

      // Otherwise, fallback to the hardcoded role requirement
      if (fallbackRoles.includes(role)) {
        next();
        return;
      }

      res.status(403).json({ success: false, error: 'Insufficient permissions' });
    } catch (error) {
      console.error('Permission check error:', error);
      // Fail safe: use fallback roles if settings can't be read
      if (fallbackRoles.includes(role)) {
        next();
      } else {
        res.status(403).json({ success: false, error: 'Permission check failed' });
      }
    }
  };
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      req.user = verifyToken(token);
    } catch {
      // Token invalid, continue without auth
    }
  }
  next();
}
