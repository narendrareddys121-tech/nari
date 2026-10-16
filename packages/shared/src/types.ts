// ─────────────────────────────────────────────────────────────────────────────
// BidRush Shared — TypeScript Types
// These types mirror the Prisma schema for use in both frontend and backend.
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'USER' | 'ADMIN';

export type UserStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'DELETED';

export type SellerVerificationStatus =
  | 'UNVERIFIED'
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';

export type AuctionStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'SCHEDULED'
  | 'LIVE'
  | 'ENDED'
  | 'AWAITING_PAYMENT'
  | 'SOLD'
  | 'UNSOLD'
  | 'CANCELLED'
  | 'DISPUTED';

export type AuctionCondition =
  | 'NEW'
  | 'LIKE_NEW'
  | 'GOOD'
  | 'FAIR'
  | 'FOR_PARTS';

export type OrderStatus =
  | 'AWAITING_PAYMENT'
  | 'PAID'
  | 'READY_FOR_PICKUP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type CommissionStatus =
  | 'PENDING'
  | 'RECOGNIZED'
  | 'REVERSED';

export type PayoutStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED';

export type NotificationType =
  | 'AUCTION_APPROVED'
  | 'AUCTION_REJECTED'
  | 'NEW_BID_ON_YOUR_AUCTION'
  | 'YOU_ARE_OUTBID'
  | 'AUCTION_ENDING_SOON'
  | 'AUCTION_WON'
  | 'AUCTION_LOST'
  | 'PAYMENT_DUE'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'ORDER_STATUS_CHANGED'
  | 'REFUND_UPDATE'
  | 'DISPUTE_UPDATE'
  | 'PAYOUT_UPDATE';

// ─── Public API Types ──────────────────────────────────────────────────────

export interface PublicUser {
  id: string;
  name: string;
  createdAt: string;
  profile?: {
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    city: string | null;
    locality: string | null;
  };
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: string | null;
  sellerStatus: SellerVerificationStatus;
  createdAt: string;
  profile?: {
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    city: string | null;
    locality: string | null;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  children?: Category[];
}

export interface AuctionImage {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

export interface Auction {
  id: string;
  title: string;
  slug: string;
  description: string;
  condition: AuctionCondition;
  startingPricePaise: number;
  currentPricePaise: number;
  minimumIncrementPaise: number;
  // reservePricePaise is NEVER sent to public clients
  startsAt: string;
  endsAt: string;
  status: AuctionStatus;
  locationCity: string;
  locationLocality: string;
  categoryId: string;
  category?: Category;
  hostId: string;
  host?: PublicUser;
  images: AuctionImage[];
  bidCount: number;
  isWatchlisted?: boolean;
  createdAt: string;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidder?: PublicUser;
  amountPaise: number;
  createdAt: string;
}

export interface Order {
  id: string;
  auctionId: string;
  auction?: Pick<Auction, 'id' | 'title' | 'slug' | 'images'>;
  buyerId: string;
  sellerId: string;
  winningBidPaise: number;
  commissionPaise: number;
  sellerProceedsPaise: number;
  status: OrderStatus;
  paymentDeadline: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── API Response Wrappers ───────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Socket.IO Events ────────────────────────────────────────────────────────

export interface BidPlacedEvent {
  auctionId: string;
  bid: Bid;
  currentPricePaise: number;
  nextMinimumBidPaise: number;
}

export interface OutbidEvent {
  auctionId: string;
  yourBidPaise: number;
  newHighestBidPaise: number;
}

export interface AuctionEndedEvent {
  auctionId: string;
  status: 'SOLD' | 'UNSOLD';
  winnerUserId?: string;
  winningBidPaise?: number;
}

export interface AuctionUpdatedEvent {
  auctionId: string;
  currentPricePaise: number;
  bidCount: number;
  status: AuctionStatus;
}
