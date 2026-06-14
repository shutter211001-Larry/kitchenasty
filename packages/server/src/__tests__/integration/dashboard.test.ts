import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { generateToken } from '../../middleware/auth.js';

vi.mock('../../lib/db.js', () => {
  const mockPrisma = {
    location: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    order: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    orderItem: { count: vi.fn(), groupBy: vi.fn() },
    menuItem: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
    deliveryZone: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    table: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    reservation: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    coupon: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    review: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    customer: { findUnique: vi.fn(), count: vi.fn() },
    user: { findUnique: vi.fn() },
    category: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    $queryRaw: vi.fn(),
  };
  return { default: mockPrisma, prisma: mockPrisma };
});

vi.mock('../../lib/stripe.js', () => ({
  default: {
    paymentIntents: { create: vi.fn() },
    webhooks: { constructEvent: vi.fn() },
  },
}));

import prisma from '../../lib/db.js';
const mockedPrisma = vi.mocked(prisma) as any;

const app = createApp();

const staffToken = generateToken({ id: '1', email: 'admin@test.com', type: 'staff', role: 'SUPER_ADMIN' });
const customerToken = generateToken({ id: 'cust-1', email: 'customer@test.com', type: 'customer' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Dashboard API', () => {
  describe('GET /api/dashboard/stats', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/dashboard/stats');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-staff', async () => {
      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it('returns dashboard stats for staff', async () => {
      // Mock all the prisma calls
      mockedPrisma.$queryRaw.mockResolvedValueOnce([
        {
          ordersToday: 5,
          revenueToday: 250.50,
          ordersThisWeek: 25,
          revenueThisWeek: 1200,
          ordersThisMonth: 100,
          revenueThisMonth: 5000,
          totalOrders: 500,
          totalRevenue: 25000,
        }
      ] as any);
      mockedPrisma.menuItem.count.mockResolvedValueOnce(42);
      mockedPrisma.customer.count.mockResolvedValueOnce(150);
      mockedPrisma.reservation.count.mockResolvedValueOnce(3);
      mockedPrisma.review.count.mockResolvedValueOnce(7);
      mockedPrisma.order.findMany.mockResolvedValueOnce([
        { id: 'o1', orderNumber: 'KA-001', status: 'PENDING', total: 29.99, orderType: 'DELIVERY', createdAt: new Date(), customer: { name: 'John' } },
      ] as any);
      mockedPrisma.orderItem.groupBy.mockResolvedValueOnce([
        { menuItemId: 'item-1', name: 'Pizza', _sum: { quantity: 42 } },
      ] as any);

      const res = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.metrics.ordersToday).toBe(5);
      expect(res.body.data.metrics.revenueToday).toBe(250.50);
      expect(res.body.data.metrics.activeItems).toBe(42);
      expect(res.body.data.metrics.totalCustomers).toBe(150);
      expect(res.body.data.recentOrders).toHaveLength(1);
      expect(res.body.data.topItems).toHaveLength(1);
      expect(res.body.data.topItems[0].name).toBe('Pizza');
    });
  });
});
