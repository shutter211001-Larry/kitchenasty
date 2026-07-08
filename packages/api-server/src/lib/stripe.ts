import Stripe from 'stripe';
import prisma from './db.js';
import { tenantStorage } from '../middleware/tenantStorage.js';

const stripeCache = new Map<string, Stripe>();

export async function getStripe(): Promise<Stripe> {
  const store = tenantStorage.getStore();
  const tenantId = store?.tenantId || 'default';

  let secretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

  try {
    const settings = await prisma.siteSettings.findFirst();
    const payment = (settings?.paymentSettings as Record<string, any>) || {};
    if (payment.stripeSecretKey) {
      secretKey = payment.stripeSecretKey;
    }
  } catch {
    // DB unavailable — fall back to env var
  }

  const cacheKey = `${tenantId}:${secretKey}`;
  if (stripeCache.has(cacheKey)) {
    return stripeCache.get(cacheKey)!;
  }

  const stripeInstance = new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover' as any,
  });
  
  stripeCache.set(cacheKey, stripeInstance);

  return stripeInstance;
}

// Deprecated: Do not use default export in multi-tenant environment
export default new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-01-28.clover' as any,
});
