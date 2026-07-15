import { Request, Response } from 'express';
import { prisma } from '../lib/db.js';

export async function getMarketingStats(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const where: any = { status: { not: 'CANCELLED' } };
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    // 取得所有已完成且帶有 utmSource 的訂單
    const orders = await prisma.order.findMany({
      where: {
        ...where,
        utmSource: { not: null }
      },
      select: {
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
        total: true,
      }
    });

    const statsMap = new Map<string, { source: string; medium: string; campaign: string; ordersCount: number; totalRevenue: number }>();

    orders.forEach(order => {
      const source = order.utmSource || 'unknown';
      const medium = order.utmMedium || 'unknown';
      const campaign = order.utmCampaign || 'unknown';
      
      const key = `${source}-${medium}-${campaign}`;

      if (!statsMap.has(key)) {
        statsMap.set(key, { source, medium, campaign, ordersCount: 0, totalRevenue: 0 });
      }

      const stat = statsMap.get(key)!;
      stat.ordersCount += 1;
      stat.totalRevenue += order.total;
    });

    const stats = Array.from(statsMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // 計算總結
    const summary = {
      totalUTMOrders: stats.reduce((sum, s) => sum + s.ordersCount, 0),
      totalUTMRevenue: stats.reduce((sum, s) => sum + s.totalRevenue, 0)
    };

    res.json({ success: true, data: { stats, summary } });
  } catch (err: any) {
    console.error('Error fetching marketing stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch marketing stats' });
  }
}
