import { Router } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export const uploadsRouter = Router();

// Configure Cloudinary if credentials are available
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

// Use memory storage so we can stream to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 8,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only JPEG, PNG, and WebP images are allowed'));
      return;
    }
    cb(null, true);
  },
});

// POST /api/v1/uploads/auction-images/:auctionId
uploadsRouter.post(
  '/auction-images/:auctionId',
  requireAuth,
  upload.array('images', 8),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { auctionId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new AppError(400, 'NO_FILES', 'Please upload at least one image');
      }
      if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
        throw new AppError(503, 'IMAGE_STORAGE_NOT_CONFIGURED', 'Product image storage is not configured. Set Cloudinary credentials before uploading.');
      }

      // Verify auction belongs to this user
      const auction = await prisma.auction.findFirst({
        where: { id: auctionId, hostId: req.user!.id },
        include: { images: true },
      });
      if (!auction) throw new AppError(404, 'NOT_FOUND', 'Auction not found');

      const existingCount = auction.images.length;
      if (existingCount + files.length > 8) {
        throw new AppError(400, 'TOO_MANY_IMAGES', `Maximum 8 images per auction. You already have ${existingCount}.`);
      }

      const uploadedImages = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Upload to Cloudinary
        const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
          (resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                {
                  folder: `bidrush/auctions/${auctionId}`,
                  resource_type: 'image',
                  transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result as any);
                }
              )
              .end(file.buffer);
          }
        );

        const image = await prisma.auctionImage.create({
          data: {
            auctionId,
            imageUrl: uploadResult.secure_url,
            storageKey: uploadResult.public_id,
            sortOrder: existingCount + i,
          },
        });
        uploadedImages.push(image);
      }

      res.status(201).json({ success: true, data: uploadedImages });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/uploads/auction-images/:imageId
uploadsRouter.delete(
  '/auction-images/:imageId',
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const image = await prisma.auctionImage.findFirst({
        where: { id: req.params.imageId },
        include: { auction: { select: { hostId: true, status: true } } },
      });

      if (!image) throw new AppError(404, 'NOT_FOUND', 'Image not found');
      if (image.auction.hostId !== req.user!.id) throw new AppError(403, 'FORBIDDEN', 'Not your auction');
      if (image.auction.status === 'LIVE') {
        throw new AppError(400, 'AUCTION_LIVE', 'Cannot remove images from a live auction');
      }

      // Delete from Cloudinary if configured
      if (env.CLOUDINARY_CLOUD_NAME && !image.storageKey.startsWith('dev_placeholder_')) {
        await cloudinary.uploader.destroy(image.storageKey).catch((e) => {
          logger.warn('Failed to delete from Cloudinary', { key: image.storageKey, error: e });
        });
      }

      await prisma.auctionImage.delete({ where: { id: image.id } });

      res.json({ success: true, message: 'Image removed' });
    } catch (err) {
      next(err);
    }
  }
);
