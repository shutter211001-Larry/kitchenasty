import { Request, Response } from 'express';
import { prisma as adminPrisma } from '../../lib/db';
import shutterErpPrisma from '../lib/prisma';
import { OrderStatus } from '@prisma/client';

export const getProfitAndLoss = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // 1. Calculate Revenue (Admin DB)
    const orders = await adminPrisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: {
          notIn: ['CANCELLED', 'REFUNDED'] as any,
        },
      },
      select: { total: true },
    });
    const revenue = orders.reduce((sum, order) => sum + order.total, 0);

    // 2. Calculate Expenses (ERP DB)
    const expenses = await shutterErpPrisma.expense.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
        status: 'PAID',
      },
      select: { amount: true },
    });
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // 3. Calculate Payroll (Admin DB)
    // A. Hourly Staff
    const attendances = await adminPrisma.staffAttendance.findMany({
      where: {
        checkIn: {
          gte: start,
          lte: end,
        },
        checkOut: { not: null },
      },
      include: {
        user: {
          select: { hourlyWage: true },
        },
      },
    });

    let hourlyPayroll = 0;
    attendances.forEach((record) => {
      if (record.checkOut && record.user) {
        const hours = (record.checkOut.getTime() - record.checkIn.getTime()) / (1000 * 60 * 60);
        hourlyPayroll += hours * (record.user.hourlyWage || 0);
      }
    });

    // Monthly Staff not supported in schema yet
    const monthlyPayroll = 0;

    const totalPayroll = hourlyPayroll + monthlyPayroll;

    // 4. Calculate PnL
    const grossProfit = revenue - totalExpenses;
    const netProfit = grossProfit - totalPayroll;

    res.json({
      period: { start, end },
      revenue,
      expenses: totalExpenses,
      payroll: {
        hourly: hourlyPayroll,
        monthly: monthlyPayroll,
        total: totalPayroll,
      },
      grossProfit,
      netProfit,
    });
  } catch (error: any) {
    console.error('Error fetching PnL:', error);
    res.status(500).json({ error: 'Failed to fetch PnL data' });
  }
};
