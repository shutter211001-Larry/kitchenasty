import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { getIO } from '../lib/socket.js';

function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

const createSessionSchema = z.object({
  locationId: z.string().min(1),
  tableName: z.string().min(1),
});

export async function createSession(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors });
      return;
    }

    const { locationId, tableName } = parsed.data;

    // Verify table exists
    const table = await prisma.table.findFirst({
      where: { name: tableName, locationId, isActive: true },
    });

    if (!table) {
      res.status(400).json({ success: false, error: '查無此桌號或桌號已停用' });
      return;
    }

    // Cancel existing active sessions for this table
    await prisma.groupOrderSession.updateMany({
      where: { tableId: table.id, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });

    const session = await prisma.groupOrderSession.create({
      data: {
        pin: generatePin(),
        locationId,
        tableId: table.id,
        cartItems: [],
        status: 'ACTIVE',
      },
    });

    res.status(201).json({ success: true, data: session });
  } catch (err: any) {
    console.error('Error creating group order session:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

const joinSessionSchema = z.object({
  locationId: z.string().min(1),
  tableName: z.string().min(1),
  pin: z.string().length(4),
});

export async function joinSession(req: Request, res: Response): Promise<void> {
  try {
    const parsed = joinSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors });
      return;
    }

    const { locationId, tableName, pin } = parsed.data;

    const table = await prisma.table.findFirst({
      where: { name: tableName, locationId, isActive: true },
    });

    if (!table) {
      res.status(400).json({ success: false, error: '查無此桌號' });
      return;
    }

    const session = await prisma.groupOrderSession.findFirst({
      where: {
        tableId: table.id,
        pin,
        status: 'ACTIVE',
      },
    });

    if (!session) {
      res.status(404).json({ success: false, error: '代碼無效或同桌點餐已結束' });
      return;
    }

    res.json({ success: true, data: session });
  } catch (err: any) {
    console.error('Error joining group order session:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

const updateCartSchema = z.object({
  cartItems: z.array(z.any()),
});

export async function updateCart(req: Request<{ id: string }>, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const parsed = updateCartSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.errors });
      return;
    }

    const session = await prisma.groupOrderSession.findUnique({
      where: { id },
    });

    if (!session || session.status !== 'ACTIVE') {
      res.status(400).json({ success: false, error: '此同桌點餐已結束或無效' });
      return;
    }

    const updatedSession = await prisma.groupOrderSession.update({
      where: { id },
      data: { cartItems: parsed.data.cartItems },
    });

    // Broadcast cart update via socket
    const io = getIO();
    if (io) {
      io.to(`group-order:${id}`).emit('group-order:cartUpdate', updatedSession.cartItems);
    }

    res.json({ success: true, data: updatedSession });
  } catch (err: any) {
    console.error('Error updating group cart:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getSession(req: Request<{ id: string }>, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const session = await prisma.groupOrderSession.findUnique({
      where: { id },
    });

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.json({ success: true, data: session });
  } catch (err: any) {
    console.error('Error getting group order session:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
