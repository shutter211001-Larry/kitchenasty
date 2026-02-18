import { Request, Response } from 'express';
import prisma from '../lib/db.js';

export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    ordersToday,
    revenueToday,
    ordersThisWeek,
    revenueThisWeek,
    ordersThisMonth,
    revenueThisMonth,
    totalOrders,
    totalRevenue,
    activeItems,
    totalCustomers,
    pendingReservations,
    pendingReviews,
    recentOrders,
    topItems,
  ] = await Promise.all([
    // Orders today
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    // Revenue today
    prisma.order.aggregate({
      where: { createdAt: { gte: todayStart }, status: { not: 'CANCELLED' } },
      _sum: { total: true },
    }),
    // Orders this week
    prisma.order.count({ where: { createdAt: { gte: weekStart } } }),
    // Revenue this week
    prisma.order.aggregate({
      where: { createdAt: { gte: weekStart }, status: { not: 'CANCELLED' } },
      _sum: { total: true },
    }),
    // Orders this month
    prisma.order.count({ where: { createdAt: { gte: monthStart } } }),
    // Revenue this month
    prisma.order.aggregate({
      where: { createdAt: { gte: monthStart }, status: { not: 'CANCELLED' } },
      _sum: { total: true },
    }),
    // Total orders
    prisma.order.count(),
    // Total revenue
    prisma.order.aggregate({
      where: { status: { not: 'CANCELLED' } },
      _sum: { total: true },
    }),
    // Active menu items
    prisma.menuItem.count({ where: { isActive: true } }),
    // Total customers
    prisma.customer.count(),
    // Pending reservations
    prisma.reservation.count({ where: { status: 'PENDING' } }),
    // Pending reviews
    prisma.review.count({ where: { isApproved: false } }),
    // Recent orders (last 5)
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        orderType: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    }),
    // Top selling items (by order item count)
    prisma.orderItem.groupBy({
      by: ['menuItemId', 'name'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
  ]);

  res.json({
    success: true,
    data: {
      metrics: {
        ordersToday,
        revenueToday: revenueToday._sum.total || 0,
        ordersThisWeek,
        revenueThisWeek: revenueThisWeek._sum.total || 0,
        ordersThisMonth,
        revenueThisMonth: revenueThisMonth._sum.total || 0,
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        activeItems,
        totalCustomers,
        pendingReservations,
        pendingReviews,
      },
      recentOrders,
      topItems: topItems.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.name,
        totalQuantity: item._sum.quantity || 0,
      })),
    },
  });
}
