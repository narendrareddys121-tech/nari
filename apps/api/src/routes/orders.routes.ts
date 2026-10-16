import { Router } from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { getCommissionBreakdown } from '@bidrush/shared';

export const ordersRouter = Router();

// GET /api/v1/orders
ordersRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        OR: [{ buyerId: req.user!.id }, { sellerId: req.user!.id }],
      },
      include: {
        auction: {
          select: {
            id: true, title: true, slug: true,
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          },
        },
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/orders/:id
ordersRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.id,
        OR: [{ buyerId: req.user!.id }, { sellerId: req.user!.id }],
      },
      include: {
        auction: {
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            category: true,
          },
        },
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
        payments: true,
        commissionLedger: true,
      },
    });

    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/orders/:id/checkout — create Razorpay order for payment
ordersRouter.post('/:id/checkout', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, buyerId: req.user!.id, status: 'AWAITING_PAYMENT' },
    });
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found or not payable');

    if (order.paymentDeadline < new Date()) {
      throw new AppError(400, 'PAYMENT_DEADLINE_PASSED', 'The payment deadline for this order has passed');
    }

    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      res.json({
        success: false,
        error: {
          code: 'PAYMENT_NOT_CONFIGURED',
          message: 'Payment gateway not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable payments.',
        },
      });
      return;
    }

    const Razorpay = (await import('razorpay')).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const idempotencyKey = `order_${order.id}_${Date.now()}`;

    const razorpayOrder = await razorpay.orders.create({
      amount: order.winningBidPaise,
      currency: 'INR',
      receipt: order.id,
      notes: { orderId: order.id },
    });

    // Create pending payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: 'razorpay',
        providerOrderId: razorpayOrder.id,
        amountPaise: order.winningBidPaise,
        status: 'PENDING',
        idempotencyKey,
      },
    });

    res.json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: order.winningBidPaise,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
      },
    });
  } catch (err) {
    next(err);
  }
});
