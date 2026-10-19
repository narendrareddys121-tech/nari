# BidRush
**Bid Fast. Win Big.**

BidRush is a full-stack auction marketplace for Bengaluru, India — built with Next.js, Express, PostgreSQL, and real-time bidding via Socket.IO.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+ (local install or managed service)

### 1. Start PostgreSQL

The easiest local option is Docker Desktop. From the repository root:

```powershell
docker compose up -d postgres
```

This starts PostgreSQL 16 and keeps its data in a named Docker volume. If Docker is unavailable, install PostgreSQL 15 or newer and create a local user/database instead:

If not already installed, download PostgreSQL from https://www.postgresql.org/download/windows/

After installation, create a database and user in `psql`:

```sql
-- Open psql as superuser (postgres)
CREATE USER bidrush WITH PASSWORD 'bidrush_dev_password';
CREATE DATABASE bidrush_db OWNER bidrush;
GRANT ALL PRIVILEGES ON DATABASE bidrush_db TO bidrush;
```

### 2. Configure Environment

```powershell
# Copy the example settings into each app
Copy-Item .env.example apps/api/.env
Copy-Item .env.example apps/web/.env.local
```

Edit `apps/api/.env` and `apps/web/.env.local` with your PostgreSQL credentials.

### 3. Install Dependencies

```powershell
pnpm install
```

### 4. Run Database Migrations

```powershell
# This creates all database tables
pnpm db:migrate
```

### 5. Seed Development Data

```powershell
# Adds categories, sample auctions, test users
pnpm db:seed
```

### 6. Start Development Servers

```powershell
# Starts both frontend (port 3000) and backend (port 4000)
pnpm dev
```

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000/api/v1
- **Health check:** http://localhost:4000/api/v1/health
- **Prisma Studio:** Run `pnpm db:studio`

### Google account chooser

The sign-in and registration pages include a real **Continue with Google** flow. When
configured, it opens Google's account chooser (`prompt=select_account`), so every
Google account can sign in and use the same BidRush account as a Host or Guest.
There is no application-level email-domain allowlist.

To enable it locally, create an OAuth 2.0 Web application client in Google Cloud
Console and add this authorized redirect URI:

`http://localhost:3000/api/v1/auth/google/callback`

Then set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and
`GOOGLE_REDIRECT_URI` in `apps/api/.env`, and restart `pnpm dev`. Until those
credentials are configured, the button returns an explicit configuration error rather
than pretending that a Google login succeeded.

Quick Google Cloud setup:

1. Open **Google Cloud Console → APIs & Services → Credentials**.
2. Configure the OAuth consent screen with **User type: External**.
3. Add the app's name, support email, and developer contact email.
4. Publish the consent screen to production. While it is in testing, only accounts listed under **Test users** can sign in.
5. Create an **OAuth client ID** with application type **Web application**.
6. Add `http://localhost:3000/api/v1/auth/google/callback` under **Authorized redirect URIs**.
7. Copy the generated client ID and client secret into `apps/api/.env`.
8. Restart the API. The button will open Google's account chooser and accept any verified Google account.

For production, add the deployed web URL with `/api/v1/auth/google/callback` as an
authorized redirect URI and set the same URL in `GOOGLE_REDIRECT_URI`. If the API
has a separate public hostname, use that hostname instead and register its callback
URL with Google.

---

## 🔧 Development Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all packages for production |
| `pnpm test` | Run all tests |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed development data |
| `pnpm db:studio` | Open Prisma Studio (DB GUI) |

---

## 📁 Project Structure

```
bidrush/
├── apps/
│   ├── web/          # Next.js 14 frontend (port 3000)
│   └── api/          # Express backend (port 4000)
├── packages/
│   └── shared/       # Zod schemas, TypeScript types, financial utils
├── apps/api/prisma/  # Prisma schema, migrations, and development seed
├── .env.example      # Environment variables template
└── README.md
```

---

## 🏗️ Architecture

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express.js, TypeScript, Socket.IO
- **Database:** PostgreSQL, Prisma ORM
- **Auth:** JWT (HTTP-only cookies), Argon2id password hashing
- **Images:** Cloudinary
- **Payments:** Razorpay (sandbox)
- **Real-time:** Socket.IO
- **Testing:** Vitest, Playwright

---

## 🔑 First Admin Account

To create the first admin, after seeding run:

```powershell
pnpm --filter api create-admin
```

Or use the `ADMIN_BOOTSTRAP_SECRET` environment variable with the `/api/v1/admin/bootstrap` endpoint. See `apps/api/docs/ADMIN_SETUP.md`.

---

## 🚢 Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for production deployment instructions, domain setup, DNS, HTTPS, and checklist.

---

## ⚠️ External Services Required

Before going live, you need to:

1. **PostgreSQL** — Managed database (e.g., Supabase, Railway, Neon, RDS)
2. **Cloudinary** — Image storage (free tier available)
3. **Razorpay** — Payment gateway (requires business KYC)
4. **SMTP/Email** — Transactional email (SendGrid, Resend, etc.)
5. **Hosting** — Vercel (frontend) + Railway/Render (backend)

---

*BidRush © 2024 — For educational/startup use. Get legal and accounting advice before accepting real payments.*
