import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';
import type { JwtAccessPayload } from '../middleware/auth.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

// Simple in-memory rate limiter for socket events
const bidRateLimit = new Map<string, number>();
const BID_RATE_LIMIT_MS = 2000; // 2 seconds between bids

let ioInstance: SocketServer | null = null;

export function setupSocketIO(io: SocketServer): void {
  ioInstance = io;

  // JWT authentication middleware for socket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.cookie
          ?.split(';')
          .find((c) => c.trim().startsWith('access_token='))
          ?.split('=')[1];

      if (token) {
        const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
        socket.userId = payload.sub;
      }
      next();
    } catch {
      // Allow unauthenticated connections (read-only)
      next();
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.debug('Socket connected', { socketId: socket.id, userId: socket.userId ?? 'guest' });

    // Join an auction room to receive real-time bid updates
    socket.on('auction:join', async (auctionId: string) => {
      if (typeof auctionId !== 'string' || !auctionId) return;

      // Verify auction exists
      const auction = await prisma.auction.findUnique({
        where: { id: auctionId },
        select: { id: true, status: true, currentPricePaise: true, endsAt: true },
      }).catch(() => null);

      if (!auction) {
        socket.emit('error', { code: 'NOT_FOUND', message: 'Auction not found' });
        return;
      }

      socket.join(`auction:${auctionId}`);

      // Send current state on join
      socket.emit('auction:state', {
        auctionId,
        currentPricePaise: auction.currentPricePaise,
        status: auction.status,
        endsAt: auction.endsAt,
      });

      logger.debug('Socket joined auction room', { socketId: socket.id, auctionId });
    });

    // Leave an auction room
    socket.on('auction:leave', (auctionId: string) => {
      socket.leave(`auction:${auctionId}`);
    });

    // Join user's private room for outbid notifications
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { socketId: socket.id });
    });
  });
}

/**
 * Retrieve the active SocketServer instance.
 */
export function getIO(): SocketServer | null {
  return ioInstance;
}

/**
 * Broadcast a bid placed event to all users watching an auction.
 * Called by the bid route AFTER the database transaction commits.
 */
export function broadcastBidPlaced(
  io: SocketServer | null | undefined,
  auctionId: string,
  data: {
    bid: {
      id: string;
      amountPaise: number;
      bidderId: string;
      bidder?: { name?: string };
      createdAt: Date;
    };
    currentPricePaise: number;
    nextMinimumBidPaise: number;
  }
): void {
  const targetIo = io || ioInstance;
  if (!targetIo) return;

  targetIo.to(`auction:${auctionId}`).emit('auction:bid_placed', {
    auctionId,
    ...data,
  });
}

/**
 * Broadcast outbid event to the user who was outbid.
 */
export function broadcastOutbid(
  io: SocketServer | null | undefined,
  userId: string,
  data: {
    auctionId: string;
    yourBidPaise: number;
    newHighestBidPaise: number;
  }
): void {
  const targetIo = io || ioInstance;
  if (!targetIo) return;

  targetIo.to(`user:${userId}`).emit('auction:outbid', data);
}

/**
 * Broadcast auction ended event to all watchers.
 */
export function broadcastAuctionEnded(
  io: SocketServer | null | undefined,
  auctionId: string,
  data: {
    status: 'SOLD' | 'UNSOLD' | 'AWAITING_PAYMENT';
    winnerUserId?: string;
    winningBidPaise?: number;
  }
): void {
  const targetIo = io || ioInstance;
  if (!targetIo) return;

  targetIo.to(`auction:${auctionId}`).emit('auction:ended', { auctionId, ...data });
}
