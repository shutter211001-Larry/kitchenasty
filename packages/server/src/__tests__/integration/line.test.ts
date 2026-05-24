import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';
import { generateToken } from '../../middleware/auth.js';

// Setup environment variables
process.env.LINE_CHANNEL_SECRET = 'test-secret';
process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-token';
process.env.STOREFRONT_URL = 'http://localhost:5174';

// Mock DB
vi.mock('../../lib/db.js', () => {
    const mockPrisma = {
        location: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
        order: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
        orderItem: { count: vi.fn() },
        menuItem: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
        deliveryZone: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        table: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        reservation: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
        coupon: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
        review: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
        user: { findUnique: vi.fn(), update: vi.fn() },
        customer: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
        category: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
        automationRule: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
        mealtime: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
        siteSettings: { findUnique: vi.fn() },
    };
    return { default: mockPrisma, prisma: mockPrisma };
});

vi.mock('../../lib/stripe.js', () => ({
    default: {
        paymentIntents: { create: vi.fn() },
        webhooks: { constructEvent: vi.fn() },
    },
}));

vi.mock('../../lib/registrationBonus.js', () => ({
    grantRegistrationBonus: vi.fn().mockResolvedValue(undefined),
}));

// Mock @line/bot-sdk Client — must use class syntax for `new Client()` to work
const mockReplyMessage = vi.fn().mockResolvedValue({});
const mockGetProfile = vi.fn().mockResolvedValue({ displayName: 'Test User' });
const mockPushMessage = vi.fn().mockResolvedValue({});

vi.mock('@line/bot-sdk', () => {
  const MockClient = class {
    replyMessage = mockReplyMessage;
    getProfile = mockGetProfile;
    pushMessage = mockPushMessage;
  };
  return {
    Client: MockClient,
  };
});

import prisma from '../../lib/db.js';
const mockedPrisma = vi.mocked(prisma) as any;

const app = createApp();

const adminToken = generateToken({ id: 'admin-1', email: 'admin@test.com', type: 'staff', role: 'SUPER_ADMIN' });
const customerToken = generateToken({ id: 'cust-1', email: 'customer@test.com', type: 'customer' });

const sampleSiteSettings = {
  id: 'default',
  lineSettings: {
    liffId: 'test-liff-id',
    officialAccountUrl: 'https://line.me/R/ti/p/@test',
  },
  advancedSettings: {},
};

const sampleCategory = {
  id: 'cat-1',
  name: '美味披薩',
  description: '熱騰騰的手作比薩',
  image: 'https://example.com/pizza.jpg',
  isActive: true,
  sortOrder: 1,
};

const sampleCustomer = {
  id: 'cust-1',
  name: '小明',
  email: 'xiaoming@test.com',
  lineUserId: 'U1234567890abcdef1234567890abcdef',
  lineDisplayName: 'Xiao Ming',
  loyaltyPoints: 100,
};

const sampleOrder = {
  id: 'ord-1',
  orderNumber: 'KNT-2026-0001',
  customerId: 'cust-1',
  status: 'PREPARING',
  total: 520.00,
  createdAt: new Date(),
  items: [
    { id: 'item-1', name: '瑪格麗特披薩', quantity: 2, price: 200 },
    { id: 'item-2', name: '可口可樂', quantity: 1, price: 40 },
  ],
  location: { id: 'loc-1', name: '夏特總店' },
};

describe('LINE API & Chatbot Webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedPrisma.siteSettings.findUnique.mockResolvedValue(sampleSiteSettings);
  });

  describe('GET /api/line/status', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/line/status');
      expect(res.status).toBe(401);
    });

    it('returns status information with admin auth', async () => {
      const res = await request(app)
        .get('/api/line/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isConfigured).toBe(true);
      expect(res.body.data.liffId).toBe('test-liff-id');
      expect(res.body.data.officialAccountUrl).toBe('https://line.me/R/ti/p/@test');
    });
  });

  describe('POST /api/line/webhook', () => {
    it('handles follow event with a welcome flex message card', async () => {
      const payload = {
        events: [
          {
            type: 'follow',
            replyToken: 'token-follow',
            source: {
              type: 'user',
              userId: 'U11111111111111111111111111111111',
            },
            timestamp: 1625000000000,
            mode: 'active',
          },
        ],
      };

      const res = await request(app)
        .post('/api/line/webhook')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      expect(mockGetProfile).toHaveBeenCalledWith('U11111111111111111111111111111111');
      expect(mockReplyMessage).toHaveBeenCalled();
      
      const replyArgs = mockReplyMessage.mock.calls[0];
      expect(replyArgs[0]).toBe('token-follow');
      expect(replyArgs[1].type).toBe('flex');
      expect(replyArgs[1].altText).toContain('歡迎關注夏特點餐系統');
      expect(replyArgs[1].contents.body.contents[0].text).toContain('Test User');
    });

    it('handles "menu" / "點餐" text message and replies with category carousel', async () => {
      mockedPrisma.category.findMany.mockResolvedValue([sampleCategory]);

      const payload = {
        events: [
          {
            type: 'message',
            replyToken: 'token-menu',
            source: {
              type: 'user',
              userId: 'U11111111111111111111111111111111',
            },
            message: {
              id: 'msg-1',
              type: 'text',
              text: '點餐',
            },
            timestamp: 1625000000000,
            mode: 'active',
          },
        ],
      };

      const res = await request(app)
        .post('/api/line/webhook')
        .send(payload);

      expect(res.status).toBe(200);
      expect(mockedPrisma.category.findMany).toHaveBeenCalled();
      expect(mockReplyMessage).toHaveBeenCalled();

      const replyArgs = mockReplyMessage.mock.calls[0];
      expect(replyArgs[0]).toBe('token-menu');
      expect(replyArgs[1].type).toBe('flex');
      expect(replyArgs[1].contents.type).toBe('carousel');
      expect(replyArgs[1].contents.contents[0].body.contents[0].text).toBe('美味披薩');
      expect(replyArgs[1].contents.contents[0].footer.contents[0].action.uri).toContain('menu/categories/cat-1');
    });

    it('handles "order" / "查詢" for unlinked LINE user', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue(null);

      const payload = {
        events: [
          {
            type: 'message',
            replyToken: 'token-query-unlinked',
            source: {
              type: 'user',
              userId: 'U11111111111111111111111111111111',
            },
            message: {
              id: 'msg-2',
              type: 'text',
              text: '查詢',
            },
            timestamp: 1625000000000,
            mode: 'active',
          },
        ],
      };

      const res = await request(app)
        .post('/api/line/webhook')
        .send(payload);

      expect(res.status).toBe(200);
      expect(mockedPrisma.customer.findUnique).toHaveBeenCalledWith({
        where: { lineUserId: 'U11111111111111111111111111111111' },
      });
      expect(mockReplyMessage).toHaveBeenCalled();

      const replyArgs = mockReplyMessage.mock.calls[0];
      expect(replyArgs[0]).toBe('token-query-unlinked');
      expect(replyArgs[1].altText).toContain('請先綁定會員帳號');
      expect(replyArgs[1].contents.body.contents[0].text).toContain('尚未綁定會員帳號');
    });

    it('handles "order" / "查詢" for linked LINE user with no active orders', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue(sampleCustomer);
      mockedPrisma.order.findFirst.mockResolvedValue(null);

      const payload = {
        events: [
          {
            type: 'message',
            replyToken: 'token-query-no-orders',
            source: {
              type: 'user',
              userId: 'U1234567890abcdef1234567890abcdef',
            },
            message: {
              id: 'msg-3',
              type: 'text',
              text: '查詢',
            },
            timestamp: 1625000000000,
            mode: 'active',
          },
        ],
      };

      const res = await request(app)
        .post('/api/line/webhook')
        .send(payload);

      expect(res.status).toBe(200);
      expect(mockedPrisma.customer.findUnique).toHaveBeenCalled();
      expect(mockedPrisma.order.findFirst).toHaveBeenCalled();
      expect(mockReplyMessage).toHaveBeenCalled();

      const replyArgs = mockReplyMessage.mock.calls[0];
      expect(replyArgs[0]).toBe('token-query-no-orders');
      expect(replyArgs[1].altText).toContain('目前沒有活躍訂單');
      expect(replyArgs[1].contents.body.contents[0].text).toContain('查無進行中的訂單');
    });

    it('handles "order" / "查詢" for linked LINE user with an active order', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue(sampleCustomer);
      mockedPrisma.order.findFirst.mockResolvedValue(sampleOrder);

      const payload = {
        events: [
          {
            type: 'message',
            replyToken: 'token-query-active',
            source: {
              type: 'user',
              userId: 'U1234567890abcdef1234567890abcdef',
            },
            message: {
              id: 'msg-4',
              type: 'text',
              text: '查詢',
            },
            timestamp: 1625000000000,
            mode: 'active',
          },
        ],
      };

      const res = await request(app)
        .post('/api/line/webhook')
        .send(payload);

      expect(res.status).toBe(200);
      expect(mockedPrisma.order.findFirst).toHaveBeenCalled();
      expect(mockReplyMessage).toHaveBeenCalled();

      const replyArgs = mockReplyMessage.mock.calls[0];
      expect(replyArgs[0]).toBe('token-query-active');
      expect(replyArgs[1].altText).toContain('訂單 #KNT-2026-0001 狀態追蹤');
      expect(replyArgs[1].contents.body.contents[1].contents[1].text).toContain('👨‍🍳 製作中');
      expect(replyArgs[1].contents.body.contents[3].contents[1].text).toContain('2x 瑪格麗特披薩');
      expect(replyArgs[1].contents.body.contents[5].contents[1].text).toBe('$520.00');
    });
  });

  describe('POST /api/line/bind', () => {
    it('returns 401 without customer auth', async () => {
      const res = await request(app)
        .post('/api/line/bind')
        .send({ lineUserId: 'U123', lineDisplayName: 'Test' });
      expect(res.status).toBe(401);
    });

    it('binds LINE user account for authenticated customer successfully', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue(null);
      mockedPrisma.customer.update.mockResolvedValue({ ...sampleCustomer, lineUserId: 'U-new' });

      const res = await request(app)
        .post('/api/line/bind')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ lineUserId: 'U-new', lineDisplayName: 'New User' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockedPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { lineUserId: 'U-new', lineDisplayName: 'New User' },
      });
    });

    it('fails if LINE ID is already bound to another customer', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-other',
        name: 'Other',
        lineUserId: 'U-already-bound',
      });

      const res = await request(app)
        .post('/api/line/bind')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ lineUserId: 'U-already-bound', lineDisplayName: 'Other' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('此 LINE 帳號已被其他會員連結');
    });
  });

  describe('POST /api/line/unbind', () => {
    it('unbinds LINE user account successfully', async () => {
      mockedPrisma.customer.update.mockResolvedValue({ ...sampleCustomer, lineUserId: null });

      const res = await request(app)
        .post('/api/line/unbind')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockedPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { lineUserId: null, lineDisplayName: null },
      });
    });
  });

  describe('POST /api/line/login', () => {
    it('returns token for existing customer by lineUserId', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue(sampleCustomer);

      const res = await request(app)
        .post('/api/line/login')
        .send({
          lineUserId: 'U1234567890abcdef1234567890abcdef',
          lineDisplayName: 'Xiao Ming',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.customer.id).toBe('cust-1');
    });

    it('auto-registers and logs in a new user when lineUserId does not exist', async () => {
      mockedPrisma.customer.findUnique.mockResolvedValue(null);
      mockedPrisma.customer.create.mockResolvedValue({
        id: 'cust-new',
        name: 'Auto LINE User',
        email: null,
        lineUserId: 'U-new-user',
        lineDisplayName: 'Auto LINE User',
      });

      const res = await request(app)
        .post('/api/line/login')
        .send({
          lineUserId: 'U-new-user',
          lineDisplayName: 'Auto LINE User',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockedPrisma.customer.create).toHaveBeenCalled();
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.customer.id).toBe('cust-new');
    });
  });
});
