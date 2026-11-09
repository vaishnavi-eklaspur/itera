# Itera

Itera is a full-stack travel platform for a Kerala and South India tour
operator. It turns package publishing, seasonal pricing, traveller enquiries,
AI-assisted triage and branded quotes into one responsive application.

- **Repository:** https://github.com/vaishnavi-eklaspur/itera
- **Live demo:** https://itera-5nq4.vercel.app
- **Technical design:** [TDD.md](TDD.md)
- **Deployment guide:** [deployment.md](deployment.md)

## What is implemented

### Core build

- Server-rendered public package discovery with keyword/destination search,
  duration and per-person budget filters, hotel tier and seasonal pricing
  filters, sorting, itinerary, photos, map and price estimator.
- Package CMS with create, edit, duplicate, preview, publish, schedule and
  append-only version history.
- Enquiry form on package pages and a staff inbox with assignment, status,
  notes, replies and response-time indicators.
- AI extraction of dates, destination, traveller counts and budget; deterministic
  package suggestions; and an editable draft reply. AI output is displayed
  beside the original message and is never sent automatically.
- Traveller and staff authentication with Admin, Editor, Consultant and
  Traveller roles.

### Additional implemented depth

- Blog CMS with categories, SEO fields, related packages and a visual
  content-editing surface. Content remains stored in the existing Markdown
  field for compatibility with the public renderer.
- Branded quote links and downloadable PDF quotes. Prices are selected from
  the database seasonal-price table and include the per-person/twin-sharing
  basis and GST treatment.
- Consent provenance and withdrawal controls, correction/deletion requests,
  transactional anonymisation, retention cron, robots.txt, sitemap and
  legacy URL redirects.
- Activity log and endpoint-specific IP rate limiting.

Email, WhatsApp and other outside systems are intentionally mocked: email
dispatch is logged server-side and non-web enquiries can be recorded by staff.

## Technology

Next.js 16 App Router and server components, React 19, PostgreSQL, Prisma 6,
NextAuth, Tailwind CSS 4, Leaflet, `pdf-lib`, Zod and Vitest. AI uses Groq when
configured and Gemini as a fallback; without either key the enquiry flow uses a
safe deterministic fallback and still requires staff review.

## Quick start

```bash
git clone https://github.com/vaishnavi-eklaspur/itera.git
cd itera
npm install
Copy-Item .env.example .env  # PowerShell; edit the file before continuing
npx prisma db push
npx prisma db seed
npm run dev
```

Open http://localhost:3000 (or the port printed by Next.js). Full local,
Vercel and production-database instructions are in [deployment.md](deployment.md).

## Seeded demo accounts

These are demo-only credentials created by `prisma/seed.ts`; never reuse them
in a real deployment.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@itera.in` | `admin123` |
| Editor | `editor@itera.in` | `editor123` |
| Consultant | `consultant@itera.in` | `consultant123` |
| Traveller | `traveller@itera.in` | `traveller123` |

## Verification

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Verification run on 2026-11-09: `npm test` passed all 83 tests,
`npx tsc --noEmit` passed, and `npm run build` passed. `npm run lint` reported
zero errors and 19 warnings, primarily for existing `<img>` usage and internal
navigation with `window.location.assign()`.

## Structure

```text
src/app/                 routes, server pages and API handlers
src/components/          public, admin and shared UI
src/lib/                 auth, RBAC, validation, pricing and rate limiting
src/proxy.ts              auth gate, redirects and response security headers
prisma/schema.prisma     PostgreSQL data model
prisma/seed.ts           realistic demo data
tests/                   Vitest validation, utility and security tests
```

## Known limitations

- The production Lighthouse Mobile Slow 4G target has not been independently
  verified against the deployed URL.
- The current rate limiter is process-memory based; a distributed store is
  required for strong multi-instance/serverless enforcement.
- Real email, WhatsApp, payments and live inventory are outside this demo.
- Photos are URL-backed rather than uploaded through an asset pipeline.
- The blog editor is visually rich, but persists Markdown rather than a
  structured rich-text document.
- A spot check of one deployed package detail page found no CSP violations.
  It did show an aborted image request and an unused image-preload warning;
  broader browser checks remain outstanding.
