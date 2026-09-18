# RenewalIQ

A workflow tool for commercial insurance brokers: what am I waiting for, what happened with this client, and who do I need to follow up with today.

_Deployed via Vercel._

## Stack

- **Next.js (App Router) + TypeScript** — Server Actions handle all mutations, no separate API layer.
- **Prisma + PostgreSQL** — hosted Postgres (e.g. Vercel Postgres/Neon) in every environment, so local dev and production behave identically. (Serverless platforms like Vercel have an ephemeral, mostly read-only filesystem, so a file-based SQLite database doesn't survive there — see "Deploying to Vercel" below.)
- **Tailwind CSS** — calm, minimal design system defined in `app/globals.css`.
- Local file storage for uploaded documents (`public/uploads/<clientId>/...`) behind a small `lib/storage.ts` seam, so a future Dropbox/S3 integration is a storage-provider swap, not a schema rebuild. **Known limitation:** this still writes to local disk, which doesn't persist on Vercel's serverless runtime — file uploads need a hosted store (e.g. Vercel Blob) before that feature works in production; not yet done.

## Getting started

```bash
cp .env.example .env     # then fill in a real Postgres connection string
npm install               # also runs `prisma generate` via postinstall
npx prisma migrate deploy # applies committed migrations
npm run db:seed           # populates realistic demo data
npm run dev
```

Open http://localhost:3000 — you'll land on **Today's Plate**.

Any Postgres works for local dev — a local instance, Docker, or a free Neon/Vercel Postgres branch. Just don't point local dev at your production database.

## Deploying to Vercel

1. In the Vercel project, add a Postgres database (**Storage → Create Database → Postgres**, or connect an external one like Neon/Supabase) and let Vercel wire up the `DATABASE_URL` environment variable for you.
2. **Also add a `DIRECT_URL` environment variable** — a non-pooled connection to the same database. `prisma migrate deploy` needs a direct session and will fail (`Error: P1002 ... timed out trying to acquire a postgres advisory lock`) through a pooled/pgbouncer connection, which is what `DATABASE_URL` usually is on these providers.
   - **Vercel Postgres**: it also exposes `POSTGRES_URL_NON_POOLING` — set `DIRECT_URL` to that same value.
   - **Neon directly**: use the connection string that does *not* have `-pooler` in the hostname.
3. Redeploy. The build script (`prisma generate && prisma migrate deploy && next build`) generates the Prisma Client and applies all committed migrations automatically on every deploy — no manual migration step needed.
4. Seed demo data once, from your machine, pointed at the production database:
   ```bash
   DATABASE_URL="<value from Vercel>" DIRECT_URL="<non-pooled value from Vercel>" npm run db:seed
   ```

## Core workflow

Client → identify missing documents → contact client → record the action → schedule a follow-up → it appears on Today's Plate when due → complete it → repeat. Marking a document received, completing a follow-up, adding a driver/vehicle, or uploading a file all automatically write an Activity Log entry — nothing needs to be logged twice.

## Structure

- `app/today` — Today's Plate (home page)
- `app/clients` — client list, search/filter, Add Client
- `app/clients/[id]` — client profile: Overview, Documents, Drivers & Vehicles, Activity Log, Notes tabs
- `app/actions/*` — Server Actions (one file per domain: clients, documents, followups, drivers, vehicles, notes, activities)
- `lib/status.ts` — all "Needs Attention" computations (license/MVR/medical/vehicle) — workflow flags only, never an underwriting or carrier-eligibility decision
- `prisma/schema.prisma` — data model
- `prisma/seed.ts` — demo data (11 clients, documents, follow-ups, drivers, vehicles, MVRs, violations)
