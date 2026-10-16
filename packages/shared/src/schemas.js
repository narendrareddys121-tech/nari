"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auctionSearchSchema = exports.placeBidSchema = exports.createAuctionSchema = exports.auctionStep2Schema = exports.auctionStep1Schema = exports.AUCTION_DURATIONS_HOURS = exports.updateProfileSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// ─────────────────────────────────────────────────────────────────────────────
// BidRush Shared — Zod Validation Schemas
// These are used for validation on BOTH frontend and backend.
// ─────────────────────────────────────────────────────────────────────────────
// ─── Auth Schemas ─────────────────────────────────────────────────────────────
exports.registerSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be under 100 characters')
        .trim(),
    email: zod_1.z.string().email('Please enter a valid email address').toLowerCase().trim(),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be under 128 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Please enter a valid email').toLowerCase().trim(),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Please enter a valid email').toLowerCase().trim(),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
    password: zod_1.z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must be under 128 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
});
// ─── Profile Schemas ───────────────────────────────────────────────────────────
exports.updateProfileSchema = zod_1.z.object({
    displayName: zod_1.z.string().max(100).trim().optional(),
    bio: zod_1.z.string().max(500).trim().optional(),
    city: zod_1.z.string().max(100).trim().optional(),
    locality: zod_1.z.string().max(200).trim().optional(),
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
];
exports.AUCTION_DURATIONS_HOURS = [6, 12, 24, 72]; // 6h, 12h, 24h, 3 days
exports.auctionStep1Schema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(5, 'Title must be at least 5 characters')
        .max(200, 'Title must be under 200 characters')
        .trim(),
    description: zod_1.z
        .string()
        .min(20, 'Description must be at least 20 characters')
        .max(5000, 'Description must be under 5000 characters')
        .trim(),
    categoryId: zod_1.z.string().uuid('Please select a valid category'),
    condition: zod_1.z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'FOR_PARTS'], {
        errorMap: () => ({ message: 'Please select a condition' }),
    }),
    brand: zod_1.z.string().max(100).trim().optional(),
    model: zod_1.z.string().max(100).trim().optional(),
    locationLocality: zod_1.z.enum(BENGALURU_LOCALITIES, {
        errorMap: () => ({ message: 'Please select a Bengaluru locality' }),
    }),
    pickupAvailable: zod_1.z.boolean().default(true),
    deliveryAvailable: zod_1.z.boolean().default(false),
});
exports.auctionStep2Schema = zod_1.z.object({
    startingPriceInr: zod_1.z
        .number({ invalid_type_error: 'Starting price must be a number' })
        .min(1, 'Starting price must be at least ₹1')
        .max(10000000, 'Starting price cannot exceed ₹1 crore'),
    minimumIncrementInr: zod_1.z
        .number({ invalid_type_error: 'Minimum increment must be a number' })
        .min(1, 'Minimum increment must be at least ₹1')
        .max(100000, 'Minimum increment cannot exceed ₹1 lakh'),
    durationHours: zod_1.z.union([
        zod_1.z.literal(6),
        zod_1.z.literal(12),
        zod_1.z.literal(24),
        zod_1.z.literal(72),
    ], {
        errorMap: () => ({ message: 'Please select a valid auction duration' }),
    }),
    scheduledStartAt: zod_1.z.string().datetime().optional(),
    reservePriceInr: zod_1.z
        .number()
        .min(0)
        .max(10000000)
        .optional()
        .nullable(),
});
exports.createAuctionSchema = exports.auctionStep1Schema.merge(exports.auctionStep2Schema);
// ─── Bid Schema ────────────────────────────────────────────────────────────────
exports.placeBidSchema = zod_1.z.object({
    amountPaise: zod_1.z
        .number({ invalid_type_error: 'Bid amount must be a number' })
        .int('Bid amount must be a whole number in paise')
        .min(100, 'Bid amount must be at least ₹1'),
    requestId: zod_1.z.string().uuid('Request ID must be a valid UUID'),
});
// ─── Search Schema ──────────────────────────────────────────────────────────────
exports.auctionSearchSchema = zod_1.z.object({
    q: zod_1.z.string().max(200).optional(),
    category: zod_1.z.string().optional(),
    status: zod_1.z
        .enum(['LIVE', 'SCHEDULED', 'ENDED', 'SOLD'])
        .optional(),
    condition: zod_1.z
        .enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'FOR_PARTS'])
        .optional(),
    locality: zod_1.z.string().optional(),
    minPriceInr: zod_1.z.coerce.number().min(0).optional(),
    maxPriceInr: zod_1.z.coerce.number().min(0).optional(),
    sortBy: zod_1.z
        .enum(['newest', 'ending_soon', 'price_asc', 'price_desc', 'bids'])
        .default('newest'),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(50).default(20),
});
//# sourceMappingURL=schemas.js.map