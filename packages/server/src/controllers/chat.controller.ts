import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { emitChatMessage } from '../lib/socket.js';

export async function getMessages(req: Request, res: Response) {
  try {
    const messages = await prisma.chatMessage.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { name: true, role: true, avatar: true },
        },
      },
    });
    
    // Reverse so the oldest is first, newest at the bottom
    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
}

const sendSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty'),
});

export async function sendMessage(req: Request, res: Response) {
  try {
    // Requires authenticated admin user
    const senderId = (req as any).user?.id;
    if (!senderId) {
      return res.status(401).json({ success: false, message: '未授權' });
    }

    const { content } = sendSchema.parse(req.body);

    const message = await prisma.chatMessage.create({
      data: {
        content,
        senderId,
      },
      include: {
        sender: {
          select: { name: true, role: true, avatar: true },
        },
      },
    });

    // Broadcast the message via Socket.io
    emitChatMessage(message);

    res.json({ success: true, data: message });
  } catch (error) {
    console.error('Error sending chat message:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.errors[0].message });
    }
    res.status(500).json({ success: false, message: '伺服器錯誤' });
  }
}
