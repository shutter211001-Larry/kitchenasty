import { Request, Response } from 'express';
import prisma from '../lib/db.js';

export const createLeaveRequest = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { leaveType, startTime, endTime, reason } = req.body;

  if (!leaveType || !startTime || !endTime || !reason) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const leave = await prisma.leaveRequest.create({
      data: {
        userId,
        leaveType,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        reason
      }
    });

    res.json({ success: true, data: leave });
  } catch (error: any) {
    console.error('Create leave error:', error);
    res.status(500).json({ success: false, error: 'System error' });
  }
};

export const getMyLeaveRequests = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const leaves = await prisma.leaveRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: leaves });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'System error' });
  }
};

export const getAllLeaveRequests = async (req: Request, res: Response) => {
  try {
    const where: any = {};
    if (req.user?.role === 'MANAGER') {
      const manager = await prisma.user.findUnique({ where: { id: req.user.id }});
      if (manager?.locationId) {
        where.user = { locationId: manager.locationId };
      } else {
        where.user = { locationId: 'unassigned-location' };
      }
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: leaves });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'System error' });
  }
};

export const updateLeaveStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const managerId = req.user?.id;

  if (!managerId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const leave = await prisma.leaveRequest.update({
      where: { id: id as string },
      data: {
        status,
        managerId
      }
    });

    res.json({ success: true, data: leave });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'System error' });
  }
};
