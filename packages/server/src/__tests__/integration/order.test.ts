import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { generateToken } from '../../middleware/auth.js';

vi.mock('../../lib/db.js', () => {
  const mockPrisma = {
    location: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    order: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    orderItem: { count: vi.fn() },
    menuItem: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    deliveryZone: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    table: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    reservation: { count: vi.fn() },
    user: { findUnique: vi.fn() },
    customer: { findUnique: vi.fn(), update: vi.fn() },
    loyaltyTransaction: { create: vi.fn() },
    automationRule: { findMany: vi.fn() },
    category: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    siteSettings: { findUnique: vi.fn() },
    menuOptionValue: { findMany: vi.fn() },
    coupon: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

vi.mock('../../middleware/security.js', () => ({
  checkIPBlacklist: (req: any, res: any, next: any) => next(),
  checkCustomerBlacklist: (req: any, res: any, next: any) => next(),
  orderRateLimiter: (req: any, res: any, next: any) => next(),
}));



import prisma from '../../lib/db.js';
const mockedPrisma = vi.mocked(prisma) as any;

const app = createApp();

const adminToken = generateToken({ id: '1', email: 'admin@test.com', type: 'staff', role: 'SUPER_ADMIN' });
const staffToken = generateToken({ id: '3', email: 'staff@test.com', type: 'staff', role: 'STAFF' });
const customerToken = generateToken({ id: 'cust-1', email: 'customer@test.com', type: 'customer' });

const sampleLocation = { id: 'loc-1', name: 'Downtown Kitchen', isActive: true, isBusy: false, busyMessage: null, operatingHours: [], deliveryEnabled: true, pickupEnabled: true };
const sampleMenuItem = {
  id: 'item-1',
  name: 'Margherita Pizza',
  price: 14.99,
  isActive: true,
  trackStock: false,
  stockQty: 0,
  options: [],
};
const sampleMenuItemWithStock = {
  ...sampleMenuItem,
  id: 'item-2',
  name: 'Special Pizza',
  trackStock: true,
  stockQty: 5,
};

const validOrderBody = {
  orderType: 'PICKUP',
  items: [{ menuItemId: 'item-1', quantity: 2 }],
  guestName: 'Test Guest',
  guestEmail: 'guest@test.com',
};

const sampleOrder = {
  id: 'order-1',
  orderNumber: 'SH-ABC-123',
  customerId: null,
  locationId: 'loc-1',
  orderType: 'PICKUP',
  status: 'PENDING',
  subtotal: 29.98,
  tax: 2.40,
  deliveryFee: 0,
  total: 32.38,
  items: [],
  createdAt: new Date(),
};

describe('Order API - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockedPrisma.siteSettings as any).findUnique.mockResolvedValue({
      orderSettings: { enabled: true, deliveryEnabled: true, pickupEnabled: true, taxRate: 8 }
    });
    (mockedPrisma.menuOptionValue as any).findMany.mockResolvedValue([]);
    (mockedPrisma.coupon as any).findMany.mockResolvedValue([]);
  });


  // ============================================================
  // CREATE
  // ============================================================
  describe('POST /api/orders', () => {
    it('creates a pickup order as guest', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([sampleMenuItem] as any);
      mockedPrisma.location.findFirst.mockResolvedValue(sampleLocation as any);
      mockedPrisma.order.create.mockResolvedValue(sampleOrder as any);
      mockedPrisma.automationRule.findMany.mockResolvedValue([]);

      const res = await request(app).post('/api/orders').send(validOrderBody);

      expect(res.status).toBe(201);
      expect(res.body.data.orderNumber).toBe('SH-ABC-123');
    });

    it('creates an order as authenticated customer', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([sampleMenuItem] as any);
      mockedPrisma.location.findFirst.mockResolvedValue(sampleLocation as any);
      mockedPrisma.order.create.mockResolvedValue({ ...sampleOrder, customerId: 'cust-1', customer: { email: 'customer@test.com' } } as any);
      mockedPrisma.customer.update.mockResolvedValue({ id: 'cust-1', loyaltyPoints: 14 } as any);
      mockedPrisma.loyaltyTransaction.create.mockResolvedValue({} as any);
      mockedPrisma.automationRule.findMany.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ orderType: 'PICKUP', items: [{ menuItemId: 'item-1', quantity: 2 }] });

      expect(res.status).toBe(201);
    });

    it('requires at least one item', async () => {
      const res = await request(app).post('/api/orders').send({
        orderType: 'PICKUP',
        items: [],
      });

      expect(res.status).toBe(400);
    });

    it('validates order type', async () => {
      const res = await request(app).post('/api/orders').send({
        orderType: 'INVALID',
        items: [{ menuItemId: 'item-1', quantity: 1 }],
      });

      expect(res.status).toBe(400);
    });

    it('requires address for delivery orders', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([sampleMenuItem] as any);

      const res = await request(app).post('/api/orders').send({
        orderType: 'DELIVERY',
        items: [{ menuItemId: 'item-1', quantity: 1 }],
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('address');
    });

    it('returns 400 for non-existent menu item', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([]);
      mockedPrisma.location.findFirst.mockResolvedValue(sampleLocation as any);

      const res = await request(app).post('/api/orders').send(validOrderBody);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not found');
    });

    it('returns 400 for inactive menu item', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([{ ...sampleMenuItem, isActive: false }] as any);
      mockedPrisma.location.findFirst.mockResolvedValue(sampleLocation as any);

      const res = await request(app).post('/api/orders').send(validOrderBody);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not available');
    });

    it('returns 400 when insufficient stock', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([{ ...sampleMenuItemWithStock, stockQty: 1 }] as any);
      mockedPrisma.location.findFirst.mockResolvedValue(sampleLocation as any);

      const res = await request(app).post('/api/orders').send({
        orderType: 'PICKUP',
        items: [{ menuItemId: 'item-2', quantity: 5 }],
        guestName: 'Test Guest',
        guestEmail: 'guest@test.com',
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/stock|庫存/);
    });

    it('returns 400 when no active location', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([sampleMenuItem] as any);
      mockedPrisma.location.findFirst.mockResolvedValue(null);

      const res = await request(app).post('/api/orders').send(validOrderBody);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('location');
    });

    it('creates delivery order with address', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([sampleMenuItem] as any);
      mockedPrisma.location.findFirst.mockResolvedValue(sampleLocation as any);
      mockedPrisma.deliveryZone.findFirst.mockResolvedValue(null);
      mockedPrisma.order.create.mockResolvedValue({ ...sampleOrder, orderType: 'DELIVERY' } as any);
      mockedPrisma.automationRule.findMany.mockResolvedValue([]);

      const res = await request(app).post('/api/orders').send({
        orderType: 'DELIVERY',
        items: [{ menuItemId: 'item-1', quantity: 1 }],
        address: { line1: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701' },
        guestName: 'Test Guest',
        guestEmail: 'guest@test.com',
      });

      expect(res.status).toBe(201);
    });

    it('creates a pickup order and applies a valid manual coupon code', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([sampleMenuItem] as any);
      mockedPrisma.location.findFirst.mockResolvedValue(sampleLocation as any);
      
      const mockCoupon = {
        id: 'coupon-abc',
        code: 'SAVE5',
        name: 'Save 5 Bucks',
        isAutomatic: false,
        conditions: null,
        locationId: null,
        type: 'FIXED',
        value: 5.0,
        minOrder: 0,
        maxDiscount: null,
        usageLimit: null,
        usageCount: 0,
        perCustomer: 1,
        startsAt: null,
        expiresAt: null,
        isActive: true,
      };
      mockedPrisma.coupon.findUnique.mockResolvedValue(mockCoupon as any);
      mockedPrisma.coupon.update.mockResolvedValue({} as any);
      mockedPrisma.order.create.mockResolvedValue({ ...sampleOrder, discount: 5.0, total: 24.98 } as any);
      mockedPrisma.automationRule.findMany.mockResolvedValue([]);

      const res = await request(app).post('/api/orders').send({
        ...validOrderBody,
        couponCode: 'SAVE5',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.discount).toBe(5.0);
    });

    it('creates a pickup order and automatically applies a valid automatic promotion', async () => {
      mockedPrisma.menuItem.findMany.mockResolvedValue([sampleMenuItem] as any);
      mockedPrisma.location.findFirst.mockResolvedValue(sampleLocation as any);
      
      const mockAutomaticPromo = {
        id: 'promo-auto',
        code: null,
        name: 'Auto 10% Off',
        isAutomatic: true,
        conditions: null,
        locationId: null,
        type: 'PERCENTAGE',
        value: 10.0,
        minOrder: 0,
        maxDiscount: null,
        usageLimit: null,
        usageCount: 0,
        perCustomer: 1,
        startsAt: null,
        expiresAt: null,
        isActive: true,
      };
      mockedPrisma.coupon.findMany.mockResolvedValue([mockAutomaticPromo] as any);
      mockedPrisma.coupon.update.mockResolvedValue({} as any);
      mockedPrisma.order.create.mockResolvedValue({ ...sampleOrder, discount: 2.99, total: 26.99 } as any);
      mockedPrisma.automationRule.findMany.mockResolvedValue([]);

      const res = await request(app).post('/api/orders').send(validOrderBody);

      expect(res.status).toBe(201);
      expect(res.body.data.discount).toBe(2.99);
    });

    it('creates a pickup order with point-redeemed items and custom loyalty rates', async () => {
      // Mock custom rates in settings
      mockedPrisma.siteSettings.findUnique.mockResolvedValue({
        orderSettings: { 
          enabled: true, 
          deliveryEnabled: true, 
          pickupEnabled: true, 
          taxRate: 0,
          loyaltyEarnRate: 0.5,
          loyaltyRedeemRate: 50.0
        },
        advancedSettings: {
          loyaltyRedemptionRules: {
            'item-1': { isRedeemable: true, maxRedemptionAmount: 0 }
          }
        }
      } as any);

      // Mock menu items (one standard, one reward)
      const standardItem = { ...sampleMenuItem, id: 'item-1', price: 14.99, isActive: true };
      const rewardItem = { id: 'item-reward', name: 'Reward Latte', price: 10.00, isActive: true, isRewardItem: true, rewardPointsPrice: 150 };
      mockedPrisma.menuItem.findMany.mockResolvedValue([standardItem, rewardItem] as any);
      mockedPrisma.location.findFirst.mockResolvedValue(sampleLocation as any);

      // Mock customer with enough points (needed: 150 for reward item + 100 for cash discount = 250 points)
      mockedPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        email: 'customer@test.com',
        loyaltyPoints: 300,
      } as any);

      // Mock updates & creations
      mockedPrisma.customer.update.mockResolvedValue({} as any);
      mockedPrisma.loyaltyTransaction.create.mockResolvedValue({} as any);
      mockedPrisma.order.create.mockResolvedValue({
        ...sampleOrder,
        subtotal: 14.99,
        discount: 2.00, // 100 points / 50 rate = $2.00
        total: 12.99,
      } as any);
      mockedPrisma.automationRule.findMany.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderType: 'PICKUP',
          items: [
            { menuItemId: 'item-1', quantity: 1 },
            { menuItemId: 'item-reward', quantity: 1, redeemedWithPoints: true }
          ],
          loyaltyPointsRedeem: 100, // Redeeming 100 points
        });

      expect(res.status).toBe(201);
      expect(res.body.data.subtotal).toBe(14.99);
      expect(res.body.data.discount).toBe(2.00);
      expect(res.body.data.total).toBe(12.99);

      // Verify that customer points were decremented by 250 points (150 reward + 100 redeem)
      expect(mockedPrisma.customer.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'cust-1' },
        data: expect.objectContaining({
          loyaltyPoints: { decrement: 250 }
        })
      }));

      // Verify that customer points were incremented by 7 points earned (14.99 subtotal * 0.5 earn rate = 7.495 -> 7 points)
      expect(mockedPrisma.customer.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'cust-1' },
        data: expect.objectContaining({
          loyaltyPoints: { increment: 7 }
        })
      }));
    });
  });

  // ============================================================
  // LIST
  // ============================================================
  describe('GET /api/orders', () => {
    it('requires staff authentication', async () => {
      const res = await request(app).get('/api/orders');
      expect(res.status).toBe(401);
    });

    it('rejects customer access', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('returns orders for staff', async () => {
      mockedPrisma.order.findMany.mockResolvedValue([sampleOrder] as any);
      mockedPrisma.order.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
    });
  });

  // ============================================================
  // GET
  // ============================================================
  describe('GET /api/orders/:id', () => {
    it('allows guest to view order detail', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue({
        ...sampleOrder,
        items: [{ id: 'oi-1', name: 'Pizza', quantity: 2, unitPrice: 14.99, subtotal: 29.98, options: [] }],
      } as any);

      const res = await request(app).get('/api/orders/order-1');
      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe('SH-ABC-123');
    });


    it('returns 404 for unknown order', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/orders/unknown')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ============================================================
  // UPDATE STATUS
  // ============================================================
  describe('PATCH /api/orders/:id/status', () => {
    it('requires staff authentication', async () => {
      const res = await request(app)
        .patch('/api/orders/order-1/status')
        .send({ status: 'CONFIRMED' });
      expect(res.status).toBe(401);
    });

    it('updates order status', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue({ ...sampleOrder, customer: null } as any);
      mockedPrisma.order.update.mockResolvedValue({ ...sampleOrder, status: 'CONFIRMED' } as any);
      mockedPrisma.automationRule.findMany.mockResolvedValue([]);

      const res = await request(app)
        .patch('/api/orders/order-1/status')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CONFIRMED');
    });

    it('rejects invalid status', async () => {
      const res = await request(app)
        .patch('/api/orders/order-1/status')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'INVALID' });

      expect(res.status).toBe(400);
    });

    it('returns 404 for unknown order', async () => {
      mockedPrisma.order.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/orders/unknown/status')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(404);
    });
  });

  // ============================================================
  // LOOKUP
  // ============================================================
  describe('GET /api/orders/lookup', () => {
    it('returns 400 if orderNumber is missing', async () => {
      const res = await request(app)
        .get('/api/orders/lookup')
        .query({ email: 'guest@test.com' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Order number is required');
    });

    it('returns 400 if both email and phone are missing', async () => {
      const res = await request(app)
        .get('/api/orders/lookup')
        .query({ orderNumber: 'SH-ABC-123' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Either email or phone is required');
    });

    it('returns 404 if no order matches email', async () => {
      mockedPrisma.order.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/orders/lookup')
        .query({ orderNumber: 'SH-ABC-123', email: 'wrong@test.com' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Order not found');
    });

    it('returns order if found by email', async () => {
      mockedPrisma.order.findFirst.mockResolvedValue(sampleOrder as any);

      const res = await request(app)
        .get('/api/orders/lookup')
        .query({ orderNumber: 'SH-ABC-123', email: 'guest@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe('SH-ABC-123');
    });

    it('returns order if found by phone', async () => {
      mockedPrisma.order.findFirst.mockResolvedValue(sampleOrder as any);

      const res = await request(app)
        .get('/api/orders/lookup')
        .query({ orderNumber: 'SH-ABC-123', phone: '0912345678' });

      expect(res.status).toBe(200);
      expect(res.body.data.orderNumber).toBe('SH-ABC-123');
    });
  });
});

