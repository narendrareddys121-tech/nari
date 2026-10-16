import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const watchlistRouter = Router();

// GET /api/v1/watchlist
watchlistRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const items = await prisma.watchlist.findMany({
      where: { userId: req.user!.id },
      include: {
        auction: {
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            _count: { select: { bids: true } },
            category: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/watchlist/:auctionId
watchlistRouter.post('/:auctionId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const auction = await prisma.auction.findUnique({ where: { id: req.params.auctionId } });
    if (!auction) throw new AppError(404, 'NOT_FOUND', 'Auction not found');

    const item = await prisma.watchlist.upsert({
      where: {
        userId_auctionId: { userId: req.user!.id, auctionId: req.params.auctionId },
      },
      create: { userId: req.user!.id, auctionId: req.params.auctionId },
      update: {},
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/watchlist/:auctionId
watchlistRouter.delete('/:auctionId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.watchlist.deleteMany({
      where: { userId: req.user!.id, auctionId: req.params.auctionId },
    });
    res.json({ success: true, message: 'Removed from watchlist' });
  } catch (err) {
    next(err);
  }
});
