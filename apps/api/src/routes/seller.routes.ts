import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const sellerRouter = Router();

// GET /api/v1/seller/verification
sellerRouter.get('/verification', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const verification = await prisma.sellerVerification.findUnique({
      where: { userId: req.user!.id },
      select: { status: true, submittedAt: true, reviewedAt: true, reviewNotes: true },
    });
    res.json({
      success: true,
      data: verification ?? { status: 'UNVERIFIED', submittedAt: null, reviewedAt: null, reviewNotes: null },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/seller/verification/request
sellerRouter.post('/verification/request', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user!.emailVerifiedAt) {
      throw new AppError(403, 'EMAIL_VERIFICATION_REQUIRED', 'Verify your email before requesting seller verification');
    }

    const current = await prisma.sellerVerification.findUnique({
      where: { userId: req.user!.id },
    });
    if (current?.status === 'VERIFIED') {
      res.json({ success: true, data: current });
      return;
    }
    if (current?.status === 'PENDING') {
      throw new AppError(409, 'VERIFICATION_PENDING', 'Your seller verification request is already being reviewed');
    }
    if (current?.status === 'SUSPENDED') {
      throw new AppError(403, 'SELLER_SUSPENDED', 'Seller privileges are suspended. Contact support.');
    }

    const verification = await prisma.sellerVerification.upsert({
      where: { userId: req.user!.id },
      create: { userId: req.user!.id, status: 'PENDING', submittedAt: new Date() },
      update: { status: 'PENDING', submittedAt: new Date(), reviewedAt: null, reviewNotes: null },
    });

    res.status(202).json({ success: true, data: verification });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/seller/earnings
sellerRouter.get('/earnings', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const [completedOrders, pendingOrders, commissions, sellerProceeds] = await Promise.all([
      prisma.order.findMany({
        where: { sellerId: req.user!.id, status: { in: ['PAID', 'COMPLETED', 'DELIVERED'] } },
        select: { id: true, winningBidPaise: true, commissionPaise: true, sellerProceedsPaise: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where: { sellerId: req.user!.id, status: 'AWAITING_PAYMENT' } }),
      prisma.commissionLedger.aggregate({
        where: { order: { sellerId: req.user!.id }, status: 'RECOGNIZED' },
        _sum: { commissionPaise: true, grossAmountPaise: true },
      }),
      prisma.order.aggregate({
        where: {
          sellerId: req.user!.id,
          commissionLedger: { is: { status: 'RECOGNIZED' } },
        },
        _sum: { sellerProceedsPaise: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        completedOrders,
        pendingOrdersCount: pendingOrders,
        totalGrossSalesPaise: commissions._sum?.grossAmountPaise ?? 0,
        totalCommissionPaidPaise: commissions._sum?.commissionPaise ?? 0,
        totalSellerProceedsPaise: sellerProceeds._sum?.sellerProceedsPaise ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/seller/payouts
sellerRouter.get('/payouts', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const payouts = await prisma.sellerPayout.findMany({
      where: { sellerId: req.user!.id },
      include: {
        order: {
          include: {
            auction: { select: { title: true, id: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: payouts });
  } catch (err) {
    next(err);
  }
});
