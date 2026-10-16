import cron from 'node-cron';
import { prisma } from '../config/prisma.js';
import { getCommissionBreakdown } from '@bidrush/shared';
import { logger } from '../config/logger.js';

/**
 * Auction Ending Worker
 *
 * Runs every minute to process auctions that have passed their end time.
 * This is idempotent — running multiple times for the same auction is safe.
 *
 * For each ended auction:
 * 1. Find the highest accepted bid
 * 2. Check reserve price (if set)
 * 3. Create a winning order (or mark UNSOLD)
 * 4. Notify winner and host
 */
export function startAuctionWorker(): void {
  logger.info('Starting auction ending worker (runs every minute)');

  cron.schedule('* * * * *', async () => {
    try {
      await processEndedAuctions();
    } catch (err) {
      logger.error('Auction worker error', { error: err });
    }
  });
}

async function processEndedAuctions(): Promise<void> {
  const now = new Date();

  // Find all live auctions that have passed their end time
  const endedAuctions = await prisma.auction.findMany({
    where: {
      status: 'LIVE',
      endsAt: { lte: now },
    },
    select: { id: true, title: true, hostId: true, endsAt: true, reservePricePaise: true },
  });

  if (endedAuctions.length === 0) return;

  logger.info(`Processing ${endedAuctions.length} ended auction(s)`);

  for (const auction of endedAuctions) {
    await processAuction(auction);
  }

  // Also activate scheduled auctions that have hit their start time
  const toActivate = await prisma.auction.updateMany({
    where: {
      status: 'SCHEDULED',
      startsAt: { lte: now },
    },
    data: { status: 'LIVE' },
  });

  if (toActivate.count > 0) {
    logger.info(`Activated ${toActivate.count} scheduled auction(s)`);
  }
}

async function processAuction(auction: {
  id: string;
  title: string;
  hostId: string;
  endsAt: Date;
  reservePricePaise: number | null;
}): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      // Re-check status inside transaction to prevent double processing
      const current = await tx.auction.findUnique({
        where: { id: auction.id },
        select: { status: true },
      });
      if (!current || current.status !== 'LIVE') return;

      // Find highest bid
      const highestBid = await tx.bid.findFirst({
        where: { auctionId: auction.id },
        orderBy: { amountPaise: 'desc' },
        include: { bidder: { select: { id: true, name: true, email: true } } },
      });

      // Check reserve price
      const reserveMet =
        !auction.reservePricePaise ||
        (highestBid && highestBid.amountPaise >= auction.reservePricePaise);

      if (!highestBid || !reserveMet) {
        // No bids or reserve not met — mark UNSOLD
        await tx.auction.update({
          where: { id: auction.id },
          data: { status: 'UNSOLD' },
        });

        await tx.notification.create({
          data: {
            userId: auction.hostId,
            type: 'AUCTION_LOST',
            title: 'Auction ended — no winner',
            message: `Your auction "${auction.title}" ended without a qualifying bid.`,
            data: { auctionId: auction.id },
          },
        });

        logger.info('Auction ended UNSOLD', { auctionId: auction.id });
        return;
      }

      // Create winning order
      const commission = getCommissionBreakdown(highestBid.amountPaise);
      const paymentDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

      // Upsert to prevent duplicate order creation
      const order = await tx.order.upsert({
        where: { auctionId: auction.id },
        create: {
          auctionId: auction.id,
          buyerId: highestBid.bidderId,
          sellerId: auction.hostId,
          winningBidPaise: highestBid.amountPaise,
          commissionPaise: commission.commissionPaise,
          sellerProceedsPaise: commission.sellerProceedsPaise,
          status: 'AWAITING_PAYMENT',
          paymentDeadline,
        },
        update: {}, // Never overwrite existing order
      });

      await tx.auction.update({
        where: { id: auction.id },
        data: { status: 'AWAITING_PAYMENT' },
      });

      // Notify winner
      await tx.notification.create({
        data: {
          userId: highestBid.bidderId,
          type: 'AUCTION_WON',
          title: '🎉 You won!',
          message: `Congratulations! You won "${auction.title}" for ₹${(highestBid.amountPaise / 100).toFixed(0)}. Complete your payment within 48 hours.`,
          data: { auctionId: auction.id, orderId: order.id },
        },
      });

      // Notify seller
      await tx.notification.create({
        data: {
          userId: auction.hostId,
          type: 'NEW_BID_ON_YOUR_AUCTION',
          title: 'Auction sold!',
          message: `Your auction "${auction.title}" sold for ₹${(highestBid.amountPaise / 100).toFixed(0)}. Awaiting buyer payment.`,
          data: { auctionId: auction.id, orderId: order.id },
        },
      });

      logger.info('Auction ended with winner', {
        auctionId: auction.id,
        winnerId: highestBid.bidderId,
        amountPaise: highestBid.amountPaise,
      });
    });
  } catch (err) {
    logger.error('Failed to process auction', { auctionId: auction.id, error: err });
    // Don't rethrow — continue processing other auctions
  }
}
