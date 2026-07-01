import { Request, Response } from 'express';
import { Client, WebhookEvent, MessageEvent, TextMessage } from '@line/bot-sdk';
import prisma from '../lib/db.js';
import { generateToken } from '../middleware/auth.js';
import { grantRegistrationBonus } from '../lib/registrationBonus.js';

async function getLineConfig(locationId?: string) {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  
  let channelSecret = process.env.LINE_CHANNEL_SECRET;
  let channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (settings) {
    let lineSettings = (settings.lineSettings as any) || {};
    
    // Check location overrides if locationId is provided
    if (locationId && settings.advancedSettings) {
      const advanced = settings.advancedSettings as any;
      if (advanced.locationOverrides && advanced.locationOverrides[locationId]?.lineSettings) {
        lineSettings = { ...lineSettings, ...advanced.locationOverrides[locationId].lineSettings };
      }
    }

    if (lineSettings.channelSecret) channelSecret = lineSettings.channelSecret;
    if (lineSettings.channelAccessToken) channelAccessToken = lineSettings.channelAccessToken;
  }

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
  const locationId = req.query.locationId as string | undefined;

  if (locationId) {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const advancedSettings = (settings?.advancedSettings as any) || {};
    const overrides = advancedSettings.locationOverrides || {};
    const locationData = overrides[locationId]?.lineSettings || {};
    
    res.json({
      success: true,
      data: {
        isConfigured: hasSecret && hasToken,
        hasSecret,
        hasToken,
        liffId: locationData.liffId || '',
        officialAccountUrl: locationData.officialAccountUrl || '',
      }
    });
    return;
  }
  
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

  // Retrieve LIFF ID & settings for URL fallback
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const lineSettings = (settings?.lineSettings as any) || {};
  const liffId = lineSettings.liffId || '';
  const storefrontUrl = process.env.STORE_URL_PUBLIC || 'http://localhost:5174';
  const liffUrl = liffId ? `https://liff.line.me/${liffId}` : storefrontUrl;

  if (event.type === 'follow') {
    try {
      const profile = await client.getProfile(userId);
      console.log(`User followed: ${profile.displayName} (${userId})`);
      
      await client.replyMessage(event.replyToken, {
        type: 'flex',
        altText: `歡迎關注夏特點餐系統！`,
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#f97316',
            contents: [
              {
                type: 'text',
                text: '夏特點餐系統 🏪',
                color: '#ffffff',
                weight: 'bold',
                size: 'lg',
                align: 'center'
              }
            ]
          },
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'md',
            contents: [
              {
                type: 'text',
                text: `您好 ${profile.displayName}！`,
                weight: 'bold',
                size: 'md'
              },
              {
                type: 'text',
                text: '感謝您關注我們的官方帳號！在這裡您可以享有極致便利的線上點餐、紅利集點與即時訂單追蹤服務。',
                size: 'sm',
                color: '#444444',
                wrap: true
              },
              {
                type: 'text',
                text: '🎁 現在綁定 LINE 帳號，立即可領取會員專屬紅利點數！',
                size: 'xs',
                color: '#ea580c',
                weight: 'bold',
                wrap: true
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#f97316',
                action: {
                  type: 'uri',
                  label: '🚀 開始線上點餐',
                  uri: liffUrl
                }
              },
              {
                type: 'button',
                style: 'secondary',
                action: {
                  type: 'uri',
                  label: '👤 綁定會員領點數',
                  uri: liffId ? `${liffUrl}?redirect=/account` : `${storefrontUrl}/account`
                }
              }
            ]
          }
        }
      });
    } catch (err) {
      console.error('Error handling follow:', err);
    }
  }

  if (event.type === 'message' && event.message.type === 'text') {
    const text = event.message.text.trim().toLowerCase();
    
    if (text === 'id') {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: `您的 LINE User ID 為:\n${userId}`,
      });
      return;
    }

    if (text === '點餐' || text === 'menu' || text === '菜單' || text === '我要點餐') {
      try {
        const categories = await prisma.category.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          take: 10
        });

        if (categories.length === 0) {
          await client.replyMessage(event.replyToken, {
            type: 'flex',
            altText: '歡迎使用線上點餐！',
            contents: {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: '歡迎使用夏特點餐系統！',
                    weight: 'bold',
                    size: 'md'
                  },
                  {
                    type: 'text',
                    text: '點擊下方按鈕即可開啟線上點餐網頁喔！',
                    size: 'sm',
                    margin: 'md',
                    wrap: true
                  }
                ]
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    color: '#f97316',
                    action: {
                      type: 'uri',
                      label: '🚀 開始點餐',
                      uri: liffUrl
                    }
                  }
                ]
              }
            }
          });
          return;
        }

        const bubbles = categories.map(cat => {
          const categoryUrl = liffId 
            ? `${liffUrl}?redirect=/menu/categories/${cat.id}` 
            : `${storefrontUrl}/menu/categories/${cat.id}`;
          return {
            type: 'bubble',
            size: 'micro',
            hero: {
              type: 'image',
              url: cat.image
                ? (cat.image.startsWith('http') ? cat.image : `${(process.env.API_URL_PUBLIC || 'http://localhost:3000').replace(/\/$/, '')}${cat.image}`)
                : 'https://img.freepik.com/free-photo/delicious-pizza-indoors_23-2150873874.jpg',
              size: 'full',
              aspectRatio: '20:13',
              aspectMode: 'cover'
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: cat.name,
                  weight: 'bold',
                  size: 'md',
                  wrap: true
                },
                {
                  type: 'text',
                  text: cat.description || '探索新鮮美味的主題餐點',
                  size: 'xs',
                  color: '#666666',
                  wrap: true,
                  margin: 'sm'
                }
              ]
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  height: 'sm',
                  color: '#f97316',
                  action: {
                    type: 'uri',
                    label: '🚀 立即點餐',
                    uri: categoryUrl
                  }
                }
              ]
            }
          };
        });

        await client.replyMessage(event.replyToken, {
          type: 'flex',
          altText: '美味選單分類展示中',
          contents: {
            type: 'carousel',
            contents: bubbles
          }
        } as any);
      } catch (err) {
        console.error('Error handling category menu:', err);
      }
      return;
    }

    if (text === '查詢' || text === '訂單' || text === 'order') {
      try {
        const customer = await prisma.customer.findUnique({
          where: { lineUserId: userId }
        });

        if (!customer) {
          await client.replyMessage(event.replyToken, {
            type: 'flex',
            altText: '請先綁定會員帳號',
            contents: {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                contents: [
                  {
                    type: 'text',
                    text: '👤 尚未綁定會員帳號',
                    weight: 'bold',
                    size: 'md',
                    color: '#ea580c'
                  },
                  {
                    type: 'text',
                    text: '若要查詢您的歷史訂單或當前外送進度，請先點擊下方連結快速綁定您的 LINE 帳號！',
                    size: 'sm',
                    color: '#444444',
                    wrap: true
                  }
                ]
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    color: '#f97316',
                    action: {
                      type: 'uri',
                      label: '🔗 立即綁定領紅利',
                      uri: liffId ? `${liffUrl}?redirect=/account` : `${storefrontUrl}/account`
                    }
                  }
                ]
              }
            }
          });
          return;
        }

        const activeOrder = await prisma.order.findFirst({
          where: {
            customerId: customer.id,
            NOT: { status: { in: ['DELIVERED', 'CANCELLED', 'PICKED_UP'] } }
          },
          orderBy: { createdAt: 'desc' },
          include: { items: true, location: true }
        });

        if (!activeOrder) {
          await client.replyMessage(event.replyToken, {
            type: 'flex',
            altText: '目前沒有活躍訂單',
            contents: {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                contents: [
                  {
                    type: 'text',
                    text: '🔍 查無進行中的訂單',
                    weight: 'bold',
                    size: 'md'
                  },
                  {
                    type: 'text',
                    text: '您目前沒有正在製作或外送中的訂單。快去逛逛我們的美味選單吧！',
                    size: 'sm',
                    color: '#666666',
                    wrap: true
                  }
                ]
              },
              footer: {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'button',
                    style: 'primary',
                    color: '#f97316',
                    action: {
                      type: 'uri',
                      label: '🚀 開始點餐',
                      uri: liffUrl
                    }
                  }
                ]
              }
            }
          });
          return;
        }

        const statusMap: Record<string, { text: string; icon: string }> = {
          PENDING: { text: '待處理', icon: '📝' },
          CONFIRMED: { text: '已確認', icon: '✅' },
          PREPARING: { text: '製作中', icon: '👨‍🍳' },
          READY: { text: '可取餐', icon: '🎉' },
          OUT_FOR_DELIVERY: { text: '外送中', icon: '🛵' },
          DELIVERED: { text: '已送達', icon: '🍽️' },
          PICKED_UP: { text: '已取餐', icon: '🍽️' },
          CANCELLED: { text: '已取消', icon: '❌' },
        };

        const statusInfo = statusMap[activeOrder.status] || { text: activeOrder.status, icon: '🔄' };
        
        const itemLines = activeOrder.items.slice(0, 3).map(item => ({
          type: 'text',
          text: `• ${item.quantity}x ${item.name}`,
          size: 'xs',
          color: '#555555'
        }));

        if (activeOrder.items.length > 3) {
          itemLines.push({
            type: 'text',
            text: `• 以及其他 ${activeOrder.items.length - 3} 項餐點...`,
            size: 'xs',
            color: '#888888'
          });
        }

        const orderTrackingUrl = liffId 
          ? `${liffUrl}?redirect=/orders/${activeOrder.id}` 
          : `${storefrontUrl}/orders/${activeOrder.id}`;

        await client.replyMessage(event.replyToken, {
          type: 'flex',
          altText: `您的訂單 #${activeOrder.orderNumber} 狀態追蹤`,
          contents: {
            type: 'bubble',
            header: {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#f97316',
              contents: [
                {
                  type: 'text',
                  text: '訂單狀態追蹤 📦',
                  color: '#ffffff',
                  weight: 'bold',
                  size: 'md'
                }
              ]
            },
            body: {
              type: 'box',
              layout: 'vertical',
              spacing: 'md',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '訂單編號',
                      size: 'sm',
                      color: '#888888'
                    },
                    {
                      type: 'text',
                      text: `#${activeOrder.orderNumber}`,
                      size: 'sm',
                      align: 'end',
                      weight: 'bold'
                    }
                  ]
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '當前狀態',
                      size: 'sm',
                      color: '#888888'
                    },
                    {
                      type: 'text',
                      text: `${statusInfo.icon} ${statusInfo.text}`,
                      size: 'sm',
                      align: 'end',
                      weight: 'bold',
                      color: '#ea580c'
                    }
                  ]
                },
                {
                  type: 'separator',
                  margin: 'md'
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'xs',
                  contents: [
                    {
                      type: 'text',
                      text: '餐點明細：',
                      size: 'xs',
                      color: '#aaaaaa',
                      weight: 'bold'
                    },
                    ...itemLines
                  ]
                },
                {
                  type: 'separator',
                  margin: 'md'
                },
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    {
                      type: 'text',
                      text: '結帳總額',
                      size: 'sm',
                      weight: 'bold'
                    },
                    {
                      type: 'text',
                      text: `$${activeOrder.total.toFixed(2)}`,
                      size: 'sm',
                      align: 'end',
                      weight: 'bold'
                    }
                  ]
                }
              ]
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  color: '#f97316',
                  action: {
                    type: 'uri',
                    label: '📦 前往網頁即時追蹤',
                    uri: orderTrackingUrl
                  }
                }
              ]
            }
          }
        } as any);
      } catch (err) {
        console.error('Error handling order tracking:', err);
      }
      return;
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
    // 1. Check if this LINE ID is already used by someone else
    const existing = await (req.user.type === 'customer' 
      ? prisma.customer.findUnique({ where: { lineUserId } })
      : prisma.user.findUnique({ where: { lineUserId } }));

    if (existing && existing.id !== req.user.id) {
      return res.status(400).json({ success: false, error: '此 LINE 帳號已被其他會員連結，請先解除該帳號的連結。' });
    }

    // 2. Proceed with binding
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
    console.error('[LINE Login] Missing lineUserId in request body');
    return res.status(400).json({ success: false, error: 'lineUserId is required' });
  }

  try {
    console.log(`[LINE Login] Attempting login for: ${lineDisplayName} (${lineUserId}), Email: ${email}`);

    // 1. Try to find by lineUserId (Strongest match)
    let customer = await prisma.customer.findUnique({ where: { lineUserId } });

    if (customer) {
      console.log(`[LINE Login] Found existing customer by lineUserId: ${customer.id}`);
    } else {
      // 2. If not found by ID, try to find by email
      if (email && email.trim() !== "") {
        console.log(`[LINE Login] User ID not found, searching by email: ${email}`);
        customer = await prisma.customer.findUnique({ where: { email } });
        
        if (customer) {
          if (customer.lineUserId && customer.lineUserId !== lineUserId) {
            console.warn(`[LINE Login] Email ${email} is already bound to another LINE ID`);
            customer = null; // Don't link, create a new one instead
          } else {
            console.log(`[LINE Login] Linking existing email account ${email} to LINE ID ${lineUserId}`);
            customer = await prisma.customer.update({
              where: { id: customer.id },
              data: { lineUserId, lineDisplayName: customer.lineDisplayName || lineDisplayName }
            });
          }
        }
      }
    }

    // 3. AUTO-REGISTRATION: If still no customer, create one immediately
    if (!customer) {
      console.log(`[LINE Login] AUTO-REGISTERING new customer for LINE ID ${lineUserId}`);
      
      // Safety check: Does this email already exist in our DB? 
      // (Even if it wasn't linked to LINE before, we can't create a duplicate email)
      if (email && email.trim() !== "") {
        const emailExists = await prisma.customer.findUnique({ where: { email } });
        if (emailExists) {
          console.warn(`[LINE Login] Email ${email} already exists. Redirecting to link/login instead.`);
          return res.status(400).json({ 
            success: false, 
            error: '此 Email 已被註冊，請先使用帳號密碼登入後，再於會員中心綁定 LINE。' 
          });
        }
      }

      const customerEmail = (email && email.trim() !== "") ? email : null;
      
      customer = await prisma.customer.create({
        data: {
          lineUserId,
          lineDisplayName,
          email: customerEmail,
          name: name || lineDisplayName || 'LINE User',
          password: null,
          isGuest: false
        }
      });
      
      // Grant registration bonus
      await grantRegistrationBonus(customer.id, 'line', lineUserId);
    }

    // 4. ALWAYS GENERATE TOKEN (Fixes "TOKEN not found" error)
    const token = generateToken({
      id: customer.id,
      email: customer.email,
      type: 'customer'
    });

    console.log(`[LINE Login] Success! Returning token for user ${customer.id}`);
    res.json({ 
      success: true, 
      data: { 
        token, 
        customer: { 
          id: customer.id, 
          email: customer.email, 
          name: customer.name, 
          lineUserId: customer.lineUserId 
        } 
      } 
    });
  } catch (err: any) {
    console.error('[LINE Login Error]:', err);
    res.status(500).json({ success: false, error: '登入失敗，請稍後再試。' });
  }
}

// Utility to send push messages
export async function sendLinePush(userId: string, message: string, locationId?: string) {
  const config = await getLineConfig(locationId);
  if (!config) {
    console.log('[LINE Notify] sendLinePush skipped: LINE config not found for location', locationId || 'default');
    return;
  }

  const client = new Client(config);
  try {
    await client.pushMessage(userId, { type: 'text', text: message });
  } catch (err) {
    console.error('LINE Push Error:', err);
  }
}
