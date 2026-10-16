import { Router } from 'express';
import { prisma } from '../config/prisma.js';

export const categoriesRouter = Router();

// GET /api/v1/categories
categoriesRouter.get('/', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
        _count: { select: { auctions: { where: { status: { in: ['LIVE', 'SCHEDULED'] } } } } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});
