# Itera — Technical Design Document

## 1. Project Overview

**Itera** is a travel management platform for Kerala and South India travel packages. It serves two user types:

- **Travellers** browse curated travel packages, view seasonal pricing, explore interactive itinerary maps, and submit enquiries via a web form or WhatsApp.
- **Admins** manage packages through a full CMS with versioning, handle enquiries with AI-assisted extraction and reply drafting, and monitor business performance through an analytics dashboard.

### Problem Statement

Travel agencies managing Kerala/South India packages need a unified platform that:
1. Presents packages with seasonal pricing transparency (Kerala tourism is highly seasonal)
2. Captures and routes enquiries efficiently with AI assistance
3. Provides version-controlled package management for seasonal updates
4. Gives operational visibility through enquiry analytics

---

## 2. Architecture

### 2.1 System Architecture

```
[Browser] → [Next.js 16 App Router] → [PostgreSQL (Neon)]
                    ↓
            [Proxy Layer (auth)]
                    ↓
         ┌──────────┴──────────┐
    [Server Components]   [API Routes]
    (SSR pages with        (mutations,
     instant = false)      AI pipeline)
                              ↓
                    [Claude API (Sonnet 4)]
                    (extraction + suggestions)
```

### 2.2 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16.4.5 (App Router, Turbopack) | SSR, caching, file-based routing |
| Runtime | React 19.3, Server Components | Streaming, reduced client JS |
| Database | PostgreSQL on Neon (Serverless) | Serverless scaling, branching for dev |
| ORM | Prisma 6 | Type-safe queries, migrations |
| Auth | NextAuth v5 (beta) | JWT strategy, role-based access |
| Styling | Tailwind CSS 4 | Utility-first, zero runtime |
| AI | Claude API (claude-sonnet-4-20250514) | Enquiry extraction, package matching |
| Maps | react-leaflet + Leaflet | Interactive itinerary maps, OSM tiles |
| Validation | Zod 4 | Schema validation, form parsing |

### 2.3 Key Architectural Decisions

**Next.js 16 Cache Components**: Uses `export const instant = false` instead of the deprecated `export const dynamic = "force-dynamic"`. Server components opt into dynamic rendering explicitly.

**Proxy over Middleware**: Migrated from `middleware.ts` to `proxy.ts` following Next.js 16 conventions. Uses `getToken()` from next-auth/jwt for session validation at the proxy layer.

**Hybrid AI Matching**: AI is never the sole decision-maker. Package suggestions query the database first (destination + budget match), then Claude generates only the human-readable reasoning. Staff must approve all AI-drafted replies before sending.

**Versioned Packages**: Every package edit creates a new `PackageVersion`. The `Package.currentVersionId` pointer allows instant rollback. Admins see full version history.

---

## 3. Data Model

### 3.1 Core Entities

```
User (id, email, name, passwordHash, role: TRAVELLER|ADMIN)
  │
  ├── Package (id, slug, status, currentVersionId)
  │     ├── PackageVersion (versionNumber, title, destination, days,
  │     │                    description, itinerary: Json, inclusions,
  │     │                    exclusions, hotelTier, photos, mapCenter)
  │     └── SeasonalPrice (seasonName, startMonth, endMonth,
  │                         pricePerPerson, basis, gstInclusive)
  │
  └── Enquiry (id, name, email, phone, message, travelDate,
               guests, budget, status, assignedToId,
               aiExtracted: Json, aiSuggestions: Json, aiDraftReply)
        ├── EnquiryReply (content, channel: EMAIL|WHATSAPP|PHONE, sentAt)
        └── EnquiryNote (content, createdAt) [internal staff notes]
```

### 3.2 Key Relationships

- `Package` → `PackageVersion`: One-to-many, with `currentVersionId` as the active pointer
- `Package` → `SeasonalPrice`: One-to-many, Kerala's 3-4 distinct tourist seasons
- `Enquiry` → `Package`: Optional FK (enquiries can be general or package-specific)
- `Enquiry` → `EnquiryReply`: One-to-many, tracks all communication
- `Enquiry` → `User` (assignedTo): Admin assignment for workload distribution

---

## 4. Features

### 4.1 Public Pages

| Feature | Implementation |
|---------|---------------|
| Package listing | SSR grid with client-side filtering (destination, price, duration) and sorting |
| Package detail | Hero image, quick facts bar, seasonal pricing table, accordion itinerary with interactive Leaflet map |
| Price estimator | Client component: select month + guests → instant price calculation using seasonal data |
| Enquiry form | Zod-validated form, posts to `/api/enquiries`, triggers async AI extraction |
| WhatsApp button | Pre-filled WhatsApp link with package context, mobile FAB for touch access |
| My Enquiries | Authenticated traveller view of their submitted enquiries with status tracking |

### 4.2 Admin CMS

| Feature | Implementation |
|---------|---------------|
| Dashboard | KPI cards (packages, enquiries, new count) + recent enquiries list |
| Package editor | Full CRUD: basic info, itinerary builder (day-by-day with lat/lng for map), inclusions/exclusions list editor, seasonal pricing manager |
| Version history | Every save creates a numbered version; restore any previous version with one click |
| Publish/duplicate | Toggle package status; duplicate a package as a new draft |
| Enquiry inbox | Filterable by status (NEW, IN_PROGRESS, REPLIED, CLOSED), shows response time badges |
| Enquiry detail | Original message, AI-extracted fields, suggested packages, reply composer (email/WhatsApp/phone channels), internal notes |
| Analytics | KPIs (total, new, response rate, avg response time), status breakdown bars, top packages ranking, 30-day volume chart |

### 4.3 AI Pipeline

```
Enquiry submitted → POST /api/enquiries
                        ↓
                  Save to database
                        ↓
              POST /api/internal/ai (async)
                        ↓
              ┌─────────┴──────────┐
        Claude extracts:      DB query matches:
        - dates, budget,      packages by destination
          guests, interests,  + budget range
          destination         
              └─────────┬──────────┘
                        ↓
              Claude generates reasoning
              for top matches + draft reply
                        ↓
              Update enquiry with:
              aiExtracted, aiSuggestions,
              aiDraftReply
                        ↓
              Admin reviews & sends
              (human-in-the-loop)
```

### 4.4 Authentication & Authorization

- **JWT strategy** with NextAuth v5 Credentials provider
- **Proxy-level protection**: `proxy.ts` intercepts `/admin/*` and `/api/admin/*` routes
- **Role check**: `ADMIN` role required for admin routes; non-admin users redirected to home
- **API protection**: Admin API routes return 401/403 JSON responses for unauthorized requests

---

## 5. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[...nextauth]` | * | NextAuth handlers (sign in/out/session) |
| `/api/auth/register` | POST | User registration (TRAVELLER role) |
| `/api/packages` | GET | Public package listing |
| `/api/packages/[slug]` | GET | Public package detail |
| `/api/enquiries` | POST | Submit enquiry (public) |
| `/api/admin/packages` | GET, POST | List/create packages (admin) |
| `/api/admin/packages/[id]` | GET, PUT, DELETE | Package CRUD (admin) |
| `/api/admin/packages/[id]/publish` | POST | Toggle publish status |
| `/api/admin/packages/[id]/duplicate` | POST | Clone package as draft |
| `/api/admin/packages/[id]/versions` | POST | Restore a specific version |
| `/api/admin/enquiries` | GET | List enquiries with filters |
| `/api/admin/enquiries/[id]` | GET, PATCH | Get/update enquiry details |
| `/api/admin/enquiries/[id]/reply` | POST | Send reply to enquiry |
| `/api/admin/enquiries/[id]/notes` | POST | Add internal note |
| `/api/admin/analytics` | GET | Analytics data |
| `/api/internal/ai` | POST | AI extraction pipeline (internal) |

---

## 6. Security Considerations

- **Password hashing**: bcrypt with default salt rounds
- **JWT tokens**: Signed with `NEXTAUTH_SECRET`, httpOnly cookies
- **Input validation**: Zod schemas on all API inputs
- **Role-based access**: Enforced at proxy and API route levels
- **SQL injection prevention**: Prisma parameterized queries (no raw SQL)
- **XSS prevention**: React's default escaping, no `dangerouslySetInnerHTML`
- **AI safety**: Human-in-the-loop — AI never sends replies directly to customers
- **Environment secrets**: `.env` gitignored, secrets in Vercel environment variables

---

## 7. Performance

- **Server Components**: Most pages render on the server, minimizing client JavaScript
- **Partial Prerendering**: Package detail pages use PPR (static shell + dynamic content stream)
- **Turbopack**: Fast dev server rebuilds (~2s cold start)
- **Database**: Neon serverless PostgreSQL with connection pooling
- **Image optimization**: Next.js `<Image>` component with lazy loading
- **Dynamic imports**: Leaflet map loaded only when itinerary section is visible

---

## 8. Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Homepage (SSR featured packages)
│   ├── loading.tsx                 # Home skeleton
│   ├── error.tsx                   # Global error boundary
│   ├── not-found.tsx               # 404 page
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login form
│   │   └── register/page.tsx       # Registration form
│   ├── (public)/
│   │   ├── packages/
│   │   │   ├── page.tsx            # Package listing
│   │   │   ├── loading.tsx         # Listing skeleton
│   │   │   └── [slug]/page.tsx     # Package detail
│   │   └── my-enquiries/page.tsx   # Traveller's enquiries
│   ├── admin/
│   │   ├── layout.tsx              # Admin shell (top nav + mobile bottom nav)
│   │   ├── loading.tsx             # Admin skeleton
│   │   ├── page.tsx                # Dashboard
│   │   ├── packages/
│   │   │   ├── page.tsx            # Package list
│   │   │   ├── new/page.tsx        # New package
│   │   │   └── [id]/page.tsx       # Edit package
│   │   ├── enquiries/
│   │   │   ├── page.tsx            # Enquiry inbox
│   │   │   └── [id]/page.tsx       # Enquiry detail
│   │   └── analytics/page.tsx      # Analytics dashboard
│   └── api/                        # API routes (see Section 5)
├── components/
│   ├── admin/
│   │   ├── package-editor.tsx      # Full package CMS editor
│   │   └── enquiry-detail.tsx      # Enquiry management UI
│   └── packages/
│       ├── package-grid.tsx        # Filterable/sortable grid
│       ├── enquiry-form.tsx        # Public enquiry form
│       ├── price-estimator.tsx     # Instant price calculator
│       ├── itinerary-section.tsx   # Accordion + map toggle
│       └── itinerary-map.tsx       # Leaflet map component
├── lib/
│   ├── auth.ts                     # NextAuth config
│   ├── auth-types.ts               # Session/JWT type augmentation
│   ├── db.ts                       # Prisma client singleton
│   ├── utils.ts                    # Shared utilities
│   └── validations.ts             # Zod schemas
└── proxy.ts                        # Auth proxy (Next.js 16)

prisma/
├── schema.prisma                   # Database schema
└── seed.ts                         # Seed data (5 packages, 5 users, 11 enquiries)
```

---

## 9. Deployment

### Environment Variables Required

```
DATABASE_URL=           # Neon PostgreSQL connection string
NEXTAUTH_SECRET=        # JWT signing secret (generate with: openssl rand -base64 32)
NEXTAUTH_URL=           # Production URL (e.g., https://itera.vercel.app)
ANTHROPIC_API_KEY=      # Claude API key for AI features
```

### Deploy to Vercel

1. Push to GitHub: `gh repo create itera --private --source=. --push`
2. Import in Vercel dashboard → connect GitHub repo
3. Set environment variables in Vercel project settings
4. Deploy (Vercel auto-detects Next.js)
5. Run database migration: `npx prisma db push` (schema is already applied to Neon)
6. Seed production data if needed: `npx prisma db seed`

---

## 10. Seed Data

The seed script (`prisma/seed.ts`) creates:

- **2 users**: 1 admin (admin@itera.in), 1 traveller (traveller@itera.in)
- **5 packages**: Munnar Hills, Alleppey Backwaters, Wayanad Wildlife, Kovalam Beach, Coorg Coffee Trail
- **Seasonal prices**: 3-4 seasons per package (Peak/Monsoon/Winter/Summer) with realistic Kerala pricing
- **11 enquiries**: Mix of statuses (NEW, IN_PROGRESS, REPLIED, CLOSED) with realistic traveller messages
- **Replies & notes**: Sample replies and internal notes on select enquiries

---

## 11. Trade-offs & Future Work

### Intentional Simplifications

| Decision | Rationale | Upgrade Path |
|----------|-----------|-------------|
| JWT over database sessions | Simpler setup, no session table needed | Switch to database strategy if token revocation needed |
| Client-side package filtering | Fast UX for small catalog (<100 packages) | Server-side search with Prisma full-text if catalog grows |
| Single-process AI pipeline | Adequate for low enquiry volume | Queue (BullMQ/SQS) if >100 enquiries/day |
| CSS bar chart in analytics | Zero dependencies, works server-side | Recharts/D3 if complex visualizations needed |
| bcrypt for passwords | Battle-tested, sufficient for this scale | Argon2id for higher security requirements |

### Future Enhancements

- Email notifications on new enquiries (Resend/SendGrid integration)
- Multi-image gallery per package (currently single hero)
- PDF itinerary export for travellers
- Enquiry assignment round-robin for multi-admin teams
- A/B testing for package page layouts
