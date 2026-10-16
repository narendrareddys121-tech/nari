import 'dotenv/config';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma } from './config/prisma.js';
import { setupSocketIO } from './sockets/socket.js';
import { startAuctionWorker } from './workers/auction.worker.js';

async function main(): Promise<void> {
  // Test database connection
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (err) {
    logger.error('❌ Database connection failed', { error: err });
    process.exit(1);
  }

  const app = createApp();
  const httpServer = http.createServer(app);

  // Set up Socket.IO
  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.WEB_ORIGIN,
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 10000,
  });

  setupSocketIO(io);
  app.set('io', io);

  // Start the auction ending worker
  startAuctionWorker();

  // Start HTTP server
  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 BidRush API running at http://localhost:${env.PORT}`);
    logger.info(`📡 Health check: http://localhost:${env.PORT}/api/v1/health`);
    logger.info(`🌍 Environment: ${env.NODE_ENV}`);
    logger.info(`🌐 CORS origin: ${env.WEB_ORIGIN}`);
    logger.info(`📧 Email: ${env.EMAIL_PROVIDER}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    httpServer.close(async () => {
      logger.info('HTTP server closed');
      await prisma.$disconnect();
      logger.info('Database disconnected');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err });
    process.exit(1);
  });
}

main();
