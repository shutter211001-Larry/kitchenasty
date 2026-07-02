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
