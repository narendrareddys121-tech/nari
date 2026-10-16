import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { updateProfileSchema } from '@bidrush/shared';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const usersRouter = Router();

// GET /api/v1/users/me
usersRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { profile: true, sellerVerification: true },
    });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
        sellerStatus: user.sellerVerification?.status ?? 'UNVERIFIED',
        createdAt: user.createdAt,
        profile: user.profile,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/users/me
usersRouter.patch(
  '/me',
  requireAuth,
  validateBody(updateProfileSchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const profile = await prisma.userProfile.upsert({
        where: { userId: req.user!.id },
        create: { userId: req.user!.id, ...req.body },
        update: req.body,
      });
      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/users/me/auctions
usersRouter.get('/me/auctions', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const auctions = await prisma.auction.findMany({
      where: { hostId: req.user!.id },
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        bids: {
          select: { amountPaise: true, bidderId: true, createdAt: true },
          orderBy: { amountPaise: 'desc' },
          take: 1,
        },
        _count: { select: { bids: true } },
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: auctions });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/users/me/bids
usersRouter.get('/me/bids', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const bids = await prisma.bid.findMany({
      where: { bidderId: req.user!.id },
      include: {
        auction: {
          include: {
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: bids });
  } catch (err) {
    next(err);
  }
});
