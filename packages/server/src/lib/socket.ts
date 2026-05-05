import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const expo = new Expo();

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
      methods: ["GET", "POST"],
      credentials: true,
    },
    allowEIO3: true // Support older clients if any
  });

  io.on('connection', (socket: Socket) => {
    // Join order-specific room for customers tracking their order
    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('leave:order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    // Join kitchen room for staff viewing kitchen display
    socket.on('join:kitchen', () => {
      socket.join('kitchen');
    });

    socket.on('leave:kitchen', () => {
      socket.leave('kitchen');
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function emitOrderStatusUpdate(order: {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  customerId?: string | null;
}): void {
  if (!io) return;
  // Notify the specific order room (customer tracking)
  io.to(`order:${order.id}`).emit('order:statusUpdate', order);
  // Notify the kitchen display
  io.to('kitchen').emit('order:statusUpdate', order);

  // Send push notification to the customer
  if (order.customerId) {
    sendPushNotification(order.customerId, order.orderNumber, order.status).catch(() => {});
  }
}

async function sendPushNotification(
  customerId: string,
  orderNumber: string,
  status: string,
): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { expoPushToken: true },
  });

  if (!customer?.expoPushToken || !Expo.isExpoPushToken(customer.expoPushToken)) {
    return;
  }

  const statusLabels: Record<string, string> = {
    CONFIRMED: 'confirmed',
    PREPARING: 'being prepared',
    READY: 'ready',
    OUT_FOR_DELIVERY: 'out for delivery',
    DELIVERED: 'delivered',
    PICKED_UP: 'picked up',
    CANCELLED: 'cancelled',
  };

  const statusLabel = statusLabels[status] || status.toLowerCase();

  const message: ExpoPushMessage = {
    to: customer.expoPushToken,
    title: `Order #${orderNumber}`,
    body: `Your order is ${statusLabel}.`,
    data: { orderId: customerId, status },
    sound: 'default',
  };

  await expo.sendPushNotificationsAsync([message]);
}

export function emitNewOrder(order: {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
}): void {
  if (!io) return;
  io.to('kitchen').emit('order:new', order);
}
