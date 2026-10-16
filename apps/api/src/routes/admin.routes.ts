import { Router } from 'express';
import { requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const adminRouter = Router();

// All admin routes require ADMIN role
adminRouter.use(requireAdmin);

// GET /api/v1/admin/dashboard
adminRouter.get('/dashboard', async (req: AuthenticatedRequest, res, next) => {
  try {
    const [
      totalUsers,
      activeAuctions,
      totalOrders,
      pendingVerifications,
      recentAuctions,
      totalCommission,
      openDisputes,
      recentUsers,
      recentOrders,
    ] = await Promise.all([
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.auction.count({ where: { status: 'LIVE' } }),
      prisma.order.count(),
      prisma.sellerVerification.count({ where: { status: 'PENDING' } }),
      prisma.auction.findMany({
        where: { status: { in: ['LIVE', 'PENDING_REVIEW'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          host: { select: { name: true, email: true } },
          _count: { select: { bids: true } },
        },
      }),
      prisma.commissionLedger.aggregate({
        where: { status: 'RECOGNIZED' },
        _sum: { commissionPaise: true },
      }),
      prisma.dispute.count({ where: { status: 'OPEN' } }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          auction: { select: { title: true } },
          buyer: { select: { name: true } },
          seller: { select: { name: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeAuctions,
          totalOrders,
          pendingVerifications,
          openDisputes,
          totalCommissionPaise: totalCommission._sum.commissionPaise ?? 0,
        },
        recentAuctions,
        recentUsers,
        recentOrders,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/users
adminRouter.get('/users', async (req, res, next) => {
  try {
    const page = parseInt((req.query.page as string) ?? '1');
    const pageSize = Math.min(parseInt((req.query.pageSize as string) ?? '20'), 50);
    const q = req.query.q as string | undefined;

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
          sellerVerification: { select: { status: true } },
          _count: { select: { bids: true, hostedAuctions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/users/:id/suspend
adminRouter.patch('/users/:id/suspend', async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

    const nextStatus = user.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { status: nextStatus },
      select: { id: true, name: true, email: true, status: true, role: true },
    });

    await prisma.auditLog.create({
      data: {
        performedBy: req.user!.id,
        action: nextStatus === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
        entityType: 'User',
        entityId: user.id,
        before: { status: user.status },
        after: { status: nextStatus },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/seller-verifications/:userId
adminRouter.patch('/seller-verifications/:userId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { status, reviewNotes } = req.body as {
      status?: 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
      reviewNotes?: string;
    };
    if (!status || !['VERIFIED', 'REJECTED', 'SUSPENDED'].includes(status)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Status must be VERIFIED, REJECTED, or SUSPENDED');
    }
    if (reviewNotes !== undefined && (typeof reviewNotes !== 'string' || reviewNotes.length > 1000)) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Review notes must be under 1000 characters');
    }

    const verification = await prisma.sellerVerification.findUnique({
      where: { userId: req.params.userId },
    });
    if (!verification) throw new AppError(404, 'NOT_FOUND', 'Seller verification request not found');

    const updated = await prisma.sellerVerification.update({
      where: { userId: req.params.userId },
      data: { status, reviewNotes: reviewNotes?.trim() || null, reviewedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        performedBy: req.user!.id,
        action: 'SELLER_VERIFICATION_REVIEWED',
        entityType: 'SellerVerification',
        entityId: verification.id,
        before: { status: verification.status },
        after: { status, reviewNotes: reviewNotes?.trim() || null },
        ipAddress: req.ip,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/admin/users/:id/role
adminRouter.patch('/users/:id/role', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { role } = req.body as { role: 'ADMIN' | 'USER' };
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role },
      select: { id: true, name: true, email: true, status: true, role: true },
    });

    await prisma.auditLog.create({
      data: {
        performedBy: req.user!.id,
        action: 'USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: user.id,
        before: { role: user.role },
        after: { role },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/auctions
adminRouter.get('/auctions', async (req, res, next) => {
  try {
    const page = parseInt((req.query.page as string) ?? '1');
    const pageSize = Math.min(parseInt((req.query.pageSize as string) ?? '20'), 50);
    const status = req.query.status as string | undefined;
    const filter = req.query.filter as string | undefined;

    let where: Record<string, any> = {};
    if (status) {
      where.status = status;
    } else if (filter === 'pending') {
      where.status = 'PENDING_REVIEW';
    } else if (filter === 'reported') {
      where.reports = { some: {} };
    }

    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        where,
        include: {
          host: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          _count: { select: { bids: true, reports: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        auctions,
        pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/auctions/:id/approve
adminRouter.post('/auctions/:id/approve', async (req: AuthenticatedRequest, res, next) => {
  try {
    const auction = await prisma.auction.findUnique({ where: { id: req.params.id } });
    if (!auction) throw new AppError(404, 'NOT_FOUND', 'Auction not found');

    const now = new Date();
    const newStatus = auction.startsAt <= now ? 'LIVE' : 'SCHEDULED';

    const updated = await prisma.auction.update({
      where: { id: auction.id },
      data: { status: newStatus },
    });

    await prisma.auditLog.create({
      data: {
        performedBy: req.user!.id,
        action: 'AUCTION_APPROVED',
        entityType: 'Auction',
        entityId: auction.id,
        before: { status: auction.status },
        after: { status: newStatus },
      },
    });

    await prisma.notification.create({
      data: {
        userId: auction.hostId,
        type: 'AUCTION_APPROVED',
        title: 'Auction approved!',
        message: `Your auction "${auction.title}" has been approved and is now ${newStatus.toLowerCase()}.`,
        data: { auctionId: auction.id },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/auctions/:id/reject
adminRouter.post('/auctions/:id/reject', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { reason } = req.body as { reason?: string };
    const auction = await prisma.auction.findUnique({ where: { id: req.params.id } });
    if (!auction) throw new AppError(404, 'NOT_FOUND', 'Auction not found');

    await prisma.auction.update({ where: { id: auction.id }, data: { status: 'CANCELLED' } });

    await prisma.auditLog.create({
      data: {
        performedBy: req.user!.id,
        action: 'AUCTION_REJECTED',
        entityType: 'Auction',
        entityId: auction.id,
        before: { status: auction.status },
        after: { status: 'CANCELLED', reason },
      },
    });

    await prisma.notification.create({
      data: {
        userId: auction.hostId,
        type: 'AUCTION_REJECTED',
        title: 'Auction not approved',
        message: `Your auction "${auction.title}" was not approved. Reason: ${reason ?? 'Please contact support.'}`,
        data: { auctionId: auction.id },
      },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/orders
adminRouter.get('/orders', async (req, res, next) => {
  try {
    const page = parseInt((req.query.page as string) ?? '1');
    const pageSize = Math.min(parseInt((req.query.pageSize as string) ?? '20'), 50);
    const status = req.query.status as string | undefined;

    const where = status && status !== 'ALL' ? { status: status as any } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          auction: {
            select: {
              id: true,
              title: true,
              slug: true,
              images: { take: 1, orderBy: { sortOrder: 'asc' } },
            },
          },
          buyer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, name: true, email: true } },
          payments: { take: 1, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/orders/:id
adminRouter.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        auction: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            category: true,
          },
        },
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
        payments: { orderBy: { createdAt: 'desc' } },
        commissionLedger: true,
        payout: true,
        dispute: true,
      },
    });

    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/financial-reports
adminRouter.get('/financial-reports', async (req, res, next) => {
  try {
    const [
      totalCommission,
      totalPayouts,
      pendingPayouts,
      totalSales,
      commissionLedgers,
      payouts,
    ] = await Promise.all([
      prisma.commissionLedger.aggregate({
        where: { status: 'RECOGNIZED' },
        _sum: { commissionPaise: true, grossAmountPaise: true },
        _count: true,
      }),
      prisma.sellerPayout.aggregate({
        where: { status: 'PAID' },
        _sum: { amountPaise: true },
      }),
      prisma.sellerPayout.aggregate({
        where: { status: 'PENDING' },
        _sum: { amountPaise: true },
        _count: true,
      }),
      prisma.order.count({ where: { status: { in: ['PAID', 'COMPLETED', 'DELIVERED'] } } }),
      prisma.commissionLedger.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          order: {
            select: {
              id: true,
              auction: { select: { title: true } },
            },
          },
        },
      }),
      prisma.sellerPayout.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          seller: { select: { id: true, name: true, email: true } },
          order: { select: { id: true, auction: { select: { title: true } } } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalCommissionPaise: totalCommission._sum.commissionPaise ?? 0,
        totalGrossSalesPaise: totalCommission._sum.grossAmountPaise ?? 0,
        completedSalesCount: totalCommission._count,
        totalPayoutsPaise: totalPayouts._sum.amountPaise ?? 0,
        pendingPayoutAmountPaise: pendingPayouts._sum.amountPaise ?? 0,
        pendingPayoutsCount: pendingPayouts._count,
        totalSales,
        commissionLedgers,
        payouts,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/admin/reports
adminRouter.get('/reports', async (req, res, next) => {
  try {
    const [disputes, listingReports, auditLogs] = await Promise.all([
      prisma.dispute.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          raisedBy: { select: { id: true, name: true, email: true } },
          order: {
            select: {
              id: true,
              winningBidPaise: true,
              auction: { select: { id: true, title: true } },
            },
          },
          auction: { select: { id: true, title: true } },
        },
      }),
      prisma.listingReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          auction: {
            select: {
              id: true,
              title: true,
              status: true,
              host: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          performer: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        disputes,
        listingReports,
        auditLogs,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/reports/disputes/:id/resolve
adminRouter.post('/reports/disputes/:id/resolve', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { resolution, status = 'RESOLVED' } = req.body as {
      resolution: string;
      status?: 'RESOLVED' | 'CLOSED';
    };

    const dispute = await prisma.dispute.findUnique({ where: { id: req.params.id } });
    if (!dispute) throw new AppError(404, 'NOT_FOUND', 'Dispute not found');

    const updated = await prisma.dispute.update({
      where: { id: dispute.id },
      data: { status, resolution },
    });

    await prisma.auditLog.create({
      data: {
        performedBy: req.user!.id,
        action: 'DISPUTE_RESOLVED',
        entityType: 'Dispute',
        entityId: dispute.id,
        before: { status: dispute.status },
        after: { status, resolution },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/admin/reports/listing-reports/:id/review
adminRouter.post('/reports/listing-reports/:id/review', async (req: AuthenticatedRequest, res, next) => {
  try {
    const report = await prisma.listingReport.findUnique({ where: { id: req.params.id } });
    if (!report) throw new AppError(404, 'NOT_FOUND', 'Report not found');

    const updated = await prisma.listingReport.update({
      where: { id: report.id },
      data: { isReviewed: true },
    });

    await prisma.auditLog.create({
      data: {
        performedBy: req.user!.id,
        action: 'LISTING_REPORT_REVIEWED',
        entityType: 'ListingReport',
        entityId: report.id,
        before: { isReviewed: report.isReviewed },
        after: { isReviewed: true },
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});
