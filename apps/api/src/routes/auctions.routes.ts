import { Router } from 'express';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { auctionSearchSchema, createAuctionSchema, placeBidSchema } from '@bidrush/shared';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { getCommissionBreakdown, inrToPaise } from '@bidrush/shared';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';
import type { Prisma } from '@prisma/client';
import type { Server as SocketServer } from 'socket.io';
import { broadcastBidPlaced, broadcastOutbid, getIO } from '../sockets/socket.js';

export const auctionsRouter = Router();

// Helper: select only public fields (no reserve price)
const auctionPublicSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  condition: true,
  startingPricePaise: true,
  currentPricePaise: true,
  minimumIncrementPaise: true,
  // reservePricePaise: NEVER included
  startsAt: true,
  endsAt: true,
  status: true,
  locationCity: true,
  locationLocality: true,
  viewCount: true,
  brand: true,
  model: true,
  pickupAvailable: true,
  deliveryAvailable: true,
  createdAt: true,
  hostId: true,
  categoryId: true,
  category: {
    select: { id: true, name: true, slug: true },
  },
  host: {
    select: {
      id: true,
      name: true,
      createdAt: true,
      profile: {
        select: { displayName: true, avatarUrl: true, city: true, locality: true },
      },
    },
  },
  images: {
    select: { id: true, imageUrl: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' as const },
  },
  _count: {
    select: { bids: true },
  },
};

function generateSlug(title: string, id: string): string {
  const base = slugify(title, { lower: true, strict: true, trim: true });
  return `${base}-${id.slice(-8)}`;
}

// GET /api/v1/auctions
auctionsRouter.get('/', optionalAuth, validateQuery(auctionSearchSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      q,
      category,
      status,
      condition,
      locality,
      minPriceInr,
      maxPriceInr,
      sortBy,
      page,
      pageSize,
    } = req.query as any;

    const where: Prisma.AuctionWhereInput = {
      status: status ?? { in: ['LIVE', 'SCHEDULED'] },
      ...(q && {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category: { slug: category } }),
      ...(condition && { condition }),
      ...(locality && { locationLocality: locality }),
      ...(minPriceInr && { currentPricePaise: { gte: inrToPaise(Number(minPriceInr)) } }),
      ...(maxPriceInr && {
        currentPricePaise: {
          ...(minPriceInr ? { gte: inrToPaise(Number(minPriceInr)) } : {}),
          lte: inrToPaise(Number(maxPriceInr)),
        },
      }),
    };

    const orderBy: Prisma.AuctionOrderByWithRelationInput =
      sortBy === 'ending_soon'
        ? { endsAt: 'asc' }
        : sortBy === 'price_asc'
        ? { currentPricePaise: 'asc' }
        : sortBy === 'price_desc'
        ? { currentPricePaise: 'desc' }
        : sortBy === 'bids'
        ? { bids: { _count: 'desc' } }
        : { createdAt: 'desc' };

    const skip = (page - 1) * pageSize;

    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        where,
        select: auctionPublicSelect,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.auction.count({ where }),
    ]);

    // Add watchlist status if user is logged in
    let watchlistedIds = new Set<string>();
    if (req.user) {
      const watchlist = await prisma.watchlist.findMany({
        where: {
          userId: req.user.id,
          auctionId: { in: auctions.map((a) => a.id) },
        },
        select: { auctionId: true },
      });
      watchlistedIds = new Set(watchlist.map((w) => w.auctionId));
    }

    res.json({
      success: true,
      data: {
        auctions: auctions.map((a) => ({
          ...a,
          bidCount: a._count.bids,
          isWatchlisted: watchlistedIds.has(a.id),
        })),
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auctions/:id
auctionsRouter.get('/:id', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const auction = await prisma.auction.findFirst({
      where: {
        OR: [{ id: req.params.id }, { slug: req.params.id }],
        status: { in: ['LIVE', 'SCHEDULED', 'ENDED', 'AWAITING_PAYMENT', 'SOLD', 'UNSOLD'] },
      },
      select: auctionPublicSelect,
    });

    if (!auction) throw new AppError(404, 'NOT_FOUND', 'Auction not found');

    // Increment view count
    await prisma.auction.update({
      where: { id: auction.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {}); // Non-critical

    let isWatchlisted = false;
    if (req.user) {
      const w = await prisma.watchlist.findUnique({
        where: { userId_auctionId: { userId: req.user.id, auctionId: auction.id } },
      });
      isWatchlisted = !!w;
    }

    res.json({
      success: true,
      data: { ...auction, bidCount: auction._count.bids, isWatchlisted },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auctions
auctionsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = createAuctionSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid auction data', result.error.errors);
    }
    const data = result.data;
    if (!data.pickupAvailable && !data.deliveryAvailable) {
      throw new AppError(400, 'FULFILMENT_REQUIRED', 'Select pickup, delivery, or both fulfilment options');
    }
    if (data.reservePriceInr != null && data.reservePriceInr < data.startingPriceInr) {
      throw new AppError(400, 'INVALID_RESERVE_PRICE', 'Reserve price cannot be lower than the starting price');
    }
    if (data.scheduledStartAt && new Date(data.scheduledStartAt) <= new Date()) {
      throw new AppError(400, 'INVALID_START_TIME', 'Scheduled start time must be in the future');
    }
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, isActive: true },
      select: { id: true },
    });
    if (!category) throw new AppError(400, 'INVALID_CATEGORY', 'Choose an active product category');

    const startingPricePaise = inrToPaise(data.startingPriceInr);
    const minimumIncrementPaise = inrToPaise(data.minimumIncrementInr);
    const reservePricePaise = data.reservePriceInr ? inrToPaise(data.reservePriceInr) : null;

    const id = uuidv4();
    const startsAt = data.scheduledStartAt ? new Date(data.scheduledStartAt) : new Date();
    const endsAt = new Date(startsAt.getTime() + data.durationHours * 60 * 60 * 1000);

    const auction = await prisma.auction.create({
      data: {
        id,
        hostId: req.user!.id,
        categoryId: data.categoryId,
        title: data.title,
        slug: generateSlug(data.title, id),
        description: data.description,
        condition: data.condition,
        brand: data.brand,
        model: data.model,
        startingPricePaise,
        currentPricePaise: startingPricePaise,
        minimumIncrementPaise,
        reservePricePaise,
        startsAt,
        endsAt,
        locationCity: 'Bengaluru',
        locationLocality: data.locationLocality,
        pickupAvailable: data.pickupAvailable,
        deliveryAvailable: data.deliveryAvailable,
        status: 'DRAFT',
      },
      select: { ...auctionPublicSelect, reservePricePaise: true },
    });

    const commission = getCommissionBreakdown(startingPricePaise);

    res.status(201).json({
      success: true,
      data: { auction, commissionPreview: commission },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/auctions/:id
auctionsRouter.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const auction = await prisma.auction.findUnique({ where: { id: req.params.id } });
    if (!auction) throw new AppError(404, 'NOT_FOUND', 'Auction not found');
    if (auction.hostId !== req.user!.id) throw new AppError(403, 'FORBIDDEN', 'Not your auction');
    if (!['DRAFT', 'SCHEDULED'].includes(auction.status)) {
      throw new AppError(400, 'INVALID_STATE', 'Cannot edit a live or completed auction');
    }

    const updated = await prisma.auction.update({
      where: { id: auction.id },
      data: {
        title: req.body.title,
        description: req.body.description,
        categoryId: req.body.categoryId,
        condition: req.body.condition,
        locationLocality: req.body.locationLocality,
      },
      select: auctionPublicSelect,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auctions/:id/publish
auctionsRouter.post('/:id/publish', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const auction = await prisma.auction.findUnique({
      where: { id: req.params.id },
      include: { images: true },
    });
    if (!auction) throw new AppError(404, 'NOT_FOUND', 'Auction not found');
    if (auction.hostId !== req.user!.id) throw new AppError(403, 'FORBIDDEN', 'Not your auction');
    if (auction.status !== 'DRAFT') throw new AppError(400, 'INVALID_STATE', 'Only drafts can be published');
    if (auction.images.length === 0) throw new AppError(400, 'NO_IMAGES', 'Please add at least one image');
    const sellerVerification = await prisma.sellerVerification.findUnique({
      where: { userId: req.user!.id },
      select: { status: true },
    });
    if (sellerVerification?.status !== 'VERIFIED') {
      throw new AppError(
        403,
        'SELLER_VERIFICATION_REQUIRED',
        'Seller verification must be approved before you can publish an auction'
      );
    }

    const now = new Date();
    const newStatus = auction.startsAt <= now ? 'LIVE' : 'SCHEDULED';

    const updated = await prisma.auction.update({
      where: { id: auction.id },
      data: { status: newStatus },
      select: auctionPublicSelect,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auctions/:id/cancel
auctionsRouter.post('/:id/cancel', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const auction = await prisma.auction.findUnique({ where: { id: req.params.id } });
    if (!auction) throw new AppError(404, 'NOT_FOUND', 'Auction not found');
    if (auction.hostId !== req.user!.id) throw new AppError(403, 'FORBIDDEN', 'Not your auction');

    const cancellableStatuses = ['DRAFT', 'SCHEDULED', 'PENDING_REVIEW'];
    if (auction.status === 'LIVE') {
      const bidCount = await prisma.bid.count({ where: { auctionId: auction.id } });
      if (bidCount > 0) {
        throw new AppError(400, 'HAS_BIDS', 'Cannot cancel a live auction that has received bids');
      }
    }
    if (!cancellableStatuses.includes(auction.status) && auction.status !== 'LIVE') {
      throw new AppError(400, 'INVALID_STATE', 'This auction cannot be cancelled');
    }

    const updated = await prisma.auction.update({
      where: { id: auction.id },
      data: { status: 'CANCELLED' },
      select: auctionPublicSelect,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        performedBy: req.user!.id,
        action: 'AUCTION_CANCELLED',
        entityType: 'Auction',
        entityId: auction.id,
        before: { status: auction.status },
        after: { status: 'CANCELLED' },
        ipAddress: req.ip,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auctions/:id/bids
auctionsRouter.get('/:id/bids', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page as string ?? '1', 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(req.query.pageSize as string ?? '20', 10) || 20));
    const auction = await prisma.auction.findFirst({
      where: {
        OR: [{ id: req.params.id }, { slug: req.params.id }],
        status: { in: ['LIVE', 'SCHEDULED', 'ENDED', 'AWAITING_PAYMENT', 'SOLD', 'UNSOLD'] },
      },
      select: { id: true },
    });
    if (!auction) throw new AppError(404, 'NOT_FOUND', 'Auction not found');
    const skip = (page - 1) * pageSize;

    const [bids, total] = await Promise.all([
      prisma.bid.findMany({
        where: { auctionId: auction.id },
        include: {
          bidder: {
            select: {
              id: true,
              name: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.bid.count({ where: { auctionId: auction.id } }),
    ]);

    res.json({
      success: true,
      data: {
        bids,
        pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auctions/:id/bids
auctionsRouter.post('/:id/bids', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = placeBidSchema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid bid data', result.error.errors);
    }
    const { amountPaise, requestId } = result.data;
    const userId = req.user!.id;
    const auctionId = req.params.id;

    // Idempotency check
    const existingBid = await prisma.bid.findUnique({ where: { requestId } });
    if (existingBid) {
      res.json({ success: true, data: existingBid, message: 'Bid already recorded' });
      return;
    }

    // Use a transaction with SELECT FOR UPDATE to prevent concurrent bid issues
    const bid = await prisma.$transaction(async (tx) => {
      // Lock the auction row
      const auction = await tx.$queryRaw<Array<{
        id: string;
        status: string;
        endsAt: Date;
        currentPricePaise: number;
        minimumIncrementPaise: number;
        hostId: string;
        reservePricePaise: number | null;
      }>>`
        SELECT "id", "status", "endsAt", "currentPricePaise", "minimumIncrementPaise", "hostId", "reservePricePaise"
        FROM "auctions" WHERE "id" = ${auctionId} FOR UPDATE
      `;

      if (!auction.length) throw new AppError(404, 'NOT_FOUND', 'Auction not found');
      const a = auction[0];

      if (a.status !== 'LIVE') throw new AppError(400, 'NOT_LIVE', 'This auction is not currently live');
      if (new Date() > a.endsAt) throw new AppError(400, 'AUCTION_ENDED', 'This auction has ended');
      if (a.hostId === userId) throw new AppError(400, 'OWN_AUCTION', 'You cannot bid on your own auction');

      const bidCount = await tx.bid.count({ where: { auctionId } });
      const minimumBid = bidCount === 0
        ? a.currentPricePaise
        : a.currentPricePaise + a.minimumIncrementPaise;
      if (amountPaise < minimumBid) {
        throw new AppError(
          400,
          'BID_TOO_LOW',
          `Minimum bid is ₹${(minimumBid / 100).toFixed(0)}. You bid ₹${(amountPaise / 100).toFixed(0)}.`
        );
      }

      // Find previous highest bidder for outbid notification
      const previousHighestBid = await tx.bid.findFirst({
        where: { auctionId },
        orderBy: { amountPaise: 'desc' },
        include: { bidder: { select: { id: true, email: true, name: true } } },
      });

      // Create bid
      const newBid = await tx.bid.create({
        data: { auctionId, bidderId: userId, amountPaise, requestId },
        include: {
          bidder: {
            select: {
              id: true,
              name: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
        },
      });

      // Update auction current price
      await tx.auction.update({
        where: { id: auctionId },
        data: { currentPricePaise: amountPaise },
      });

      // In-app notification for previous highest bidder
      if (previousHighestBid && previousHighestBid.bidder.id !== userId) {
        await tx.notification.create({
          data: {
            userId: previousHighestBid.bidder.id,
            type: 'YOU_ARE_OUTBID',
            title: 'You\'ve been outbid!',
            message: `Someone placed a higher bid. Your bid of ₹${(previousHighestBid.amountPaise / 100).toFixed(0)} is no longer the highest.`,
            data: { auctionId },
          },
        });
      }

      return { bid: newBid, previousHighestBid, nextMinimumBidPaise: amountPaise + a.minimumIncrementPaise };
    });

    // Broadcast real-time events via Socket.IO
    const io = (req.app?.get('io') as SocketServer | undefined) || getIO();
    broadcastBidPlaced(io, auctionId, {
      bid: {
        id: bid.bid.id,
        amountPaise: bid.bid.amountPaise,
        bidderId: bid.bid.bidderId,
        bidder: { name: bid.bid.bidder.name },
        createdAt: bid.bid.createdAt,
      },
      currentPricePaise: amountPaise,
      nextMinimumBidPaise: bid.nextMinimumBidPaise,
    });

    if (bid.previousHighestBid && bid.previousHighestBid.bidder.id !== userId) {
      broadcastOutbid(io, bid.previousHighestBid.bidder.id, {
        auctionId,
        yourBidPaise: bid.previousHighestBid.amountPaise,
        newHighestBidPaise: amountPaise,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        bid: bid.bid,
        nextMinimumBidPaise: bid.nextMinimumBidPaise,
      },
    });
  } catch (err) {
    next(err);
  }
});
