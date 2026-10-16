import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    email: string;
    password: string;
}, {
    name: string;
    email: string;
    password: string;
}>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const forgotPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    token: string;
}, {
    password: string;
    token: string;
}>;
export declare const updateProfileSchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    locality: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    displayName?: string | undefined;
    bio?: string | undefined;
    city?: string | undefined;
    locality?: string | undefined;
}, {
    displayName?: string | undefined;
    bio?: string | undefined;
    city?: string | undefined;
    locality?: string | undefined;
}>;
export declare const AUCTION_DURATIONS_HOURS: readonly [6, 12, 24, 72];
export declare const auctionStep1Schema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    categoryId: z.ZodString;
    condition: z.ZodEnum<["NEW", "LIKE_NEW", "GOOD", "FAIR", "FOR_PARTS"]>;
    brand: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    locationLocality: z.ZodEnum<["Indiranagar", "Koramangala", "Whitefield", "Electronic City", "Jayanagar", "JP Nagar", "Malleshwaram", "Rajajinagar", "Hebbal", "Yelahanka", "Bannerghatta Road", "HSR Layout", "BTM Layout", "Bellandur", "Marathahalli", "Sarjapur Road", "Silk Board", "Basavanagudi", "Shivajinagar", "MG Road", "Brigade Road", "Richmond Town", "Lavelle Road", "Cunningham Road", "Other"]>;
    pickupAvailable: z.ZodDefault<z.ZodBoolean>;
    deliveryAvailable: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "FOR_PARTS";
    locationLocality: "Indiranagar" | "Koramangala" | "Whitefield" | "Electronic City" | "Jayanagar" | "JP Nagar" | "Malleshwaram" | "Rajajinagar" | "Hebbal" | "Yelahanka" | "Bannerghatta Road" | "HSR Layout" | "BTM Layout" | "Bellandur" | "Marathahalli" | "Sarjapur Road" | "Silk Board" | "Basavanagudi" | "Shivajinagar" | "MG Road" | "Brigade Road" | "Richmond Town" | "Lavelle Road" | "Cunningham Road" | "Other";
    categoryId: string;
    pickupAvailable: boolean;
    deliveryAvailable: boolean;
    brand?: string | undefined;
    model?: string | undefined;
}, {
    title: string;
    description: string;
    condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "FOR_PARTS";
    locationLocality: "Indiranagar" | "Koramangala" | "Whitefield" | "Electronic City" | "Jayanagar" | "JP Nagar" | "Malleshwaram" | "Rajajinagar" | "Hebbal" | "Yelahanka" | "Bannerghatta Road" | "HSR Layout" | "BTM Layout" | "Bellandur" | "Marathahalli" | "Sarjapur Road" | "Silk Board" | "Basavanagudi" | "Shivajinagar" | "MG Road" | "Brigade Road" | "Richmond Town" | "Lavelle Road" | "Cunningham Road" | "Other";
    categoryId: string;
    brand?: string | undefined;
    model?: string | undefined;
    pickupAvailable?: boolean | undefined;
    deliveryAvailable?: boolean | undefined;
}>;
export declare const auctionStep2Schema: z.ZodObject<{
    startingPriceInr: z.ZodNumber;
    minimumIncrementInr: z.ZodNumber;
    durationHours: z.ZodUnion<[z.ZodLiteral<6>, z.ZodLiteral<12>, z.ZodLiteral<24>, z.ZodLiteral<72>]>;
    scheduledStartAt: z.ZodOptional<z.ZodString>;
    reservePriceInr: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    startingPriceInr: number;
    minimumIncrementInr: number;
    durationHours: 24 | 6 | 12 | 72;
    scheduledStartAt?: string | undefined;
    reservePriceInr?: number | null | undefined;
}, {
    startingPriceInr: number;
    minimumIncrementInr: number;
    durationHours: 24 | 6 | 12 | 72;
    scheduledStartAt?: string | undefined;
    reservePriceInr?: number | null | undefined;
}>;
export declare const createAuctionSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    categoryId: z.ZodString;
    condition: z.ZodEnum<["NEW", "LIKE_NEW", "GOOD", "FAIR", "FOR_PARTS"]>;
    brand: z.ZodOptional<z.ZodString>;
    model: z.ZodOptional<z.ZodString>;
    locationLocality: z.ZodEnum<["Indiranagar", "Koramangala", "Whitefield", "Electronic City", "Jayanagar", "JP Nagar", "Malleshwaram", "Rajajinagar", "Hebbal", "Yelahanka", "Bannerghatta Road", "HSR Layout", "BTM Layout", "Bellandur", "Marathahalli", "Sarjapur Road", "Silk Board", "Basavanagudi", "Shivajinagar", "MG Road", "Brigade Road", "Richmond Town", "Lavelle Road", "Cunningham Road", "Other"]>;
    pickupAvailable: z.ZodDefault<z.ZodBoolean>;
    deliveryAvailable: z.ZodDefault<z.ZodBoolean>;
} & {
    startingPriceInr: z.ZodNumber;
    minimumIncrementInr: z.ZodNumber;
    durationHours: z.ZodUnion<[z.ZodLiteral<6>, z.ZodLiteral<12>, z.ZodLiteral<24>, z.ZodLiteral<72>]>;
    scheduledStartAt: z.ZodOptional<z.ZodString>;
    reservePriceInr: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "FOR_PARTS";
    locationLocality: "Indiranagar" | "Koramangala" | "Whitefield" | "Electronic City" | "Jayanagar" | "JP Nagar" | "Malleshwaram" | "Rajajinagar" | "Hebbal" | "Yelahanka" | "Bannerghatta Road" | "HSR Layout" | "BTM Layout" | "Bellandur" | "Marathahalli" | "Sarjapur Road" | "Silk Board" | "Basavanagudi" | "Shivajinagar" | "MG Road" | "Brigade Road" | "Richmond Town" | "Lavelle Road" | "Cunningham Road" | "Other";
    categoryId: string;
    pickupAvailable: boolean;
    deliveryAvailable: boolean;
    startingPriceInr: number;
    minimumIncrementInr: number;
    durationHours: 24 | 6 | 12 | 72;
    brand?: string | undefined;
    model?: string | undefined;
    scheduledStartAt?: string | undefined;
    reservePriceInr?: number | null | undefined;
}, {
    title: string;
    description: string;
    condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "FOR_PARTS";
    locationLocality: "Indiranagar" | "Koramangala" | "Whitefield" | "Electronic City" | "Jayanagar" | "JP Nagar" | "Malleshwaram" | "Rajajinagar" | "Hebbal" | "Yelahanka" | "Bannerghatta Road" | "HSR Layout" | "BTM Layout" | "Bellandur" | "Marathahalli" | "Sarjapur Road" | "Silk Board" | "Basavanagudi" | "Shivajinagar" | "MG Road" | "Brigade Road" | "Richmond Town" | "Lavelle Road" | "Cunningham Road" | "Other";
    categoryId: string;
    startingPriceInr: number;
    minimumIncrementInr: number;
    durationHours: 24 | 6 | 12 | 72;
    brand?: string | undefined;
    model?: string | undefined;
    pickupAvailable?: boolean | undefined;
    deliveryAvailable?: boolean | undefined;
    scheduledStartAt?: string | undefined;
    reservePriceInr?: number | null | undefined;
}>;
export declare const placeBidSchema: z.ZodObject<{
    amountPaise: z.ZodNumber;
    requestId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    amountPaise: number;
    requestId: string;
}, {
    amountPaise: number;
    requestId: string;
}>;
export declare const auctionSearchSchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["LIVE", "SCHEDULED", "ENDED", "SOLD"]>>;
    condition: z.ZodOptional<z.ZodEnum<["NEW", "LIKE_NEW", "GOOD", "FAIR", "FOR_PARTS"]>>;
    locality: z.ZodOptional<z.ZodString>;
    minPriceInr: z.ZodOptional<z.ZodNumber>;
    maxPriceInr: z.ZodOptional<z.ZodNumber>;
    sortBy: z.ZodDefault<z.ZodEnum<["newest", "ending_soon", "price_asc", "price_desc", "bids"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    pageSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sortBy: "newest" | "ending_soon" | "price_asc" | "price_desc" | "bids";
    page: number;
    pageSize: number;
    status?: "SCHEDULED" | "LIVE" | "ENDED" | "SOLD" | undefined;
    condition?: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "FOR_PARTS" | undefined;
    category?: string | undefined;
    locality?: string | undefined;
    q?: string | undefined;
    minPriceInr?: number | undefined;
    maxPriceInr?: number | undefined;
}, {
    status?: "SCHEDULED" | "LIVE" | "ENDED" | "SOLD" | undefined;
    condition?: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "FOR_PARTS" | undefined;
    category?: string | undefined;
    locality?: string | undefined;
    q?: string | undefined;
    minPriceInr?: number | undefined;
    maxPriceInr?: number | undefined;
    sortBy?: "newest" | "ending_soon" | "price_asc" | "price_desc" | "bids" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AuctionStep1Input = z.infer<typeof auctionStep1Schema>;
export type AuctionStep2Input = z.infer<typeof auctionStep2Schema>;
export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;
export type PlaceBidInput = z.infer<typeof placeBidSchema>;
export type AuctionSearchInput = z.infer<typeof auctionSearchSchema>;
//# sourceMappingURL=schemas.d.ts.map