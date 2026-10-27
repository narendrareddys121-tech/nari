# BidRush High-Level Design (HLD)

## 1. Purpose

BidRush is a web-based auction marketplace focused on Bengaluru, India. This document describes the current system boundaries, major components, data flow, and operational concerns. It reflects the repository as it exists today; external integrations may require credentials and configuration before they are active.

## 2. Goals and scope

The platform supports browsing and searching auctions, account registration and sign-in, seller listings, real-time bidding, auction completion, winner checkout, notifications, and administrative workflows. Prices are represented in paise internally and displayed in INR.

The product is currently implemented as a modular monolith in a pnpm workspace. The web client and API are separate applications, but the API, database, Socket.IO server, and scheduled auction worker run together in the API process.

## 3. System context

```text
                         +----------------------+
                         |  Browser / Web user  |
                         +----------+-----------+
                                    |
                         HTTPS / HTTP, cookies
                                    |
                         +----------v-----------+
                         | Next.js 14 web app   |
                         | apps/web             |
                         +----------+-----------+
                                    |
                     REST API + Socket.IO events
                                    |
                         +----------v-----------+
                         | Express API          |
                         | apps/api             |
                         | routes, middleware,  |
                         | worker, Socket.IO    |
                         +----+----------+------+
                              |          |
                  Prisma ORM  |          | HTTPS integrations
                              |          +------ Cloudinary
                    +---------v----+     +------ Razorpay
                    | PostgreSQL   |     +------ Google OAuth
                    |              |     +------ SMTP/email
                    +--------------+
```

## 4. Components

### Web application

- Next.js 14 App Router with React and TypeScript.
- Renders public auction discovery/detail pages and authenticated user, seller, and admin experiences.
- Calls the versioned API under `/api/v1`; the frontend API helper and environment configuration provide the connection settings.
- Uses Socket.IO client events for live auction updates and notifications.
- Uses shared TypeScript types and Zod schemas from `packages/shared`.

### API application

- Express and TypeScript application started by `apps/api/src/server.ts`.
- Exposes REST endpoints under `/api/v1`.
- Applies security headers, CORS, JSON and form parsing, cookie parsing, request logging, global rate limiting, and centralized not-found/error handling.
- Uses middleware for authentication, optional authentication, and request validation.
- Serves a health endpoint that reports database connectivity and latency.
- Hosts Socket.IO on the same HTTP server as the REST API.
- Starts a scheduled auction worker in the API process.

### Shared package

- Contains public domain and API response types, Zod request schemas, and financial utilities.
- Provides a common contract to the web and API workspaces.

### Data store

- PostgreSQL is the source of truth for users, listings, bids, orders, payments, notifications, and administrative records.
- Prisma provides schema management, migrations, and typed database access.
- Monetary values are stored as integer paise to avoid floating-point currency calculations.

## 5. Key flows

### Browse and list auctions

1. The browser requests a listing page or an individual auction from the web app.
2. The web app calls the auction REST endpoints.
3. The API validates search parameters, queries PostgreSQL through Prisma, and returns a paginated response.
4. Public auction projections omit the reserve price. Optional authentication can add the viewer's watchlist state.

### Place a bid

1. A signed-in user submits an amount in paise and a unique request ID.
2. The API validates the request and opens a database transaction.
3. The transaction locks the auction row, checks that the auction is live, verifies bid eligibility and the minimum amount, creates the bid, and updates the current price.
4. After the transaction commits, the API broadcasts the bid to the auction's Socket.IO room and sends outbid updates to the prior highest bidder.

### End an auction

1. The worker checks once per minute for live auctions past their end time and scheduled auctions ready to start.
2. For an ended auction, it rechecks the state in a transaction and selects the highest bid.
3. If there is no qualifying bid (including a reserve-price failure), it marks the auction unsold. Otherwise, it creates or reuses the order, marks the auction as awaiting payment, and notifies the buyer and host.
4. Auction and notification events are broadcast to connected clients.

### Complete payment

1. The winning buyer checks out an order through the API.
2. The configured payment provider handles payment outside the platform.
3. Provider webhook events are received by the payments endpoint and recorded for processing.
4. Order/payment completion depends on configured provider credentials and valid webhook delivery.

## 6. External systems

| Integration | Purpose | Configuration |
|---|---|---|
| Google OAuth | Optional Google sign-in | Google client ID, secret, and callback URL |
| Cloudinary | Auction image storage | Cloudinary cloud name, key, and secret |
| Razorpay | Payment processing | Razorpay key, secret, and webhook secret |
| SMTP | Transactional email | SMTP host, port, user, password, and sender |

Development may use local or console fallbacks for some integrations. Production deployments must configure the services they intend to use.

## 7. Security and reliability

- Authentication uses signed access and refresh tokens delivered through HTTP-only cookies; session records are stored in PostgreSQL.
- Passwords are hashed with Argon2id in the authentication service.
- API requests use Helmet security headers, a configured CORS origin, request-size limits, and rate limiting.
- Shared Zod schemas validate common request shapes. Route middleware applies authentication and validation where appropriate.
- Bid writes use a database transaction and row lock to serialize concurrent bids. A unique request ID supports idempotent bid retries.
- The reserve price is deliberately excluded from public auction responses.
- Payment webhooks must be verified using provider-specific signatures and secrets before acting on payment state.
- The health endpoint checks database availability; application logs use Winston.
- In-memory rate limiting and the in-process scheduled worker are single-instance mechanisms. Multi-instance production scaling requires shared coordination or a dedicated worker strategy.

## 8. Deployment view

The repository supports running the web app and API as separate processes. PostgreSQL may run locally or as a managed service. A production deployment should:

- Serve the web app and API over HTTPS.
- Configure the API's allowed web origin and the web app's API base URL.
- Provide durable PostgreSQL storage and apply Prisma migrations during deployment.
- Configure OAuth, payment, image, and email integrations as applicable.
- Ensure that only one coordinated auction-worker execution processes a given auction when running multiple API instances.
- Use an appropriate production image-storage configuration rather than relying on local uploads.

## 9. Important constraints and assumptions

- Product location defaults and supported listing localities are Bengaluru-oriented.
- Auction durations currently offered by the shared validation schema are 6, 12, 24, or 72 hours.
- The API, Socket.IO transport, and auction worker are currently coupled to the API process.
- No throughput, availability, or recovery-time targets are defined in the repository; these should be established before production scale commitments.
