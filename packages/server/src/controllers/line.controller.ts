import { Request, Response } from 'express';
import { Client, WebhookEvent, MessageEvent, TextMessage } from '@line/bot-sdk';
import prisma from '../lib/db.js';
import { generateToken } from '../middleware/auth.js';

async function getLineConfig() {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelSecret || !channelAccessToken) {
    return null;
  }
  
  return {
    channelAccessToken,
    channelSecret,
  };
}

export async function getLineStatus(req: Request, res: Response) {
  const hasSecret = !!process.env.LINE_CHANNEL_SECRET;
  const hasToken = !!process.env.LINE_CHANNEL_ACCESS_TOKEN;
  
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const lineSettings = (settings?.lineSettings as any) || {};

  res.json({
    success: true,
    data: {
      isConfigured: hasSecret && hasToken,
      hasSecret,
      hasToken,
      liffId: lineSettings.liffId || '',
      officialAccountUrl: lineSettings.officialAccountUrl || '',
    }
  });
}

export async function handleWebhook(req: Request, res: Response) {
  const config = await getLineConfig();
  if (!config) {
    console.error('LINE settings not configured');
    return res.status(200).end(); // Always return 200 to LINE if not configured to avoid retries
  }

  const client = new Client(config);
  const events: WebhookEvent[] = req.body.events;

  if (!events || !Array.isArray(events)) {
    return res.status(400).end();
  }

  try {
    await Promise.all(events.map(event => handleEvent(client, event)));
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('LINE Webhook Error:', err);
    res.status(200).end(); // Return 200 to LINE to acknowledge receipt even on error
  }
}

async function handleEvent(client: Client, event: WebhookEvent) {
  const userId = event.source.userId;
  if (!userId) return;

  if (event.type === 'follow') {
    try {
      const profile = await client.getProfile(userId);
      console.log(`User followed: ${profile.displayName} (${userId})`);
      
      // Auto-reply with a greeting and binding instruction
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `您好 ${profile.displayName}！感謝您關注我們的官方帳號。\n\n若要接收訂單通知，請前往網站個人頁面連結您的帳號。`,
      });
    } catch (err) {
      console.error('Error handling follow:', err);
    }
  }

  if (event.type === 'message' && event.message.type === 'text') {
    const text = event.message.text.trim();
    
    if (text.toLowerCase() === 'id') {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `您的 LINE User ID 為:\n${userId}`,
      });
    }
  }
}

export async function bindLine(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const { lineUserId, lineDisplayName } = req.body;
  if (!lineUserId) {
    return res.status(400).json({ success: false, error: 'lineUserId is required' });
  }

  try {
    if (req.user.type === 'customer') {
      await prisma.customer.update({
        where: { id: req.user.id },
        data: { lineUserId, lineDisplayName },
      });
    } else {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { lineUserId, lineDisplayName },
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('LINE Binding Error:', err);
    if (err.code === 'P2002') {
      return res.status(400).json({ success: false, error: '此 LINE 帳號已被其他會員綁定' });
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function unbindLine(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    if (req.user.type === 'customer') {
      await prisma.customer.update({
        where: { id: req.user.id },
        data: { lineUserId: null, lineDisplayName: null },
      });
    } else {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { lineUserId: null, lineDisplayName: null },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('LINE Unbinding Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export async function lineLogin(req: Request, res: Response) {
  const { lineUserId, lineDisplayName, email, name } = req.body;
  if (!lineUserId) {
    return res.status(400).json({ success: false, error: 'lineUserId is required' });
  }

  try {
    // 1. Try to find by lineUserId
    let customer = await prisma.customer.findUnique({ where: { lineUserId } });

    // 2. If not found by ID, but we have an email, try to find by email (Integration!)
    if (!customer && email) {
      customer = await prisma.customer.findUnique({ where: { email } });
      if (customer) {
        // Link the LINE account to the existing account
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: { lineUserId, lineDisplayName: customer.lineDisplayName || lineDisplayName }
        });
      }
    }

    // 3. If still not found, create a new customer
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          lineUserId,
          lineDisplayName,
          email: email || `${lineUserId}@line.pizzastudio.com`, // Fallback if no email permission
          name: name || lineDisplayName || 'LINE User',
          password: null,
          isGuest: false
        }
      });
    }

    // Generate token
    const token = generateToken({
      id: customer.id,
      email: customer.email,
      type: 'customer'
    });

    res.json({ success: true, data: { token, customer: { id: customer.id, email: customer.email, name: customer.name, phone: customer.phone } } });
  } catch (err: any) {
    console.error('LINE Login Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

// Utility to send push messages
export async function sendLinePush(userId: string, message: string) {
  const config = await getLineConfig();
  if (!config) return;

  const client = new Client(config);
  try {
    await client.pushMessage(userId, { type: 'text', text: message });
  } catch (err) {
    console.error('LINE Push Error:', err);
  }
}
