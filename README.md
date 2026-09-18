# RenewalIQ

A workflow tool for commercial insurance brokers: what am I waiting for, what happened with this client, and who do I need to follow up with today.

## Stack

- **Next.js (App Router) + TypeScript** — Server Actions handle all mutations, no separate API layer.
- **Prisma + SQLite** — file-based database (`prisma/dev.db`), persists across restarts.
- **Tailwind CSS** — calm, minimal design system defined in `app/globals.css`.
- Local file storage for uploaded documents (`public/uploads/<clientId>/...`) behind a small `lib/storage.ts` seam, so a future Dropbox/S3 integration is a storage-provider swap, not a schema rebuild.

## Getting started

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db
npm run db:seed          # populates realistic demo data
npm run dev
```

Open http://localhost:3000 — you'll land on **Today's Plate**.

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
