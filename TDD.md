# Itera — Technical Design Document

## 1. Project Overview

**Itera** is a full-stack travel platform for a Kerala/South India tour operator. It replaces a manual workflow (content updates via vendor at ₹3k + 3 days per change, enquiries across WhatsApp/email/phone) with a unified CMS + AI-powered enquiry pipeline.

**Stack:** Next.js 16 (App Router, SSR), React 19, PostgreSQL (Neon), Prisma 6, NextAuth v5, Claude API, Tailwind CSS 4, Leaflet.

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
1. **Extract** — Claude parses free-text enquiry into structured fields (dates, travellers, budget, destination).
2. **Match** — Deterministic scoring algorithm ranks packages. No AI here — pure math for transparency.
3. **Draft** — Claude generates a reply using matched packages and extracted data.

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

- **Passwords:** bcrypt cost 12
- **Sessions:** JWT via NextAuth v5, httpOnly cookies
- **Validation:** Zod schemas on every mutation
- **SQL injection:** Prisma parameterized queries (no raw SQL)
- **XSS:** React default escaping, no dangerouslySetInnerHTML on user content
- **Rate limiting:** In-memory sliding window, 5 req/min per IP on enquiry POST
- **Internal routes:** Shared-secret header checks (INTERNAL_API_SECRET, CRON_SECRET)
- **AI safety:** Extraction prompt rejects embedded instructions, Zod validates output, human approval required

---

## 6. Testing

**Framework:** Vitest 5

**Current:** 20 tests covering input validation schemas (enquiry form, registration, package form, AI extraction output) including edge cases for gibberish input and prompt injection payloads.

**Expansion priorities:** Package versioning logic, auth access control, AI extraction parsing, enquiry status transitions.

---

## 7. Features Beyond Core

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

## 8. Trade-offs and Upgrade Paths

| Decision | Trade-off | Upgrade path |
|----------|-----------|--------------|
| In-memory rate limiter | Resets on restart, single-instance | Redis or Vercel Edge rate limiting |
| URL-based photos | No upload, no CDN optimization | S3/Cloudinary + next/image |
| Mock email (console log) | No actual delivery | SendGrid/Resend integration |
| Client-side budget filter | Post-query filtering | DB-level price range query |
| No pagination | All packages loaded at once | Cursor-based pagination |
| PreviewCache in DB | Rows accumulate | TTL-based cleanup cron |

---

## 9. Seed Data

`prisma/seed.ts` creates:
- **3 users:** admin (admin@itera.in), consultant, traveller
- **10 packages:** Munnar, Alleppey, Wayanad, Kovalam, Coorg, etc. with full itineraries
- **3-4 seasonal prices per package** (Peak/Monsoon/Winter/Summer)
- **18 enquiries** in various states (NEW, IN_PROGRESS, REPLIED, CLOSED)
- Sample replies and internal notes

---

## 10. What I'd Do Next

1. **Image pipeline** — S3 upload with presigned URLs, Cloudinary transforms, `next/image`
2. **Email delivery** — Resend for auto-ack and reply emails
3. **Pagination** — Cursor-based for packages and enquiries as data grows
4. **Real-time inbox** — WebSocket/SSE for live enquiry updates
5. **PDF export** — Generate itinerary PDFs for travellers
6. **Analytics depth** — Conversion funnel tracking (enquiry → reply → booking)
