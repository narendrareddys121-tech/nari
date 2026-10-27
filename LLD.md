# BidRush Low-Level Design (LLD)

## 1. Purpose and conventions

This document records the implementation-level contracts used by the current BidRush codebase. The repository is a pnpm monorepo:

```text
apps/web/       Next.js frontend
apps/api/       Express API, Socket.IO server, Prisma schema, auction worker
packages/shared Shared types, validation schemas, and financial utilities
```

The REST API prefix is `/api/v1`. Successful API responses use `{ success: true, data, message? }`; failures use `{ success: false, error: { code, message, details? } }`. Monetary amounts crossing the API are integer paise unless a request schema explicitly accepts INR for user-facing listing fields.

## 2. API composition and middleware

`apps/api/src/app.ts` creates the Express application and configures, in order:

1. Helmet response headers.
2. Credentialed CORS restricted to `WEB_ORIGIN`.
3. Raw parsing for the payment webhook, then bounded JSON and URL-encoded parsing.
4. Cookie parsing and local-upload static serving.
5. Request logging outside test mode.
6. A global rate limit.
7. `/api/v1/health`.
8. Feature routers.
9. Not-found and centralized error handlers.

The HTTP server and Socket.IO are created together in `apps/api/src/server.ts`. Startup verifies database connectivity before listening. The same entry point starts the auction worker and performs a graceful shutdown of the HTTP server and Prisma client.

## 3. REST route groups

All paths below are relative to `/api/v1`. Authentication requirements are enforced by route middleware; public read endpoints can use optional authentication to personalize results.

| Router | Representative endpoints | Purpose |
|---|---|---|
| `auth` | `GET /google/start`, `GET /google/callback`, `POST /register`, `/login`, `/logout`, `/refresh`, `GET /me`, password and email verification routes | Local and Google authentication, sessions, account recovery |
| `users` | `GET /me`, `PATCH /me`, `GET /me/auctions`, `GET /me/bids` | Profile and current-user activity |
| `auctions` | `GET /`, `GET /:id`, `POST /`, `PATCH /:id`, `POST /:id/publish`, `POST /:id/cancel`, `GET /:id/bids`, `POST /:id/bids` | Search, listing lifecycle, bid history and bidding |
| `categories` | `GET /` | Active category hierarchy |
| `watchlist` | `GET /`, `POST /:auctionId`, `DELETE /:auctionId` | User watchlist |
| `orders` | `GET /`, `GET /:id`, `POST /:id/checkout` | Buyer/seller orders and checkout |
| `payments` | `POST /webhook` | Payment-provider webhook processing |
| `notifications` | `GET /`, `POST /:id/read`, `POST /read-all` | Persisted in-app notifications |
| `seller` | `GET /verification`, `POST /verification/request`, `GET /earnings`, `GET /payouts` | Seller verification and financial views |
| `uploads` | Image upload and deletion routes | Auction image lifecycle |
| `admin` | Dashboard, users, seller verification, auctions, orders, financial reports, disputes, listing reports | Administrative operations |

The route implementation is the definitive source for request parameters, authorization, and response fields.

## 4. Validation and shared contracts

`packages/shared/src/schemas.ts` provides reusable Zod schemas for:

- Registration, login, password recovery, and profile updates.
- Auction details and pricing/scheduling fields.
- Bid amounts and request IDs.
- Auction search and pagination.

Auction search defaults to newest-first, page 1, and page size 20 (maximum 50). Auction creation validates supported conditions and Bengaluru localities. The offered duration values are 6, 12, 24, and 72 hours. Bid requests contain `amountPaise` (integer, at least 100) and a UUID `requestId`.

`packages/shared/src/types.ts` contains client-facing entities and response types. The `Auction` public type excludes `reservePricePaise`, consistent with the API's public projection.

## 5. Persistence model

The authoritative schema is `apps/api/prisma/schema.prisma`. Main entities and relationships:

- **User** has an optional profile and seller-verification record, and owns sessions, auctions, bids, watchlist entries, orders, notifications, reviews, and audit records.
- **Category** supports a parent/child hierarchy and groups auctions.
- **Auction** belongs to a host and category; has images and bids; can have one order. It stores lifecycle status, start/end timestamps, locality, current and starting prices, minimum increment, and a private optional reserve price.
- **Bid** belongs to an auction and bidder. `requestId` is unique for request idempotency. Indexes support per-auction chronology and highest-bid lookups.
- **Watchlist** joins users and auctions, with a unique `(userId, auctionId)` constraint.
- **Order** represents the winning transaction; `auctionId` is unique. It stores buyer, seller, winning amount, commission, seller proceeds, status, and payment deadline.
- **Payment** records provider identifiers, amount, status, and a unique idempotency key.
- **CommissionLedger**, **SellerPayout**, and **PaymentWebhookEvent** track financial accounting, disbursement, and webhook deduplication.
- **Notification** is persisted per user and indexed for unread and recent-notification queries.
- **Review**, **Dispute**, **ListingReport**, and **AuditLog** support trust, moderation, and traceability.

Database identifiers use Prisma `cuid()` defaults. Monetary columns use integer paise. Foreign-key relations and unique constraints enforce key integrity at the database layer.

## 6. Bid placement algorithm

Implemented in `apps/api/src/routes/auctions.routes.ts`:

1. Validate the body using `placeBidSchema`.
2. Look up `requestId`; return the already recorded bid if it exists.
3. Begin a Prisma transaction and issue `SELECT ... FOR UPDATE` for the target auction row.
4. Reject if the auction is missing, not `LIVE`, past its end time, or owned by the bidder.
5. Calculate the minimum bid: current price for the first bid; otherwise current price plus the configured increment.
6. Read the previous highest bid, create the new bid, and update the auction's current price.
7. If a different user held the previous highest bid, persist an outbid notification in the transaction.
8. After commit, broadcast `auction:bid_placed`, `auction:outbid`, and the persisted notification as applicable.
9. Return the bid and the next minimum bid.

The auction-row lock serializes competing bids for one auction. The unique request ID constraint is a second line of defense for retries. Reusing the same request ID for a different auction or payload is not a supported client behavior.

## 7. Auction lifecycle worker

`apps/api/src/workers/auction.worker.ts` schedules a task every minute:

- Activates scheduled auctions whose `startsAt` has passed.
- Finds live auctions whose `endsAt` has passed.
- Rechecks each candidate inside a transaction before changing it, preventing duplicate processing after concurrent worker attempts.
- Chooses the highest bid and checks the optional reserve price.
- Marks an auction `UNSOLD` if no qualifying bid exists.
- Otherwise, computes the commission breakdown using the shared financial utility, upserts a single order per auction, sets the auction to `AWAITING_PAYMENT`, and sets a 48-hour payment deadline.
- Persists notifications for the relevant users and broadcasts auction/notification events.

Worker failures are logged per auction so processing can continue for other ended auctions. Since scheduling is in-process, production deployments with multiple API replicas need deployment-level coordination or a shared job queue/lock.

## 8. Authentication and authorization

- Access and refresh tokens are signed using separate configured secrets and expiration settings.
- The auth service stores refresh sessions in PostgreSQL and sets authentication cookies.
- Password login uses Argon2id hashes.
- Google OAuth uses the authorization-code flow and explicitly requests account selection.
- `requireAuth` protects authenticated routes; `optionalAuth` allows public routes to personalize output.
- Role and status values are represented in the Prisma and shared domain enums. Admin and seller authorization checks are applied by the relevant route implementations.

## 9. Socket.IO contract

Socket.IO is mounted on the API HTTP server and uses the configured web origin for credentialed connections. If a token is available, the connection middleware verifies it; unauthenticated clients may connect for read-only updates.

| Event | Direction | Payload/behavior |
|---|---|---|
| `auction:join` | Client to server | Auction ID; joins `auction:<id>` after existence check |
| `auction:state` | Server to client | Current price, status, and end time after joining |
| `auction:leave` | Client to server | Leaves the auction room |
| `auction:bid_placed` | Server to room | Auction ID, bid, current price, next minimum bid |
| `auction:outbid` | Server to user room | Auction ID, prior bid, new highest bid |
| `notification:new` | Server to user room | Persisted notification |
| `auction:ended` | Server to room | Final status and optional winner/amount |

Room names are `auction:<auctionId>` and `user:<userId>`. User-room membership requires a verified socket token.

## 10. Configuration and operational behavior

Environment variables are validated at API startup in `apps/api/src/config/env.ts`. `DATABASE_URL` and JWT secrets are required; OAuth, Cloudinary, Razorpay, and SMTP settings are optional at the schema level and should be configured for the corresponding production functionality.

Use the root scripts for workspace tasks: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm db:migrate`, and `pnpm db:seed`. Do not use the development reset script against a production database.
