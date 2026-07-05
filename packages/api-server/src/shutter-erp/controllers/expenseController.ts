import { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const getExpenses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const expenses = await prisma.expense.findMany({
      include: {
        inventoryLog: {
          include: {
            ingredient: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

export const updateExpenseStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!['PENDING', 'PAID'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: { status }
    });

    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update expense status' });
  }
};

export const deleteExpense = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.expense.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

export const getExpenseAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const expenses = await prisma.expense.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      include: {
        inventoryLog: {
          include: {
            ingredient: true
          }
        }
      }
    });

    let totalExpenses = 0;
    let totalPaid = 0;
    let totalPending = 0;

    const dailyStatsMap: Record<string, number> = {};
    const statusDistributionMap: Record<string, { count: number; total: number }> = {
      PENDING: { count: 0, total: 0 },
      PAID: { count: 0, total: 0 }
    };
    const categoryDistributionMap: Record<string, { revenue: number; orders: number }> = {};

    expenses.forEach(exp => {
      totalExpenses += exp.amount;
      if (exp.status === 'PAID') {
        totalPaid += exp.amount;
        statusDistributionMap.PAID.count++;
        statusDistributionMap.PAID.total += exp.amount;
      } else if (exp.status === 'PENDING') {
        totalPending += exp.amount;
        statusDistributionMap.PENDING.count++;
        statusDistributionMap.PENDING.total += exp.amount;
      }

      // Group by Date
      const dateStr = exp.createdAt.toISOString().split('T')[0];
      if (!dailyStatsMap[dateStr]) {
        dailyStatsMap[dateStr] = 0;
      }
      dailyStatsMap[dateStr] += exp.amount;

      // Group by Category (from Ingredient)
      if (exp.inventoryLog?.ingredient?.category) {
        const cat = exp.inventoryLog.ingredient.category;
        if (!categoryDistributionMap[cat]) {
          categoryDistributionMap[cat] = { revenue: 0, orders: 0 };
        }
        categoryDistributionMap[cat].revenue += exp.amount;
        categoryDistributionMap[cat].orders += 1;
      } else {
        const cat = '未分類 / 其他';
        if (!categoryDistributionMap[cat]) {
          categoryDistributionMap[cat] = { revenue: 0, orders: 0 };
        }
        categoryDistributionMap[cat].revenue += exp.amount;
        categoryDistributionMap[cat].orders += 1;
      }
    });

    // Format for charts
    const dailyStats = Object.keys(dailyStatsMap)
      .sort()
      .map(date => ({ date, amount: dailyStatsMap[date] }));

    const statusDistribution = Object.keys(statusDistributionMap).map(status => ({
      status,
      count: statusDistributionMap[status].count,
      total: statusDistributionMap[status].total
    }));

    const categoryDistribution = Object.keys(categoryDistributionMap)
      .sort((a, b) => categoryDistributionMap[b].revenue - categoryDistributionMap[a].revenue)
      .map(name => ({
        name,
        revenue: categoryDistributionMap[name].revenue,
        orders: categoryDistributionMap[name].orders
      }));

    res.json({
      metrics: {
        totalExpenses,
        totalPaid,
        totalPending
      },
      analytics: {
        dailyStats,
        statusDistribution,
        categoryDistribution
      }
    });
  } catch (error) {
    console.error('Failed to fetch expense analytics', error);
    res.status(500).json({ error: 'Failed to fetch expense analytics' });
  }
};
