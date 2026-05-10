import { Request, Response } from 'express';
import { z } from 'zod';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/db.js';
import { emitNewOrder, emitOrderStatusUpdate } from '../lib/socket.js';
import { isPointInPolygon } from '../lib/geo.js';
import { calculateDistance } from '@kitchenasty/shared';
import { sendEmail, orderConfirmationEmail, orderStatusEmail } from '../lib/email.js';
import { auditLog } from '../lib/audit.js';

const orderItemOptionSchema = z.object({
  menuOptionValueId: z.string().min(1),
  name: z.string().min(1),
  value: z.string().min(1),
  priceModifier: z.number(),
});

const orderItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1),
  comment: z.string().optional(),
  options: z.array(orderItemOptionSchema).optional(),
});

const createOrderSchema = z.object({
  orderType: z.enum(['DELIVERY', 'PICKUP']),
  items: z.array(orderItemSchema).min(1),
  comment: z.string().optional(),
  scheduledAt: z.string().optional(),
  couponCode: z.string().optional(),
  address: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    zip: z.string().min(1),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional().or(z.literal('')),
  guestPhone: z.string().optional(),
  loyaltyPointsRedeem: z.number().int().min(0).optional(),
  userLat: z.number().optional(),
  userLon: z.number().optional(),
  locationId: z.string().optional(),
});

function generateOrderNumber(): string {
  const prefix = 'KA';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { 
    orderType, items, comment, scheduledAt, address, 
    guestName, guestEmail, guestPhone, loyaltyPointsRedeem,
    userLat, userLon, locationId
  } = parsed.data;

  if (orderType === 'DELIVERY' && !address) {
    res.status(400).json({ success: false, error: 'Delivery address is required' });
    return;
  }

  // Get customer ID from auth if available
  const customerId = (req as any).user?.type === 'customer' ? (req as any).user.id : null;

  // Guest checkout: default name to 'Guest' if not provided
  const finalGuestName = guestName || 'Guest';

  // Validate scheduledAt
  if (scheduledAt) {
    const scheduled = new Date(scheduledAt);
    const now = new Date();
    const minTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 min in future
    const maxTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days out

    if (isNaN(scheduled.getTime())) {
      res.status(400).json({ success: false, error: 'Invalid scheduledAt date' });
      return;
    }
    if (scheduled < minTime) {
      res.status(400).json({ success: false, error: 'Scheduled time must be at least 30 minutes in the future' });
      return;
    }
    if (scheduled > maxTime) {
      res.status(400).json({ success: false, error: 'Scheduled time cannot be more than 7 days in the future' });
      return;
    }
  }

  // Get location (specified or default)
  const location = await prisma.location.findFirst({
    where: { 
      ...(locationId ? { id: locationId } : { isActive: true })
    },
    include: { operatingHours: true },
  });
  if (!location) {
    res.status(400).json({ success: false, error: locationId ? 'Specified location not found' : 'No active location found' });
    return;
  }

  // Check busy mode
  if (location.isBusy) {
    res.status(400).json({
      success: false,
      error: location.busyMessage || 'This location is currently not accepting orders. Please try again later.',
    });
    return;
  }

  // Validate scheduledAt is within operating hours
  if (scheduledAt && location.operatingHours.length > 0) {
    const scheduled = new Date(scheduledAt);
    const dayOfWeek = scheduled.getDay();
    const timeStr = `${String(scheduled.getHours()).padStart(2, '0')}:${String(scheduled.getMinutes()).padStart(2, '0')}`;
    const dayHours = location.operatingHours.find((h) => h.dayOfWeek === dayOfWeek);
    if (!dayHours || dayHours.isClosed) {
      res.status(400).json({ success: false, error: 'Location is closed on the scheduled day' });
      return;
    }
    if (timeStr < dayHours.openTime || timeStr >= dayHours.closeTime) {
      res.status(400).json({ success: false, error: `Scheduled time must be within operating hours (${dayHours.openTime} - ${dayHours.closeTime})` });
      return;
    }
  }

  // Delivery zone enforcement
  try {
    let deliveryFee = 0;
  if (orderType === 'DELIVERY') {
    if (address?.lat != null && address?.lng != null) {
      const zones = await prisma.deliveryZone.findMany({
        where: { locationId: location.id, isActive: true },
      });

      let matchedZone = null;
      for (const zone of zones) {
        if (zone.boundaries && Array.isArray(zone.boundaries)) {
          if (isPointInPolygon(address.lat, address.lng, zone.boundaries as [number, number][])) {
            matchedZone = zone;
            break;
          }
        }
      }

      if (zones.length > 0 && !matchedZone) {
        res.status(400).json({ success: false, error: 'Delivery address is outside our delivery zones' });
        return;
      }

      if (matchedZone) {
        deliveryFee = matchedZone.charge;
      } else {
        deliveryFee = 4.99; // Fallback if no zones configured
      }
    } else {
      // No coordinates provided — use fallback or first zone's charge
      const defaultZone = await prisma.deliveryZone.findFirst({
        where: { locationId: location.id, isActive: true },
        orderBy: { charge: 'asc' },
      });
      deliveryFee = defaultZone ? defaultZone.charge : 4.99;
    }
  }

  // Fetch menu items to validate and get prices
  const menuItemIds = items.map((i) => i.menuItemId);
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: menuItemIds } },
    include: {
      options: { include: { values: true } },
    },
  });

  const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

  // Validate all items exist and are active
  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId);
    if (!menuItem) {
      res.status(400).json({ success: false, error: `Menu item not found: ${item.menuItemId}` });
      return;
    }
    if (!menuItem.isActive) {
      res.status(400).json({ success: false, error: `Menu item is not available: ${menuItem.name}` });
      return;
    }
    if (menuItem.trackStock && menuItem.stockQty < item.quantity) {
      res.status(400).json({ success: false, error: `Insufficient stock for: ${menuItem.name}` });
      return;
    }
  }

  // Calculate totals and validate options
  let subtotal = 0;
  
  // Fetch all option values in one go for efficiency
  const allOptionValueIds = items.flatMap(i => (i.options || []).map(o => o.menuOptionValueId)).filter(Boolean);
  const dbOptionValues = await prisma.menuOptionValue.findMany({
    where: { id: { in: allOptionValueIds } }
  });
  const optionValueMap = new Map(dbOptionValues.map(v => [v.id, v]));

  const orderItemsData = items.map((item) => {
    const menuItem = menuItemMap.get(item.menuItemId)!;
    let unitPrice = menuItem.price;

    const optionsData = (item.options || []).map((opt) => {
      // SECURITY: Get actual price from DB, not from client request
      const dbValue = optionValueMap.get(opt.menuOptionValueId);
      const actualModifier = dbValue ? dbValue.priceModifier : 0;
      
      unitPrice += actualModifier;
      
      return {
        menuOptionValueId: opt.menuOptionValueId,
        name: dbValue ? dbValue.name : opt.name,
        value: dbValue ? dbValue.name : opt.value,
        priceModifier: actualModifier,
      };
    });

    const itemSubtotal = unitPrice * item.quantity;
    subtotal += itemSubtotal;

    return {
      menuItemId: item.menuItemId,
      name: menuItem.name,
      quantity: item.quantity,
      unitPrice,
      subtotal: itemSubtotal,
      comment: item.comment,
      options: { create: optionsData },
    };
  });

  // Loyalty points redemption
  let loyaltyDiscount = 0;
  if (loyaltyPointsRedeem && loyaltyPointsRedeem > 0 && customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || customer.loyaltyPoints < loyaltyPointsRedeem) {
      res.status(400).json({ success: false, error: 'Insufficient loyalty points' });
      return;
    }
    // 100 points = $1
    loyaltyDiscount = loyaltyPointsRedeem / 100;
  }

  // Check minimum order for delivery zone
  if (orderType === 'DELIVERY' && address?.lat != null && address?.lng != null) {
    const zones = await prisma.deliveryZone.findMany({
      where: { locationId: location.id, isActive: true },
    });
    for (const zone of zones) {
      if (zone.boundaries && Array.isArray(zone.boundaries)) {
        if (isPointInPolygon(address.lat, address.lng, zone.boundaries as [number, number][])) {
          if (subtotal < zone.minOrder) {
            res.status(400).json({
              success: false,
              error: `Mindestbestellwert für diese Lieferzone: ${zone.minOrder.toFixed(2)} €`,
            });
            return;
          }
          break;
        }
      }
    }
  }

  // Fetch site settings for tax rate
  const siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const orderSettings = (siteSettings?.orderSettings as any) || {};
  let currentTaxRate = orderSettings.taxRate !== undefined ? Number(orderSettings.taxRate) : 0;
  if (isNaN(currentTaxRate)) currentTaxRate = 0;

  const tax = subtotal * (currentTaxRate / 100);
  const total = subtotal + tax + deliveryFee - loyaltyDiscount;

  if (isNaN(total)) {
    res.status(400).json({ success: false, error: 'Calculation error: invalid amounts' });
    return;
  }

  // Calculate distance and tag remote status
  let distance: number | null = null;
  let isRemote = false;
  if (userLat != null && userLon != null && location.lat != null && location.lng != null) {
    const calculated = calculateDistance(userLat, userLon, location.lat, location.lng);
    if (!isNaN(calculated)) {
      distance = calculated;
      isRemote = distance > 20; // 20 meter threshold
    }
  }

  // Generate pickup number (001-999 loop)
  const lastOrder = await prisma.order.findFirst({
    where: { locationId: location.id },
    orderBy: { createdAt: 'desc' },
    select: { pickupNumber: true },
  });

  let nextPickup = 1;
  if (lastOrder?.pickupNumber) {
    const lastNum = parseInt(lastOrder.pickupNumber, 10);
    if (!isNaN(lastNum)) {
      nextPickup = (lastNum % 999) + 1;
    }
  }
  const pickupNumber = String(nextPickup).padStart(3, '0');

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      pickupNumber,
      customerId,
      locationId: location.id,
      orderType,
      subtotal,
      tax,
      deliveryFee,
      discount: loyaltyDiscount,
      total,
      comment,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      guestName: customerId ? undefined : finalGuestName,
      guestEmail: customerId ? undefined : guestEmail,
      guestPhone: customerId ? undefined : guestPhone,
      userLat,
      userLon,
      distance,
      isRemote,
      items: { create: orderItemsData },
    },
    include: {
      items: { include: { options: true } },
      customer: { select: { id: true, name: true, email: true } },
    },
  });

  // Decrement stock for tracked items
  for (const item of items) {
    const menuItem = menuItemMap.get(item.menuItemId)!;
    if (menuItem.trackStock) {
      await prisma.menuItem.update({
        where: { id: item.menuItemId },
        data: { stockQty: { decrement: item.quantity } },
      });
    }
  }

  // Earn loyalty points (1 point per $1 spent)
  if (customerId) {
    const pointsEarned = Math.floor(subtotal);
    if (pointsEarned > 0) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: { increment: pointsEarned } },
      });
      await prisma.loyaltyTransaction.create({
        data: {
          customerId,
          type: 'EARN',
          points: pointsEarned,
          description: `Earned from order #${order.orderNumber}`,
          orderId: order.id,
        },
      });
    }

    // Redeem loyalty points
    if (loyaltyPointsRedeem && loyaltyPointsRedeem > 0) {
      await prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: { decrement: loyaltyPointsRedeem } },
      });
      await prisma.loyaltyTransaction.create({
        data: {
          customerId,
          type: 'REDEEM',
          points: -loyaltyPointsRedeem,
          description: `Redeemed on order #${order.orderNumber}`,
          orderId: order.id,
        },
      });
    }
  }

  // Send confirmation email if enabled
  const recipientEmail = order.customer?.email || guestEmail;
  if (recipientEmail) {
    let shouldSend = true;
    try {
      const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
      const orderSettings = (settings?.orderSettings as any) || {};
      const notifications = orderSettings.emailNotifications || {};
      if (notifications['PLACED'] === false) {
        shouldSend = false;
      }
    } catch (e) {}

    if (shouldSend) {
      const emailContent = orderConfirmationEmail({
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        total: order.total,
        items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, subtotal: i.subtotal })),
      });
      sendEmail({ to: recipientEmail, ...emailContent }).catch(() => {});
    }
  }

  emitNewOrder({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    orderType: order.orderType,
  });

  // Emit event for automation rules
  try {
    const { appEvents } = await import('../lib/events.js');
    appEvents.emit('order.created', { order });
  } catch {}
    res.status(201).json({ success: true, data: order });
  } catch (err: any) {
    console.error('Error creating order:', err);
    res.status(500).json({ 
      success: false, 
      error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred while processing your order' 
    });
  }
}


export async function listOrders(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  const orderType = req.query.orderType as string | undefined;

  const includeItems = req.query.includeItems === 'true';

  const where: Record<string, unknown> = {};
  if (status) {
    const statuses = status.split(',').map((s) => s.trim()).filter(Boolean);
    where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  }
  if (orderType) where.orderType = orderType;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        location: { select: { id: true, name: true } },
        _count: { select: { items: true } },
        ...(includeItems ? { items: { include: { options: true } } } : {}),
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getOrder(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      location: { select: { id: true, name: true } },
      items: {
        include: {
          menuItem: { select: { id: true, name: true, nameTranslations: true, slug: true } },
          options: {
            include: {
              menuOptionValue: { select: { id: true, nameTranslations: true } }
            }
          },
        },
      },
    },
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const user = req.user;
  if (order.customerId) {
    if (!user || (user.type !== 'staff' && order.customerId !== user.id)) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }
  }

  res.json({ success: true, data: order });
}

export async function listCustomerOrders(req: Request, res: Response): Promise<void> {
  const customerId = req.user?.id;
  if (!customerId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const where = { customerId };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        location: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function updateOrderStatus(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'PICKED_UP', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { 
      customer: { 
        select: { 
          email: true, 
          lineUserId: true,
          name: true
        } 
      } 
    },
  });
  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status },
    include: {
      items: { include: { options: true } },
    },
  });

  auditLog(req, { action: 'update', entity: 'Order', entityId: id, details: { status, previousStatus: order.status } });

  emitOrderStatusUpdate({
    id: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
    orderType: updated.orderType,
    customerId: updated.customerId,
  });

  // Send status update email if enabled in settings
  const recipientEmail = order.customer?.email || order.guestEmail;
  if (recipientEmail) {
    let shouldSend = true;
    try {
      const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
      const orderSettings = (settings?.orderSettings as any) || {};
      const notifications = orderSettings.emailNotifications || {};
      if (notifications[status] === false) {
        shouldSend = false;
      }
    } catch (e) {}

    if (shouldSend) {
      const emailContent = orderStatusEmail({ orderNumber: order.orderNumber, status });
      sendEmail({ to: recipientEmail, ...emailContent }).catch(() => {});
    }
  }

  // Send LINE push notification if customer has bound LINE account
  console.log(`[LINE Notify] Checking notification for Order #${order.orderNumber}. Status: ${status}`);
  if (order.customer?.lineUserId) {
    try {
      console.log(`[LINE Notify] Found lineUserId: ${order.customer.lineUserId} for customer: ${order.customer.name}`);
      const { sendLinePush } = await import('./line.controller.js');
      const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
      
      if (!settings) {
        console.error('[LINE Notify] Could not find SiteSettings with ID "default"');
      }

      const lineSettings = (settings?.lineSettings as any) || {};
      const lineNotifications = lineSettings.notifications || {};
      
      const defaultStatusMap: Record<string, string> = {
        'CONFIRMED': '您的訂單已確認，我們將盡快為您準備餐點。',
        'PREPARING': '您的餐點正在製作中！',
        'READY': '🎉 餐點已準備就緒！歡迎前往取貨。',
        'OUT_FOR_DELIVERY': '🚀 您的餐點已由外送員取走，正在前往您的地址！',
        'DELIVERED': '🍽️ 您的餐點已送達，祝您用餐愉快！',
        'CANCELLED': '您的訂單已被取消。如有任何疑問，請聯繫我們。'
      };

      // Check if this status has a specific setting in lineSettings
      const statusConfig = lineNotifications[status];
      const isEnabled = statusConfig ? statusConfig.enabled !== false : !!defaultStatusMap[status];
      const customMessage = statusConfig?.message || defaultStatusMap[status];

      console.log(`[LINE Notify] isEnabled: ${isEnabled}, customMessage: ${customMessage}`);

      if (isEnabled && customMessage) {
        const lineMessage = `【訂單狀態更新】\n訂單編號：#${order.orderNumber}\n目前狀態：${customMessage}`;
        console.log(`[LINE Notify] Sending message to LINE...`);
        sendLinePush(order.customer.lineUserId, lineMessage).then(() => {
          console.log('[LINE Notify] sendLinePush call completed');
        }).catch(err => {
          console.error('[LINE Notify] sendLinePush FAILED:', err);
        });
      } else {
        console.log(`[LINE Notify] Notification skipped: isEnabled=${isEnabled}, hasMessage=${!!customMessage}`);
      }
    } catch (err) {
      console.error('[LINE Notify] CRITICAL ERROR in notification logic:', err);
    }
  } else {
    console.log('[LINE Notify] Customer has no bound lineUserId. Skipping.');
  }

  // Emit event for automation rules
  try {
    const { appEvents } = await import('../lib/events.js');
    appEvents.emit('order.statusChanged', { order: updated, previousStatus: order.status });
  } catch {}

  res.json({ success: true, data: updated });
}

export async function cancelOrder(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const user = req.user;

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  // Only allowed to cancel if status is PENDING
  if (order.status !== 'PENDING') {
    res.status(400).json({ success: false, error: 'Only pending orders can be cancelled' });
    return;
  }

  // Permission check
  let isOwner = false;
  if (user) {
    if (user.type === 'staff') {
      isOwner = true; // Staff can always cancel
    } else if (order.customerId === user.id) {
      isOwner = true;
    }
  } else {
    // For guests, we rely on the fact they have the unique order ID (CUID)
    // and that the order is a guest order.
    if (!order.customerId) {
      isOwner = true; 
    }
  }

  if (!isOwner) {
    res.status(403).json({ success: false, error: 'You do not have permission to cancel this order' });
    return;
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });

  auditLog(req, { action: 'update', entity: 'Order', entityId: id, details: { status: 'CANCELLED', previousStatus: order.status, cancelledBy: user ? 'user' : 'guest' } });

  emitOrderStatusUpdate({
    id: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
    orderType: updated.orderType,
    customerId: updated.customerId,
  });

  res.json({ success: true, data: updated });
}

export async function deleteOrder(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  // Delete associated items and options first (if not handled by cascade)
  // Our schema usually handles this with onDelete: Cascade, but let's be safe or just delete the order
  await prisma.order.delete({
    where: { id },
  });

  auditLog(req, { action: 'delete', entity: 'Order', entityId: id, details: { orderNumber: order.orderNumber } });

  res.json({ success: true, message: 'Order deleted successfully' });
}

export async function exportOrders(req: Request, res: Response): Promise<void> {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    res.status(400).json({ success: false, error: 'Start date and end date are required' });
    return;
  }

  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  end.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      customer: { select: { name: true, email: true } },
      location: { select: { name: true } },
      items: {
        include: {
          options: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const exportData = orders.map((order) => ({
    'Order Number': order.orderNumber,
    'Date': order.createdAt.toLocaleString(),
    'Customer': order.customer?.name || order.guestName || 'Guest',
    'Email': order.customer?.email || order.guestEmail || '',
    'Type': order.orderType,
    'Status': order.status,
    'Location': order.location.name,
    'Subtotal': order.subtotal,
    'Tax': order.tax,
    'Delivery Fee': order.deliveryFee,
    'Discount': order.discount,
    'Total': order.total,
    'Items Count': order.items.length,
    'Items Details': order.items.map(i => `${i.name} x${i.quantity}`).join(', '),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', `attachment; filename="orders_${startDate}_${endDate}.xlsx"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}

export async function downloadOrderTemplate(req: Request, res: Response): Promise<void> {
  const templateData = [
    {
      'Order Number': 'KA-SAMPLE-001',
      'Date': new Date().toISOString().split('T')[0],
      'Customer': '王小明',
      'Email': 'customer@example.com',
      'Phone': '0912345678',
      'Type': 'PICKUP',
      'Status': 'DELIVERED',
      'Location': 'Main Store',
      'Total': 100.00,
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateData);
  XLSX.utils.book_append_sheet(wb, ws, 'Template');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="order_import_template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
}

export async function importOrders(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Get all locations for mapping
    const locations = await prisma.location.findMany();
    const locationMap = new Map(locations.map(l => [l.name.toLowerCase(), l.id]));

    for (const row of data) {
      try {
        const orderNumber = row['Order Number'] || row['orderNumber'] || generateOrderNumber();
        const total = parseFloat(row['Total'] || row['total'] || '0');
        const orderType = (row['Type'] || row['orderType'] || 'PICKUP').toUpperCase() as any;
        const status = (row['Status'] || row['status'] || 'DELIVERED').toUpperCase() as any;
        const createdAt = row['Date'] || row['createdAt'] ? new Date(row['Date'] || row['createdAt']) : new Date();
        const locationName = row['Location'] || row['locationName'];
        
        let locationId = row['locationId'];
        if (!locationId && locationName) {
          locationId = locationMap.get(locationName.toLowerCase());
        }

        if (!locationId) {
          if (locations.length > 0) {
            locationId = locations[0].id;
          } else {
            throw new Error(`Location not found: ${locationName}`);
          }
        }

        const guestName = row['Customer'] || row['guestName'] || 'Imported Guest';
        const guestEmail = row['Email'] || row['guestEmail'];
        const guestPhone = row['Phone'] || row['guestPhone'];

        const order = await prisma.order.create({
          data: {
            orderNumber,
            total,
            subtotal: total, // Simple mapping
            orderType,
            status,
            createdAt,
            locationId,
            guestName,
            guestEmail,
            guestPhone,
            items: {
              create: {
                name: 'Imported Order Item',
                quantity: 1,
                unitPrice: total,
                subtotal: total,
                menuItemId: (await prisma.menuItem.findFirst())?.id || 'placeholder',
              }
            }
          }
        });

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Row ${results.success + results.failed}: ${err.message}`);
      }
    }

    auditLog(req, { action: 'create', entity: 'Order', details: { action: 'bulk_import', ...results } });

    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
// ============================================================
// ORDER STATUS REMINDERS
// ============================================================

export async function checkOrderReminders(req: Request, res: Response): Promise<void> {
  // Find orders that are PENDING or CONFIRMED for more than 15 mins
  // Or READY for more than 30 mins
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

  const staleOrders = await prisma.order.findMany({
    where: {
      OR: [
        { status: 'PENDING', createdAt: { lt: fifteenMinsAgo } },
        { status: 'CONFIRMED', createdAt: { lt: fifteenMinsAgo } },
        { status: 'READY', updatedAt: { lt: thirtyMinsAgo } },
      ],
    },
    include: {
      customer: { select: { email: true, name: true } },
    }
  });

  if (staleOrders.length === 0) {
    res.json({ success: true, data: { message: 'No stale orders found', count: 0 } });
    return;
  }

  const results = await Promise.allSettled(
    staleOrders.map(order => {
      const email = order.customer?.email || order.guestEmail;
      if (!email) return Promise.resolve();

      let message = '';
      if (order.status === 'READY') {
        message = `Your order #${order.orderNumber} is ready for pickup! Please come and get it.`;
      } else {
        message = `We are still working on your order #${order.orderNumber}. We apologize for the delay and will update you soon!`;
      }

      return sendEmail({
        to: email,
        subject: `Update on your order #${order.orderNumber}`,
        text: message,
        html: `<p>${message}</p>`
      });
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;

  auditLog(req, { 
    action: 'update', 
    entity: 'Order', 
    details: { action: 'status_reminders', count: staleOrders.length, successful } 
  });

  res.json({
    success: true,
    data: {
      message: `Sent reminders for ${successful} orders`,
      totalStale: staleOrders.length,
      successful
    }
  });
}

export async function lookupOrder(req: Request, res: Response): Promise<void> {
  const { email, orderNumber } = req.query;

  if (!email || !orderNumber) {
    res.status(400).json({ success: false, error: 'Email and order number are required' });
    return;
  }

  const order = await prisma.order.findFirst({
    where: {
      orderNumber: orderNumber as string,
      OR: [
        { guestEmail: email as string },
        { customer: { email: email as string } }
      ]
    },
    select: {
      id: true,
      orderNumber: true,
      customerId: true,
      createdAt: true,
      total: true,
      orderType: true
    }
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found with these details' });
    return;
  }

  res.json({ success: true, data: order });
}

export async function claimOrder(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const customerId = req.user?.id;

  if (!customerId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const order = await prisma.order.findUnique({
    where: { id },
  });

  if (!order) {
    res.status(404).json({ success: false, error: 'Order not found' });
    return;
  }

  if (order.customerId) {
    res.status(400).json({ success: false, error: 'Order is already linked to an account' });
    return;
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: { customerId },
  });

  auditLog(req, { action: 'update', entity: 'Order', entityId: id, details: { action: 'claim', customerId } });

  res.json({ success: true, data: updatedOrder });
}


