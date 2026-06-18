import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const expo = new Expo();

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map(s => s.trim().replace(/\/$/, '')) || [
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:3000',
    'https://admin-panel-production-7660.up.railway.app',
    'https://storefront-production-31e8.up.railway.app'
  ];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || corsOrigins.includes('*')) {
          return callback(null, true);
        }
        const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('10.');
        const isAllowed = corsOrigins.includes(origin) || isLocal;
        if (isAllowed) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
    allowEIO3: true,
    transports: ['polling', 'websocket']
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
    socket.on('join:kitchen', (data?: { locationId?: string }) => {
      if (data?.locationId) {
        socket.join(`kitchen:${data.locationId}`);
      } else {
        socket.join('kitchen');
      }
    });

    socket.on('leave:kitchen', (data?: { locationId?: string }) => {
      if (data?.locationId) {
        socket.leave(`kitchen:${data.locationId}`);
      } else {
        socket.leave('kitchen');
      }
    });

    // Join chat room for admins
    socket.on('join:chat', () => {
      socket.join('admin:chat');
    });

    socket.on('leave:chat', () => {
      socket.leave('admin:chat');
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
  locationId?: string;
  paymentStatus?: string | null;
}): void {
  if (!io) return;
  // Notify the specific order room (customer tracking)
  io.to(`order:${order.id}`).emit('order:statusUpdate', order);
  
  // Notify the kitchen displays
  if (order.locationId) {
    io.to(`kitchen:${order.locationId}`).emit('order:statusUpdate', order);
  }
  io.to('kitchen').emit('order:statusUpdate', order);

  // Send push notification to the customer
  if (order.customerId) {
    sendPushNotification(order.customerId, order.orderNumber, order.status).catch(() => { });
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
  locationId?: string;
  paymentStatus?: string | null;
}): void {
  if (!io) return;
  if (order.locationId) {
    io.to(`kitchen:${order.locationId}`).emit('order:new', order);
  }
  io.to('kitchen').emit('order:new', order);
}

export function emitChatMessage(message: any): void {
  if (!io) return;
  io.to('admin:chat').emit('chat:newMessage', message);
}
