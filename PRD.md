# BidRush Product Requirements Document (PRD)

## 1. Product summary

BidRush is a Bengaluru-focused online auction marketplace where people can discover local listings, place competitive bids, sell items, and complete a transaction with the winning seller. The product is designed around live auction updates and clear auction, order, and payment states.

## 2. Problem and opportunity

Local buyers and sellers need a convenient way to discover second-hand and new items, compare listings, compete transparently, and coordinate a sale. Static classified listings do not provide a time-bound price-discovery mechanism or clear winner flow. BidRush combines local listings with timed auctions and a post-auction order process.

## 3. Users

| User | Needs |
|---|---|
| Guest / prospective buyer | Browse and search auctions, inspect item details, understand the current price and time remaining, register or sign in to participate |
| Registered buyer / bidder | Place valid bids, follow watched auctions, receive outbid and outcome notifications, pay for a won auction, view orders and bid history |
| Seller / host | Create and manage listings, add item images and condition/location details, track bids and auction outcome, view earnings and payouts |
| Administrator | Review listings and seller verification, manage users, inspect orders and financial reports, handle disputes and reports |

## 4. Product goals

1. Make finding relevant active and upcoming auctions straightforward.
2. Provide an understandable, responsive bidding experience with timely bid updates.
3. Enforce consistent auction and bid rules, including concurrent bid handling.
4. Give buyers and sellers a clear outcome and order-payment next step.
5. Provide moderation and operational tools for a trustworthy marketplace.

### Out of scope for this document

- Guaranteeing a particular transaction volume, availability percentage, or latency target.
- Defining final legal, tax, shipping, refund, or dispute policies.
- Defining seller onboarding/KYC policy beyond the verification workflow represented in the application.
- Specifying a native mobile application; the current product is a web application.

## 5. Functional requirements

### 5.1 Accounts and access

- Users can register with name, email, and password and sign in or out.
- Users can authenticate through Google when OAuth is configured.
- The system supports refreshable sessions and account recovery/email-verification flows.
- Users can view and update their profile.
- Protected actions require authentication. Administrative actions are restricted to authorized administrators.

### 5.2 Auction discovery

- Visitors can browse active and scheduled auctions.
- Users can search by text and filter by category, status, item condition, locality, and price range.
- Users can sort by newest, ending soon, price, or bid count.
- Results are paginated; a page contains no more than 50 items.
- Auction details include description, condition, images, location, current price, timing, host, and bid count.
- A public response must not expose the seller's reserve price.

### 5.3 Seller listings

- A seller can create a listing with title, description, category, condition, location, pricing, duration, and optional reserve price.
- A seller can provide supported item imagery and availability information.
- Sellers can inspect and manage their own listings and request seller verification.
- Listing publication and review outcomes follow the configured auction status workflow.
- Sellers cannot place bids on their own auctions.

### 5.4 Bidding

- Only authenticated users can place bids.
- A bid must be an integer amount in paise and include a unique request ID.
- A bid is accepted only while the auction is live and before its end time.
- The first bid must be at least the auction's current starting price. Later bids must meet the current price plus the minimum increment.
- Concurrent bid submissions must be serialized so the accepted price and bid history remain consistent.
- Retrying a bid with the same request ID must not create another bid.
- Successful bids update the auction price and notify connected auction viewers.
- The previous highest bidder receives an outbid notification when displaced by another user.

### 5.5 Auction close and orders

- Scheduled auctions become live when their start time is reached.
- Auctions are processed after their end time.
- If an auction has no bid or fails its reserve threshold, it ends unsold.
- If a qualifying highest bid exists, the system creates one order for the auction and makes the auction awaiting payment.
- The winning buyer receives a 48-hour payment deadline.
- Buyers and sellers can view their orders and relevant order details.

### 5.6 Payments and seller finances

- A winning buyer can initiate checkout for an eligible order.
- Payment state is updated from payment-provider events, with webhook event IDs used to prevent duplicate processing.
- The order records the winning amount, commission, and seller proceeds.
- Sellers can view earnings and payout information.
- Payment and payout functionality requires provider configuration; successful operation must not be inferred solely from a client-side redirect.

### 5.7 Notifications, watchlists, and trust

- Signed-in users can add and remove auctions from a watchlist.
- Users can view notifications and mark one or all as read.
- Relevant bid, auction, payment, and order events are persisted and broadcast to connected users where supported.
- Administrators can review seller verification, listing reports, and disputes.
- The system records audit information for administrative or system activity where implemented.

## 6. Non-functional requirements

### Security and privacy

- Use HTTPS in production.
- Keep authentication tokens in HTTP-only cookies and protect secrets through environment configuration.
- Hash passwords with a modern password-hashing algorithm.
- Apply input validation, authentication/authorization checks, secure headers, CORS restrictions, request limits, and rate limiting.
- Do not expose private reserve prices or sensitive account/payment credentials in public API responses.
- Verify payment-provider webhook signatures before changing financial state.

### Correctness and integrity

- Store money as integer paise.
- Enforce unique bid request IDs, unique user/auction watchlist pairs, and one order per auction.
- Perform bid acceptance and auction-finalization state transitions transactionally.
- Make retried bid and payment events idempotent.

### Performance and usability

- Paginate auction and administrative collections.
- Use database indexes for commonly queried lifecycle, ownership, price, and time fields.
- Provide responsive web pages and timely live updates for bidding and notifications.
- Keep the API health endpoint available for basic deployment monitoring.

### Maintainability

- Keep web, API, and shared contracts in the existing workspace boundaries.
- Use Prisma migrations for schema changes and shared Zod schemas for reusable request contracts.
- Log server errors and operational failures without logging secrets.

## 7. Key business rules and states

- Auction lifecycle includes draft, review, scheduled, live, ended, awaiting payment, sold, unsold, cancelled, and disputed states.
- Listing eligibility and state transitions must be enforced by the API, not only by the UI.
- An auction's current price and bid history must agree after each accepted bid.
- A single auction can produce at most one winning order.
- The reserve price is a seller/business rule and is not public listing data.
- The current scheduled worker runs once per minute; exact activation and close processing may therefore occur after the boundary time.

## 8. Success measures

Product analytics should track these measures once instrumentation and target values are agreed:

- Visitor-to-registration conversion.
- Search-to-auction-detail engagement.
- Percentage of live auctions receiving at least one valid bid.
- Bid placement success rate and rejected-bid reasons.
- Auction-to-order conversion and payment completion within the deadline.
- Seller listing completion and moderation turnaround.
- Notification delivery and engagement rates.

No numerical targets are asserted until a baseline and product goals are agreed.

## 9. Acceptance criteria

1. A visitor can discover and inspect public live or scheduled auctions without seeing reserve prices.
2. Search filters, sort options, and pagination return results matching the selected criteria.
3. A signed-in bidder can submit a valid bid; an invalid, late, below-minimum, or self-bid is rejected with a clear error.
4. Concurrent bids cannot overwrite one another or leave the current price inconsistent with the accepted bid history.
5. Retrying a bid with the same request ID does not create a duplicate record.
6. An outbid user receives a persisted notification and, when connected, a real-time update.
7. An ended auction with no qualifying bid becomes unsold; one with a qualifying bid produces one awaiting-payment order.
8. Administrative and seller-only operations reject unauthorized users.
9. Payment state changes are based on verified provider events and duplicate webhook delivery does not duplicate financial effects.
10. The web and API can be built and tested using the documented workspace commands.

## 10. Dependencies and risks

- Production payments depend on Razorpay account setup, valid keys, and webhook configuration.
- Google authentication, remote image storage, and email delivery depend on their corresponding external configuration.
- The auction worker and some rate limiting currently run in-process; multi-replica deployment needs shared coordination to preserve predictable behavior.
- Marketplace policies for shipping, refunds, seller eligibility, identity verification, and disputes require product/legal decisions beyond the current technical model.
- The current locality and duration options are constrained by shared validation schemas and may need product approval before expansion beyond Bengaluru.

## 11. Open product decisions

- Confirm the commission rate and any minimum/maximum fees.
- Define buyer payment failure, expiry, cancellation, refund, and second-chance winner policies.
- Define supported pickup/delivery arrangements and responsibility boundaries.
- Define seller verification criteria and required evidence.
- Set measurable service-level, scale, and support targets before a high-volume launch.
