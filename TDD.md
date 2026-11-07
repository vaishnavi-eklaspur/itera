# Itera — Technical Design Document

## 1. Project Overview

**Itera** is a full-stack travel platform for a Kerala/South India tour operator. It replaces a manual workflow (content updates via vendor at ₹3k + 3 days per change, enquiries across WhatsApp/email/phone) with a unified CMS + AI-powered enquiry pipeline.

**Stack:** Next.js 16 (App Router, SSR), React 19, PostgreSQL (Neon), Prisma 6, NextAuth v5, Gemini API, Tailwind CSS 4, Leaflet.

---

## 2. Architecture Decisions

### 2.1 SSR-First with App Router

All public pages use server-side rendering (`export const instant = false`) for SEO and first-paint performance. Admin pages also SSR — only interactive components (`"use client"`) ship JS. This gives search-engine indexing (packages, blog, JSON-LD structured data) without a separate API layer.

### 2.2 Append-Only Package Versioning

Every package edit creates a new `PackageVersion` row. `Package.currentVersionId` (unique FK) points to the active version. Restoring an old version creates a *new* version with copied data — no row is ever mutated.

**Why:** Tour operators revert pricing/itinerary changes across seasons frequently. Append-only provides instant rollback and a built-in audit trail.

### 2.3 Seasonal Pricing as Separate Table

`SeasonalPrice` rows live outside the version tree. On package update, old prices are deleted and new ones created inside a single `$transaction`. This lets prices change independently of itinerary content — operators adjust pricing weekly during peak season without creating version churn.

### 2.4 Hybrid AI Pipeline (Human-in-the-Loop)

Three stages:
1. **Extract** — Gemini parses free-text enquiry into structured fields (dates, travellers, budget, destination).
2. **Match** — Deterministic scoring algorithm ranks packages. No AI here — pure math for transparency.
3. **Draft** — Gemini generates a reply using matched packages and extracted data.

Nothing reaches the traveller until staff reviews and explicitly accepts. The extraction prompt rejects embedded instructions, output is Zod-validated, and human approval is mandatory.

**Why deterministic matching?** AI-based matching is a black box. The hybrid approach gives explainable recommendations while handling messy free-text input.

### 2.5 Defense-in-Depth Auth

Two layers:
1. **Proxy layer** (`src/proxy.ts`) — Next.js 16's replacement for middleware. Checks JWT + role for `/admin/*` and `/api/admin/*`.
2. **Route-level auth** — Each handler calls `auth()` independently as backup.

Internal routes (`/api/internal/ai`, `/api/cron/publish`) use shared-secret header validation.

### 2.6 Transaction Safety

All multi-step database operations (package create, update, duplicate, version restore) are wrapped in `db.$transaction()`. The package update path — which deletes all seasonal prices then recreates them — is atomic: a crash mid-operation rolls back everything.

---

## 3. Data Model

### Core Entities

```
User (id, email, name, passwordHash, role: TRAVELLER|ADMIN|EDITOR|CONSULTANT)

Package (id, slug, status: DRAFT|PUBLISHED|ARCHIVED, currentVersionId, scheduledAt)
  ├── PackageVersion[] (append-only: versionNumber, title, destination, days,
  │                      itinerary: JSON, photos[], inclusions[], exclusions[])
  └── SeasonalPrice[] (seasonName, startMonth, endMonth, pricePerPerson, basis)

Enquiry (id, name, email, message, status: NEW|IN_PROGRESS|REPLIED|CLOSED,
         aiExtracted: JSON, aiSuggestions: JSON, aiDraftReply)
  ├── EnquiryReply[] (content, channel: EMAIL|WHATSAPP|SYSTEM)
  └── EnquiryNote[] (internal staff notes)

BlogPost (slug, title, content, category, tags[], relatedPackageIds[])
Quote (token, packageId, travellers, pricePerPerson, totalPrice, validUntil)
ActivityLog (userId, action, entity, entityId, details)
```

### Key Constraints

- `Package.slug` unique, `Package.currentVersionId` unique FK (exactly one "current" version)
- Cascade deletes: Version, Price, Note, Reply all cascade from parent
- Indexes: `Enquiry(status, assignedToId, createdAt)`, `BlogPost(published)`, `ActivityLog(createdAt)`

---

## 4. API Design

### Public
| Route | Purpose |
|-------|---------|
| `GET /api/packages` | Published packages with search/filter |
| `GET /api/packages/[slug]` | Package detail (published only) |
| `POST /api/enquiries` | Submit enquiry (rate-limited: 5/min per IP) |
| `GET /api/enquiries` | User's own enquiries (auth required) |

### Admin (proxy + route-level auth)
| Route | Purpose |
|-------|---------|
| `GET/POST /api/admin/packages` | List / create |
| `GET/PUT/DELETE /api/admin/packages/[id]` | Read / update (new version) / archive |
| `POST .../[id]/publish\|duplicate` | Status change / clone |
| `GET/POST .../[id]/versions` | History / restore |
| `POST .../preview` | Preview unsaved changes |
| `GET /api/admin/enquiries` | Inbox with filters |
| `PUT /api/admin/enquiries/bulk` | Bulk status update |
| `GET/PUT .../[id]` | Detail / update fields |
| `POST .../[id]/reply\|notes` | Send reply / add note |
| `GET /api/admin/analytics` | Dashboard data |
| `GET/POST/PUT/DELETE /api/admin/blog/*` | Blog CMS |
| `GET/POST /api/admin/quotes` | Quote builder |

### Internal (secret-header auth)
| Route | Purpose |
|-------|---------|
| `POST /api/internal/ai` | AI extraction pipeline (INTERNAL_API_SECRET) |
| `GET /api/cron/publish` | Auto-publish scheduled packages (CRON_SECRET) |

---

## 5. Security

- **Passwords:** bcrypt hashed, never stored in plain text
- **Sessions:** JWT via NextAuth v5, httpOnly cookies
- **Validation:** Zod schemas on every mutation (message capped at 5000 chars, adults 1–50, children 0–20)
- **SQL injection:** Prisma parameterized queries (no raw SQL)
- **XSS:** React default escaping, no dangerouslySetInnerHTML on user content
- **Rate limiting:** In-memory sliding window, 5 req/min per IP on enquiry POST
- **Internal routes:** Shared-secret header checks (INTERNAL_API_SECRET, CRON_SECRET)
- **AI safety:** Extraction prompt rejects embedded instructions, Zod validates output, human approval required (Gemini 2.0 Flash)
- **HTTP security headers** (set in middleware for all routes):
  - `Content-Security-Policy` — restricts script/style/img sources, `frame-ancestors 'none'`
  - `X-Frame-Options: DENY` — prevents clickjacking
  - `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing
  - `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()` — disables unused browser APIs

---

## 6. Testing

**Framework:** Vitest 5  
**Test count:** 53 tests across 4 files  
**Run:** `npm test`

| File | Tests | Coverage |
|------|-------|----------|
| `validations.test.ts` | 18 | All Zod schemas: enquiry, register, package, AI extraction |
| `rate-limit.test.ts` | 5 | Window expiry, key isolation, default params, blocking at limit |
| `utils.test.ts` | 18 | formatPrice, slugify, getSeasonForMonth (year-wrap), timeAgo, responseTimeBadge |
| `security.test.ts` | 12 | XSS payloads, SQL injection in email, empty/boundary inputs, max-length enforcement |

**What the tests verify:**
- **Boundary values:** adults=51 rejected, message at exactly 5000 chars accepted, 5001 rejected
- **Wrap-around logic:** `getSeasonForMonth(1, peakOct-Feb)` correctly returns Peak season
- **Rate limiter timing:** Fake timers verify the sliding window resets after configured interval
- **Security payloads:** Script tags in name pass validation (React escapes on render), SQL injection in email rejected by `.email()`

---

## 7. Performance

- **SSR-first** — no client-side data waterfalls. Pages render with data on first paint.
- **`fetchPriority="high"`** on hero images, `loading="lazy"` on below-fold images.
- **API caching:** Package routes return `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
- **Font optimisation:** `next/font/google` inlines font declarations (Inter + Playfair Display).
- **Minimal client JS:** Only 5 components use `"use client"` — the rest are server components.

---

## 8. Accessibility

- **Skip-to-content link** — visible on keyboard focus, targets `#main-content`.
- **ARIA labels** on navigation, footer, admin header, mobile toggle (`aria-expanded`), icon-only buttons.
- **Semantic HTML:** `<nav>`, `<main>`, `<footer>`, `<section>`, `<header>` landmarks throughout.
- **Focus-visible rings** on all interactive elements via global CSS.
- **Colour contrast:** Forest green (#15803d) on ivory (#FAFAF5) exceeds WCAG AA ratio.

---

## 9. Features Beyond Core

| Feature | Purpose |
|---------|---------|
| Blog CMS | Travel content with categories, tags, SEO, related packages |
| Quote builder | Shareable branded quotes with token-based public access |
| Editor/Consultant roles | Beyond ADMIN/TRAVELLER for team workflows |
| Activity log | Audit trail for all admin actions |
| Bulk enquiry actions | Select multiple → change status in batch |
| Photo gallery + lightbox | Grid display with click-to-expand on detail page |
| Scheduled publishing | Set future publish date, cron auto-publishes |
| Response time badges | Green/amber/red indicators on enquiry inbox |
| Price estimator | Client-side calculator: month + guests → instant total |

---

## 10. Trade-offs and Upgrade Paths

| Decision | Trade-off | Upgrade path |
|----------|-----------|--------------|
| In-memory rate limiter | Resets on restart, single-instance | Redis or Vercel Edge rate limiting |
| URL-based photos | No upload, no CDN optimization | S3/Cloudinary + next/image |
| Mock email (console log) | No actual delivery | SendGrid/Resend integration |
| Client-side budget filter | Post-query filtering | DB-level price range query |
| No pagination | All packages loaded at once | Cursor-based pagination |
| PreviewCache in DB | Rows accumulate | TTL-based cleanup cron |

---

## 11. Seed Data

`prisma/seed.ts` creates:
- **3 users:** admin (admin@itera.in), consultant, traveller
- **10 packages:** Munnar, Alleppey, Wayanad, Kovalam, Coorg, etc. with full itineraries
- **3-4 seasonal prices per package** (Peak/Monsoon/Winter/Summer)
- **18 enquiries** in various states (NEW, IN_PROGRESS, REPLIED, CLOSED)
- Sample replies and internal notes

---

## 12. What I'd Do Next

1. **Image pipeline** — S3 upload with presigned URLs, Cloudinary transforms, `next/image`
2. **Email delivery** — Resend for auto-ack and reply emails
3. **Pagination** — Cursor-based for packages and enquiries as data grows
4. **Real-time inbox** — WebSocket/SSE for live enquiry updates
5. **PDF export** — Generate itinerary PDFs for travellers
6. **Analytics depth** — Conversion funnel tracking (enquiry → reply → booking)
