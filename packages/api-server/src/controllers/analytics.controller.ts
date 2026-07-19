import { Request, Response } from 'express';
import { prisma } from '../lib/db.js';
import { tenantStorage } from '../middleware/tenantStorage.js';

export async function recordEvent(req: Request, res: Response): Promise<void> {
  try {
    const store = tenantStorage.getStore();
    const tenantId = store?.tenantId;
    console.log('[DEBUG] recordEvent', { headers: req.headers, tenantId });
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { sessionId, eventType, metadata } = req.body;
    
    if (!sessionId || !eventType) {
      res.status(400).json({ success: false, error: 'sessionId and eventType are required' });
      return;
    }

    const utmSource = metadata?.utmSource || null;
    const utmMedium = metadata?.utmMedium || null;
    const utmCampaign = metadata?.utmCampaign || null;

    await prisma.analyticsEvent.create({
      data: {
        tenantId,
        sessionId,
        eventType,
        metadata: metadata || {},
        utmSource,
        utmMedium,
        utmCampaign
      }
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to record analytics event:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}

export async function getFunnelStats(req: Request, res: Response): Promise<void> {
  try {
    const store = tenantStorage.getStore();
    const tenantId = store?.tenantId;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    const { startDate, endDate, dimension } = req.query;
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const where: any = { tenantId };
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    if (dimension && typeof dimension === 'string' && ['utmSource', 'utmMedium', 'utmCampaign'].includes(dimension)) {
      // 1. Group events by dimension and eventType
      const events = await prisma.analyticsEvent.groupBy({
        by: ['eventType', dimension as any],
        where: {
          ...where,
          [dimension]: { not: null }
        },
        _count: { _all: true }
      });

      // 2. Group orders by dimension
      const ordersCount = await prisma.order.groupBy({
        by: [dimension as any],
        where: {
          tenantId,
          status: { not: 'CANCELLED' },
          paymentStatus: 'PAID',
          [dimension]: { not: null },
          ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
        },
        _count: { _all: true }
      });

      // 3. Find top N dimensions by total event/order volume
      const volumeMap: Record<string, number> = {};
      events.forEach(e => {
        const val = (e as any)[dimension];
        if (val) volumeMap[val] = (volumeMap[val] || 0) + e._count._all;
      });
      ordersCount.forEach(o => {
        const val = (o as any)[dimension];
        if (val) volumeMap[val] = (volumeMap[val] || 0) + o._count._all;
      });

      const topDimensions = Object.keys(volumeMap)
        .sort((a, b) => volumeMap[b] - volumeMap[a])
        .slice(0, 5);

      const result: Record<string, Record<string, number>> = {};
      topDimensions.forEach(dim => {
        result[dim] = { VIEW_MENU: 0, ADD_TO_CART: 0, BEGIN_CHECKOUT: 0, PURCHASE: 0 };
      });

      events.forEach(e => {
        const val = (e as any)[dimension];
        if (val && topDimensions.includes(val)) {
          result[val][e.eventType] = e._count._all;
        }
      });
      ordersCount.forEach(o => {
        const val = (o as any)[dimension];
        if (val && topDimensions.includes(val)) {
          result[val]['PURCHASE'] = o._count._all;
        }
      });

      res.json({ success: true, data: result, isGrouped: true, topDimensions });
      return;
    }

    // 取得所有事件 (預設全局漏斗)
    const events = await prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where,
      _count: {
        _all: true
      }
    });

    // 為了將 PURCHASE 算在漏斗最後一步，我們直接查詢訂單數
    const ordersCount = await prisma.order.count({
      where: {
        tenantId,
        status: { not: 'CANCELLED' },
        paymentStatus: 'PAID',
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {})
      }
    });

    const counts: Record<string, number> = {
      VIEW_MENU: 0,
      ADD_TO_CART: 0,
      BEGIN_CHECKOUT: 0,
      PURCHASE: ordersCount
    };

    events.forEach(event => {
      counts[event.eventType] = event._count._all;
    });

    res.json({ success: true, data: counts });
  } catch (err: any) {
    console.error('Failed to get funnel stats:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
