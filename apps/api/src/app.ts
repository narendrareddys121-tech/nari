import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Routes
import { authRouter } from './routes/auth.routes.js';
import { usersRouter } from './routes/users.routes.js';
import { auctionsRouter } from './routes/auctions.routes.js';
import { categoriesRouter } from './routes/categories.routes.js';
import { watchlistRouter } from './routes/watchlist.routes.js';
import { ordersRouter } from './routes/orders.routes.js';
import { paymentsRouter } from './routes/payments.routes.js';
import { notificationsRouter } from './routes/notifications.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { sellerRouter } from './routes/seller.routes.js';
import { uploadsRouter } from './routes/uploads.routes.js';

export function createApp(): express.Application {
  const app = express();

  // ─── Security Headers ─────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // ─── CORS ─────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ─── Request Size Limits ──────────────────────────────────────────────────
  // Webhooks need raw body — parse separately
  app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.use(cookieParser());

  // ─── Logging ──────────────────────────────────────────────────────────────
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    }));
  }

  // ─── Global Rate Limit ────────────────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMIT', message: 'Too many requests. Please slow down.' },
    },
  });
  app.use(globalLimiter);

  // ─── Health Check ──────────────────────────────────────────────────────────
  app.get('/api/v1/health', async (req, res) => {
    let dbStatus = 'ok';
    let dbLatencyMs = 0;

    try {
      const start = Date.now();
      await import('./config/prisma.js').then(({ prisma }) => prisma.$queryRaw`SELECT 1`);
      dbLatencyMs = Date.now() - start;
    } catch {
      dbStatus = 'error';
    }

    const status = dbStatus === 'ok' ? 200 : 503;

    res.status(status).json({
      success: status === 200,
      data: {
        status: dbStatus === 'ok' ? 'healthy' : 'degraded',
        version: '1.0.0',
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
        services: {
          database: { status: dbStatus, latencyMs: dbLatencyMs },
        },
      },
    });
  });

  // ─── API Routes ───────────────────────────────────────────────────────────
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/auctions', auctionsRouter);
  app.use('/api/v1/categories', categoriesRouter);
  app.use('/api/v1/watchlist', watchlistRouter);
  app.use('/api/v1/orders', ordersRouter);
  app.use('/api/v1/payments', paymentsRouter);
  app.use('/api/v1/notifications', notificationsRouter);
  app.use('/api/v1/seller', sellerRouter);
  app.use('/api/v1/uploads', uploadsRouter);
  app.use('/api/v1/admin', adminRouter);

  // ─── 404 & Error Handlers ─────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
