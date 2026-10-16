import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../config/prisma.js';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';

export const notificationsRouter = Router();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /api/v1/notifications
notificationsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const pagination = paginationSchema.safeParse(req.query);
    if (!pagination.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid notification pagination', pagination.error.errors);
    }
    const { page, pageSize } = pagination.data;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where: { userId: req.user!.id } }),
      prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/notifications/:id/read
notificationsRouter.post('/:id/read', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/notifications/read-all
notificationsRouter.post('/read-all', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
