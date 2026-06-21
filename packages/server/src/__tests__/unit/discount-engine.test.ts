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
const mockedPrisma = vi.mocked(prisma) as any;

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

    it('enforces minCategoryItemCount category-specific quantity condition', () => {
      const campaign = createSampleCampaign({
        conditions: JSON.stringify({ requireCategoryIds: ['cat-pizza'], minCategoryItemCount: 2 })
      });

      // Cart has 1 pizza (not enough)
      const cartItems1 = [
        { menuItemId: 'item-1', categoryId: 'cat-pizza', price: 15, quantity: 1 },
        { menuItemId: 'item-2', categoryId: 'cat-drinks', price: 5, quantity: 3 },
      ];
      const result1 = validateAndCalculateDiscount(
        campaign,
        { subtotal: 30, orderType: 'PICKUP', locationId: 'loc1' },
        cartItems1
      );
      expect(result1.isValid).toBe(false);
      expect(result1.reason).toContain('指定分類商品總數量需達到');

      // Cart has 2 pizzas (enough)
      const cartItems2 = [
        { menuItemId: 'item-1', categoryId: 'cat-pizza', price: 15, quantity: 2 },
        { menuItemId: 'item-2', categoryId: 'cat-drinks', price: 5, quantity: 1 },
      ];
      const result2 = validateAndCalculateDiscount(
        campaign,
        { subtotal: 35, orderType: 'PICKUP', locationId: 'loc1' },
        cartItems2
      );
      expect(result2.isValid).toBe(true);
    });
  });

  describe('validateAndCalculateDiscount - BOGO Promotions', () => {
    it('should correctly calculate buy 1 get 1 free (lowest price item is free)', () => {
      const bogoCampaign = createSampleCampaign({
        type: 'BOGO' as any,
        conditions: JSON.stringify({
          buyQuantity: 1,
          getQuantity: 1,
          getDiscountType: 'FREE'
        })
      });

      // 3 items: $100, $80, $50
      // Batch 1: buy 1, get 1 free -> the cheapest of the first batch (if we take all 3, cheapest is 50).
      // Since sorting ascending: 50, 80, 100.
      // Total items = 3. Batch size = 2. We have 1 batch.
      // So 1 item gets the discount. The cheapest is $50.
      const cartItems = [
        { menuItemId: 'item1', categoryId: 'cat1', price: 100, quantity: 1 },
        { menuItemId: 'item2', categoryId: 'cat1', price: 80, quantity: 1 },
        { menuItemId: 'item3', categoryId: 'cat1', price: 50, quantity: 1 },
      ];

      const result = validateAndCalculateDiscount(
        bogoCampaign,
        { subtotal: 230, orderType: 'PICKUP', locationId: 'loc1' },
        cartItems
      );

      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(50);
    });

    it('should correctly calculate buy 1 get second 50% off', () => {
      const bogoCampaign = createSampleCampaign({
        type: 'BOGO' as any,
        conditions: JSON.stringify({
          buyQuantity: 1,
          getQuantity: 1,
          getDiscountType: 'PERCENTAGE',
          getDiscountValue: 50
        })
      });

      // 4 items: $100, $100, $50, $50
      // 4 items, batch size 2, so 2 batches. 
      // 2 cheapest items get 50% off -> $50 * 50% + $50 * 50% = 25 + 25 = 50 discount.
      const cartItems = [
        { menuItemId: 'item1', categoryId: 'cat1', price: 100, quantity: 2 },
        { menuItemId: 'item2', categoryId: 'cat1', price: 50, quantity: 2 },
      ];

      const result = validateAndCalculateDiscount(
        bogoCampaign,
        { subtotal: 300, orderType: 'PICKUP', locationId: 'loc1' },
        cartItems
      );

      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(50); // 50 * 50% * 2
    });

    it('should correctly handle BOGO with specific categories', () => {
      const bogoCampaign = createSampleCampaign({
        type: 'BOGO' as any,
        conditions: JSON.stringify({
          applicableCategoryIds: ['target-cat'],
          buyQuantity: 2,
          getQuantity: 1,
          getDiscountType: 'FREE'
        })
      });

      // Cart: 
      // 1 item in target-cat (price $100)
      // 2 items in other-cat (price $50)
      // Only target-cat items are eligible, so we only have 1 item.
      // Required batch size is 3 (buy 2 get 1). 1 item is not enough.
      const cartItems = [
        { menuItemId: 'item1', categoryId: 'target-cat', price: 100, quantity: 1 },
        { menuItemId: 'item2', categoryId: 'other-cat', price: 50, quantity: 2 },
      ];

      const result = validateAndCalculateDiscount(
        bogoCampaign,
        { subtotal: 200, orderType: 'PICKUP', locationId: 'loc1' },
        cartItems
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('未達活動門檻');
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

  describe('Granular Applicable Restrictions (applicableCategoryIds / applicableMenuItemIds)', () => {
    it('applies percentage discount only to applicable categories', () => {
      const campaign = createSampleCampaign({
        type: 'PERCENTAGE',
        value: 10, // 10% off
        conditions: JSON.stringify({ applicableCategoryIds: ['cat-drinks'] } as any)
      });
      // cart: burger 200 (cat-food), drink 100 (cat-drinks), total = 300
      // 10% off drinks = 10 discount.
      const result = validateAndCalculateDiscount(
        campaign,
        { subtotal: 300, orderType: 'PICKUP', locationId: 'loc1' },
        [
          { menuItemId: 'm1', categoryId: 'cat-food', price: 200, quantity: 1 },
          { menuItemId: 'm2', categoryId: 'cat-drinks', price: 100, quantity: 1 }
        ]
      );
      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(10);
    });

    it('returns invalid if cart has no applicable items', () => {
      const campaign = createSampleCampaign({
        type: 'FIXED',
        value: 50,
        conditions: JSON.stringify({ applicableMenuItemIds: ['m999'] } as any)
      });
      const result = validateAndCalculateDiscount(
        campaign,
        { subtotal: 300, orderType: 'PICKUP', locationId: 'loc1' },
        [
          { menuItemId: 'm1', categoryId: 'cat-food', price: 200, quantity: 1 },
          { menuItemId: 'm2', categoryId: 'cat-drinks', price: 100, quantity: 1 }
        ]
      );
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('沒有符合此優惠條件的指定商品');
    });

    it('caps FIXED discount at applicable subtotal', () => {
      const campaign = createSampleCampaign({
        type: 'FIXED',
        value: 50,
        conditions: JSON.stringify({ applicableCategoryIds: ['cat-drinks'] } as any)
      });
      // drink is only $30. Max discount should be $30.
      const result = validateAndCalculateDiscount(
        campaign,
        { subtotal: 230, orderType: 'PICKUP', locationId: 'loc1' },
        [
          { menuItemId: 'm1', categoryId: 'cat-food', price: 200, quantity: 1 },
          { menuItemId: 'm2', categoryId: 'cat-drinks', price: 30, quantity: 1 }
        ]
      );
      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(30);
    });
  });

});
