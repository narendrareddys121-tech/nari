import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// BidRush Shared — Zod Validation Schemas
// These are used for validation on BOTH frontend and backend.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters')
    .trim(),
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be under 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const registerRequestSchema = registerSchema.extend({
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be under 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ─── Profile Schemas ───────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  displayName: z.string().max(100).trim().optional(),
  bio: z.string().max(500).trim().optional(),
  city: z.string().max(100).trim().optional(),
  locality: z.string().max(200).trim().optional(),
});

// ─── Auction Schemas ───────────────────────────────────────────────────────────

const BENGALURU_LOCALITIES = [
  'Indiranagar',
  'Koramangala',
  'Whitefield',
  'Electronic City',
  'Jayanagar',
  'JP Nagar',
  'Malleshwaram',
  'Rajajinagar',
  'Hebbal',
  'Yelahanka',
  'Bannerghatta Road',
  'HSR Layout',
  'BTM Layout',
  'Bellandur',
  'Marathahalli',
  'Sarjapur Road',
  'Silk Board',
  'Basavanagudi',
  'Shivajinagar',
  'MG Road',
  'Brigade Road',
  'Richmond Town',
  'Lavelle Road',
  'Cunningham Road',
  'Other',
] as const;

export const AUCTION_DURATIONS_HOURS = [6, 12, 24, 72] as const; // 6h, 12h, 24h, 3 days

export const auctionStep1Schema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be under 200 characters')
    .trim(),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description must be under 5000 characters')
    .trim(),
  categoryId: z.string().min(1, 'Please select a category'),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'FOR_PARTS'], {
    errorMap: () => ({ message: 'Please select a condition' }),
  }),
  brand: z.string().max(100).trim().optional(),
  model: z.string().max(100).trim().optional(),
  locationLocality: z.enum(BENGALURU_LOCALITIES, {
    errorMap: () => ({ message: 'Please select a Bengaluru locality' }),
  }),
  pickupAvailable: z.boolean().default(true),
  deliveryAvailable: z.boolean().default(false),
});

export const auctionStep2Schema = z.object({
  startingPriceInr: z
    .number({ invalid_type_error: 'Starting price must be a number' })
    .min(1, 'Starting price must be at least ₹1')
    .max(10000000, 'Starting price cannot exceed ₹1 crore'),
  minimumIncrementInr: z
    .number({ invalid_type_error: 'Minimum increment must be a number' })
    .min(1, 'Minimum increment must be at least ₹1')
    .max(100000, 'Minimum increment cannot exceed ₹1 lakh'),
  durationHours: z.union([
    z.literal(6),
    z.literal(12),
    z.literal(24),
    z.literal(72),
  ], {
    errorMap: () => ({ message: 'Please select a valid auction duration' }),
  }),
  scheduledStartAt: z.string().datetime().optional(),
  reservePriceInr: z
    .number()
    .min(0)
    .max(10000000)
    .optional()
    .nullable(),
});

export const createAuctionSchema = auctionStep1Schema.merge(auctionStep2Schema);

// ─── Bid Schema ────────────────────────────────────────────────────────────────

export const placeBidSchema = z.object({
  amountPaise: z
    .number({ invalid_type_error: 'Bid amount must be a number' })
    .int('Bid amount must be a whole number in paise')
    .min(100, 'Bid amount must be at least ₹1'),
  requestId: z.string().uuid('Request ID must be a valid UUID'),
});

// ─── Search Schema ──────────────────────────────────────────────────────────────

export const auctionSearchSchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().optional(),
  status: z
    .enum(['LIVE', 'SCHEDULED', 'ENDED', 'SOLD'])
    .optional(),
  condition: z
    .enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'FOR_PARTS'])
    .optional(),
  locality: z.string().optional(),
  minPriceInr: z.coerce.number().min(0).optional(),
  maxPriceInr: z.coerce.number().min(0).optional(),
  sortBy: z
    .enum(['newest', 'ending_soon', 'price_asc', 'price_desc', 'bids'])
    .default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterRequestInput = z.infer<typeof registerRequestSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AuctionStep1Input = z.infer<typeof auctionStep1Schema>;
export type AuctionStep2Input = z.infer<typeof auctionStep2Schema>;
export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;
export type PlaceBidInput = z.infer<typeof placeBidSchema>;
export type AuctionSearchInput = z.infer<typeof auctionSearchSchema>;
