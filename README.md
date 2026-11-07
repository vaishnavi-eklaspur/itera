# Itera

A full-stack travel platform for a Kerala/South India tour operator. Replaces a manual workflow — content updates via vendor (₹3k + 3 days per change), enquiries scattered across WhatsApp, email and phone — with a unified CMS and AI-powered enquiry pipeline.

## What It Does

**For travellers:** Browse curated travel packages with seasonal pricing, day-wise itineraries and interactive maps. Submit enquiries and receive instant acknowledgement.

**For the operator:** Manage packages, blog posts and enquiries from a single admin dashboard. AI extracts travel details from free-text enquiries, matches packages by budget/destination/dates, and drafts personalised replies — all reviewed by staff before sending.

## Stack

Next.js 16 (App Router, SSR) · React 19 · PostgreSQL (Neon) · Prisma 6 · NextAuth v5 · Gemini API · Tailwind CSS 4 · Leaflet · Vitest

## Key Features

- **Append-only package versioning** — every edit creates a new version; instant rollback with full audit trail
- **Seasonal pricing engine** — per-season per-person pricing with live calculator on public pages
- **Hybrid AI pipeline** — Gemini extraction → deterministic matching → AI-drafted reply, human approval mandatory
- **4-role RBAC** — Admin, Editor, Consultant, Traveller with defense-in-depth auth (proxy + route-level)
- **Blog CMS** — Markdown-based posts with tags, SEO metadata and scheduling
- **Quote builder** — Generate shareable quote links with per-traveller pricing
- **Activity log** — Tracks all admin actions for accountability

## Quick Start

```bash
git clone https://github.com/vaishnavi-eklaspur/itera.git
cd itera
npm install
cp .env.example .env   # fill in DATABASE_URL, NEXTAUTH_SECRET, etc.
npx prisma db push
npx prisma db seed
npm run dev
```

See [deployment.md](deployment.md) for full setup, environment variables, Vercel/Docker deployment and secret generation.

### Test Credentials (from seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@itera.in | admin123 |
| Consultant | consultant@itera.in | consultant123 |
| Traveller | traveller@itera.in | traveller123 |

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, registration
│   ├── (public)/        # Packages, blog, enquiries, quotes
│   ├── admin/           # Dashboard, package editor, enquiry inbox, blog CMS
│   └── api/             # REST endpoints (admin, public, internal)
├── components/          # React components (admin, layout, packages, ui)
├── lib/                 # Auth, DB, validations, rate limiting, roles
└── proxy.ts             # Request proxy (auth, rate limiting, security headers)
prisma/
├── schema.prisma        # Data model
└── seed.ts              # Sample data (10 packages, 18 enquiries, 3 users)
tests/                   # Vitest test suites (64 tests)
```

## Tests

```bash
npm test          # 64 tests across 4 files
npm run test:watch
```

## Documentation

- [TDD.md](TDD.md) — Architecture decisions, data model, AI pipeline design
- [deployment.md](deployment.md) — Local dev, Vercel, Docker, cron jobs
