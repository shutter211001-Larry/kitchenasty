import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../lib/db.js';
import logger from '../lib/logger.js';

/**
 * Middleware to check if the current IP is blacklisted.
 */
export async function checkIPBlacklist(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress;
  if (!ip) return next();

  try {
    const blocked = await prisma.iPBlacklist.findUnique({
      where: { ip }
    });

    if (blocked) {
      logger.warn({ ip, reason: blocked.reason }, 'Blocked IP attempted access');
      return res.status(403).json({
        success: false,
        error: 'Access denied. Your IP has been blacklisted due to suspicious activity.'
      });
    }
    next();
  } catch (error) {
    logger.error({ error, ip }, 'Error checking IP blacklist');
    next();
  }
}

/**
 * Middleware to check if the current customer is blacklisted.
 */
export async function checkCustomerBlacklist(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.type !== 'customer') return next();

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: user.id },
      select: { isBlacklisted: true }
    });

    if (customer?.isBlacklisted) {
      logger.warn({ customerId: user.id }, 'Blacklisted customer attempted access');
      return res.status(403).json({
        success: false,
        error: 'Your account has been restricted from performing this action.'
      });
    }
    next();
  } catch (error) {
    logger.error({ error, customerId: user.id }, 'Error checking customer blacklist');
    next();
  }
}

/**
 * Rate limiter specifically for order creation.
 * Supports whitelisting for trusted members.
 */
export const orderRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // Max 10 orders per hour per IP/User
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many orders placed recently. Please wait an hour before trying again.'
  },
  skip: async (req: Request) => {
    const user = (req as any).user;
    if (!user || user.type !== 'customer') return false;

    try {
      const customer = await prisma.customer.findUnique({
        where: { id: user.id },
        select: { isWhitelisted: true }
      });
      return !!customer?.isWhitelisted;
    } catch (error) {
      return false;
    }
  },
  keyGenerator: (req: Request) => {
    // Use user ID if logged in, otherwise use IP
    const user = (req as any).user;
    return (user?.id) || req.ip || 'anonymous';
  }
});
