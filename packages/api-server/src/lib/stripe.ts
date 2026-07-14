import Stripe from 'stripe';
import prisma from './db.js';
import { tenantStorage } from '../middleware/tenantStorage.js';

const stripeCache = new Map<string, Stripe>();

export async function getStripe(locationId?: string): Promise<Stripe> {
  const store = tenantStorage.getStore();
  const tenantId = store?.tenantId || 'default';

  let secretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

  const settings = await prisma.siteSettings.findFirst();
  let globalPayment = (settings?.paymentSettings as Record<string, any>) || {};
  if (globalPayment.stripeSecretKey) {
    secretKey = globalPayment.stripeSecretKey;
  }

  // Check Location explicitly
  if (locationId) {
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });

    if (location?.integrationSettings) {
      const ints = location.integrationSettings as any;
      if (ints.stripeMode === 'CUSTOM') {
        if (!ints.stripeSecretKey) {
          throw new Error('HARD_FAIL: 門市設定為獨立 Stripe 金流 (CUSTOM)，但缺乏 Stripe Secret Key，為了保護帳務正確性，已強制阻斷結帳。');
        }
        secretKey = ints.stripeSecretKey;
      } else if (ints.stripeMode === 'HEADQUARTERS') {
        // Explicitly using Headquarters, secretKey is already set to globalPayment
      }
    }
  }

  if (!secretKey) {
    throw new Error('Stripe Secret Key not configured');
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
