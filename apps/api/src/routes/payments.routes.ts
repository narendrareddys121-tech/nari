import { Router, Request } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { getCommissionBreakdown } from '@bidrush/shared';
import { logger } from '../config/logger.js';

export const paymentsRouter = Router();

// POST /api/v1/payments/webhook — Razorpay webhook
paymentsRouter.post('/webhook', async (req: Request, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.warn('Razorpay webhook secret not configured');
      res.status(400).json({ error: 'Webhook not configured' });
      return;
    }

    // Verify webhook signature
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Invalid Razorpay webhook signature');
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    const event = req.body as {
      event: string;
      payload: {
        payment?: { entity: { id: string; order_id: string; status: string } };
      };
    };

    const eventId = req.headers['x-razorpay-event-id'] as string ?? `${Date.now()}`;

    // Idempotency — don't process the same event twice
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: { eventId },
    });
    if (existingEvent?.processedAt) {
      res.json({ received: true, duplicate: true });
      return;
    }

    // Record the event
    const webhookRecord = await prisma.paymentWebhookEvent.upsert({
      where: { eventId },
      create: {
        provider: 'razorpay',
        eventId,
        eventType: event.event,
        payload: req.body,
      },
      update: {},
    });

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment?.entity;
      if (payment) {
        await handlePaymentCaptured(payment.id, payment.order_id);
      }
    }

    // Mark as processed
    await prisma.paymentWebhookEvent.update({
      where: { id: webhookRecord.id },
      data: { processedAt: new Date() },
    });

    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook processing error', { error: err });
    next(err);
  }
});

async function handlePaymentCaptured(
  providerPaymentId: string,
  providerOrderId: string
): Promise<void> {
  const payment = await prisma.payment.findFirst({
    where: { providerOrderId },
    include: { order: true },
  });

  if (!payment) {
    logger.warn('Payment not found for webhook', { providerOrderId });
    return;
  }

  if (payment.status === 'PAID') {
    logger.info('Payment already processed', { paymentId: payment.id });
    return;
  }

  const commission = getCommissionBreakdown(payment.order.winningBidPaise);

  await prisma.$transaction(async (tx) => {
    // Update payment status
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID', providerPaymentId },
    });

    // Update order status
    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        status: 'PAID',
        commissionPaise: commission.commissionPaise,
        sellerProceedsPaise: commission.sellerProceedsPaise,
      },
    });

    // Update auction status
    await tx.auction.update({
      where: { id: payment.order.auctionId },
      data: { status: 'SOLD' },
    });

    // Create commission ledger entry (exactly once — upsert on orderId unique constraint)
    await tx.commissionLedger.upsert({
      where: { orderId: payment.orderId },
      create: {
        orderId: payment.orderId,
        commissionRateBasisPoints: commission.commissionRateBasisPoints,
        grossAmountPaise: commission.grossAmountPaise,
        commissionPaise: commission.commissionPaise,
        status: 'RECOGNIZED',
      },
      update: {}, // Never overwrite existing commission record
    });

    // Create seller payout record (pending settlement)
    await tx.sellerPayout.upsert({
      where: { orderId: payment.orderId },
      create: {
        sellerId: payment.order.sellerId,
        orderId: payment.orderId,
        amountPaise: commission.sellerProceedsPaise,
        status: 'PENDING',
      },
      update: {},
    });

    // Notify buyer
    await tx.notification.create({
      data: {
        userId: payment.order.buyerId,
        type: 'PAYMENT_SUCCESS',
        title: 'Payment successful!',
        message: 'Your payment was received. The seller will prepare your item.',
        data: { orderId: payment.orderId },
      },
    });

    // Notify seller
    await tx.notification.create({
      data: {
        userId: payment.order.sellerId,
        type: 'PAYOUT_UPDATE',
        title: 'Sale confirmed!',
        message: `Your item sold. Proceeds of ₹${(commission.sellerProceedsPaise / 100).toFixed(0)} are pending settlement.`,
        data: { orderId: payment.orderId },
      },
    });
  });

  logger.info('Payment processed successfully', { paymentId: payment.id });
}
