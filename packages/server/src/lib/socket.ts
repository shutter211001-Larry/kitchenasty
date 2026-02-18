import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:5174'],
      credentials: true,
    },
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
}): void {
  if (!io) return;
  // Notify the specific order room (customer tracking)
  io.to(`order:${order.id}`).emit('order:statusUpdate', order);
  // Notify the kitchen display
  io.to('kitchen').emit('order:statusUpdate', order);
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
