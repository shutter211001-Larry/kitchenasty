import { describe, it, expect, vi } from 'vitest';
import { Coupon, CouponType, OrderType } from '@prisma/client';
import { validateAndCalculateDiscount, findAndApplyBestAutomaticDiscount } from '../../lib/discount-engine.js';

// Mock the db file to prevent actual Postgres connections
vi.mock('../../lib/db.js', () => {
  const mockPrisma = {
    coupon: {
      findMany: vi.fn(),
    },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

import prisma from '../../lib/db.js';
const mockedPrisma = vi.mocked(prisma);

function createSampleCampaign(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'campaign-1',
    code: 'SAVE10',
    name: 'Sample Discount',
    isAutomatic: false,
    conditions: null,
    locationId: null,
    type: 'PERCENTAGE' as CouponType,
    value: 10,
    minOrder: 0,
    maxDiscount: null,
    usageLimit: null,
    usageCount: 0,
    perCustomer: 1,
    startsAt: null,
    expiresAt: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

describe('Discount Engine Logic', () => {
  describe('validateAndCalculateDiscount', () => {
    it('calculates PERCENTAGE discount correctly', () => {
      const campaign = createSampleCampaign({ type: 'PERCENTAGE', value: 10 });
      const result = validateAndCalculateDiscount(
        campaign,
        { subtotal: 100, orderType: 'PICKUP', locationId: 'loc1' },
        []
      );
      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(10);
      expect(result.freeDelivery).toBe(false);
    });

    it('enforces maxDiscount limit for PERCENTAGE discount', () => {
      const campaign = createSampleCampaign({ type: 'PERCENTAGE', value: 10, maxDiscount: 5 });
      const result = validateAndCalculateDiscount(
        campaign,
        { subtotal: 100, orderType: 'PICKUP', locationId: 'loc1' },
        []
      );
      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(5);
    });

    it('calculates FIXED discount correctly', () => {
      const campaign = createSampleCampaign({ type: 'FIXED', value: 15 });
      const result = validateAndCalculateDiscount(
        campaign,
        { subtotal: 50, orderType: 'PICKUP', locationId: 'loc1' },
        []
      );
      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(15);
    });

    it('calculates FREE_DELIVERY discount correctly', () => {
      const campaign = createSampleCampaign({ type: 'FREE_DELIVERY' });
      const result = validateAndCalculateDiscount(
        campaign,
        { subtotal: 50, orderType: 'DELIVERY', locationId: 'loc1' },
        []
      );
      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(0);
      expect(result.freeDelivery).toBe(true);
    });

    it('enforces minOrder minimum subtotal threshold', () => {
      const campaign = createSampleCampaign({ minOrder: 50 });
      const result = validateAndCalculateDiscount(
        campaign,
        { subtotal: 40, orderType: 'PICKUP', locationId: 'loc1' },
        []
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('未達最低消費金額門檻');
    });

    it('enforces locationId restriction', () => {
      const campaign = createSampleCampaign({ locationId: 'loc-main' });
      const result = validateAndCalculateDiscount(
        campaign,
        { subtotal: 100, orderType: 'PICKUP', locationId: 'loc-other' },
        []
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('不適用於此門市');
    });

    it('enforces allowedOrderTypes condition', () => {
      const campaign = createSampleCampaign({
        conditions: JSON.stringify({ allowedOrderTypes: ['DELIVERY'] })
      });
      const result = validateAndCalculateDiscount(
        campaign,
        { subtotal: 100, orderType: 'PICKUP', locationId: 'loc1' },
        []
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('本活動僅限特定管道');
    });

    it('enforces requireCategoryIds condition', () => {
      const campaign = createSampleCampaign({
        conditions: JSON.stringify({ requireCategoryIds: ['cat-pizza'] })
      });
      const cartItems = [
        { menuItemId: 'item-1', categoryId: 'cat-burger', price: 10, quantity: 2 }
      ];
      const result = validateAndCalculateDiscount(
        campaign,
        { subtotal: 100, orderType: 'PICKUP', locationId: 'loc1' },
        cartItems
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('購物車內未包含指定分類商品');
    });

    it('enforces minItemCount total item count condition', () => {
      const campaign = createSampleCampaign({
        conditions: JSON.stringify({ minItemCount: 3 })
      });
      const cartItems = [
        { menuItemId: 'item-1', categoryId: 'cat-burger', price: 10, quantity: 2 }
      ];
      const result = validateAndCalculateDiscount(
        campaign,
        { subtotal: 100, orderType: 'PICKUP', locationId: 'loc1' },
        cartItems
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('商品總數量需達到');
    });

    it('enforces timeOfDay Happy Hour time limitation', () => {
      const campaign = createSampleCampaign({
        conditions: JSON.stringify({ timeOfDay: { startTime: '14:00', endTime: '17:00' } })
      });
      
      // 10:00 AM (out of range)
      const dateOut = new Date('2026-05-24T10:00:00+08:00');
      const resultOut = validateAndCalculateDiscount(
        campaign,
        { subtotal: 100, orderType: 'PICKUP', locationId: 'loc1', localTime: dateOut },
        []
      );
      expect(resultOut.isValid).toBe(false);
      expect(resultOut.reason).toContain('本活動僅限特惠時段');

      // 15:30 PM (within range)
      const dateIn = new Date('2026-05-24T15:30:00+08:00');
      const resultIn = validateAndCalculateDiscount(
        campaign,
        { subtotal: 100, orderType: 'PICKUP', locationId: 'loc1', localTime: dateIn },
        []
      );
      expect(resultIn.isValid).toBe(true);
    });
  });

  describe('findAndApplyBestAutomaticDiscount', () => {
    it('scans and applies the best automatic promotion', async () => {
      const promo1 = createSampleCampaign({
        id: 'p1',
        isAutomatic: true,
        type: 'PERCENTAGE',
        value: 10, // 10% off ($10)
      });
      const promo2 = createSampleCampaign({
        id: 'p2',
        isAutomatic: true,
        type: 'FIXED',
        value: 15, // $15 off
      });

      mockedPrisma.coupon.findMany.mockResolvedValueOnce([promo1, promo2] as any);

      const best = await findAndApplyBestAutomaticDiscount(
        { subtotal: 100, orderType: 'PICKUP', locationId: 'loc1' },
        []
      );

      // Best should be promo2 since it has $15 off (> $10 off)
      expect(best.campaign?.id).toBe('p2');
      expect(best.discountAmount).toBe(15);
      expect(best.freeDelivery).toBe(false);
    });
  });
});
