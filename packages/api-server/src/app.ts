import dotenv from 'dotenv';
import path from 'path';

dotenv.config(); // Load packages/api-server/.env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // Load root .env
import 'express-async-errors';

// Globally normalize all public URLs to ensure they have the correct protocol prefix
// This fixes broken image URLs in LINE Flex messages, OAuth callbacks, and CORS issues
['API_URL_PUBLIC', 'STORE_URL_PUBLIC', 'ADMIN_URL_PUBLIC', 'ERP_URL_PUBLIC'].forEach(key => {
  let val = process.env[key];
  if (val) {
    val = val.trim().replace(/\/$/, '');
    if (!val.startsWith('http://') && !val.startsWith('https://')) {
      if (val.includes('localhost') || val.includes('127.0.0.1')) {
        process.env[key] = `http://${val}`;
      } else {
        process.env[key] = `https://${val}`;
      }
    } else {
      process.env[key] = val;
    }
  }
});

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './routes/auth.routes.js';
import locationRoutes from './routes/location.routes.js';
import menuRoutes from './routes/menu.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import reservationRoutes from './routes/reservation.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import reviewRoutes from './routes/review.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import automationRoutes from './routes/automation.routes.js';
import loyaltyRoutes from './routes/loyalty.routes.js';
import legalRoutes from './routes/legal.routes.js';
import consentRoutes from './routes/consent.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import staffRoutes from './routes/staff.routes.js';
import customerRoutes from './routes/customer.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import developerRoutes from './routes/developer.routes.js';
import lineRoutes from './routes/line.routes.js';
import integrationRoutes from './routes/integration.routes.js';
import chatRoutes from './routes/chat.routes.js';
import groupOrderRoutes from './routes/group-order.routes.js';
import i18nRoutes from './routes/i18n.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import shutterErpRouter from './shutter-erp/index.js';
import { openApiSpec } from './lib/openapi.js';
import { initPassport } from './lib/passport.js';
import passport from 'passport';
import prisma from './lib/db.js';
import logger from './lib/logger.js';
import { requestId } from './middleware/requestId.js';
import { httpLogger } from './middleware/httpLogger.js';
import { metricsCollector } from './middleware/metricsCollector.js';

// Initialize automation event listeners
import './lib/events.js';

export async function createApp() {
  const app = express();
  // On Railway/Cloud providers, we trust the first proxy
  app.set('trust proxy', 1);

  // --- Database Keep-Alive Heartbeat ---
  let lastActivityTime = Date.now();
  
  app.use((_req, _res, next) => {
    lastActivityTime = Date.now();
    next();
  });

  if (process.env.NODE_ENV !== 'test') {
    setInterval(async () => {
      const idleTime = Date.now() - lastActivityTime;
      // If idle for more than 4 minutes, ping the database
      if (idleTime > 4 * 60 * 1000) {
        try {
          await prisma.$queryRaw`SELECT 1`;
          lastActivityTime = Date.now();
          logger.debug('Database keep-alive ping successful');
        } catch (error) {
          logger.error({ err: error }, 'Database keep-alive ping failed');
        }
      }
    }, 60 * 1000); // Check every minute
  }
  // -------------------------------------

  // Middleware
  app.use(requestId);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false, // In development/simple production, we can disable or fine-tune this
  }));
  const corsOrigins = [
    process.env.STORE_URL_PUBLIC,
    process.env.ADMIN_URL_PUBLIC,
    process.env.ERP_URL_PUBLIC,
    'http://localhost:5173', 
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:3000'
  ].filter(Boolean).map(url => {
    let normalized = url!.replace(/\/$/, '');
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      return normalized.includes('localhost') || normalized.includes('127.0.0.1')
        ? `http://${normalized}`
        : `https://${normalized}`;
    }
    return normalized;
  }) as string[];
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes('*')) {
        return callback(null, true);
      }
      // Allow configured origins + any local development or internal IPs
      const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('10.') || origin.includes('.railway.internal');
      const isAllowed = corsOrigins.includes(origin) || isLocal;

      if (isAllowed) {
        callback(null, true);
      } else {
        // Return false instead of throwing a hard error to avoid 500s
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  }));
  if (process.env.NODE_ENV !== 'test') {
    app.use(httpLogger);
  }

  // Health check (before rate limiter so monitoring/readiness probes always work)
  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  });

  // Rate limiting
  if (process.env.NODE_ENV === 'production') {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many requests, please try again later.' },
    });
    app.use('/api/', limiter);
  }

  // Stripe webhook needs raw body — register before JSON parser
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Initialize passport for social login
  await initPassport();
  app.use(passport.initialize());

  // Metrics collection (after passport so req.user is available)
  if (process.env.NODE_ENV !== 'test') {
    app.use(metricsCollector);
  }

  // Serve uploaded files
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // API Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: '夏特點餐系統 API Documentation',
  }));

  // OpenAPI spec endpoint
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/locations', locationRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/reservations', reservationRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/automation-rules', automationRoutes);
  app.use('/api/loyalty', loyaltyRoutes);
  app.use('/api/legal', legalRoutes);
  app.use('/api/consent', consentRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/developer', developerRoutes);
  app.use('/api/line', lineRoutes);
  app.use('/api/integration', integrationRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/group-orders', groupOrderRoutes);
  app.use('/api/i18n', i18nRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/shutter-erp', shutterErpRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: 'Not Found',
    });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    });
  });

  return app;
}
