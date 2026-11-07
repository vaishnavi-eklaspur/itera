# Deployment Guide — Itera

## For Reviewers — Quick Start

The app is live at **https://itera-5nq4.vercel.app**

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@itera.in | admin123 |
| Consultant | consultant@itera.in | consultant123 |
| Traveller | traveller@itera.in | traveller123 |

Log in as Admin to see the full CMS, enquiry inbox and AI pipeline. Submit an enquiry from any package page to see the auto-acknowledgement and AI extraction in action. Emails are mocked (logged server-side, not actually sent) as specified in the brief.

---

## Prerequisites

- Node.js 20+
- PostgreSQL database (Neon recommended for serverless)
- Google Gemini API key (for AI features — optional, degrades gracefully)

---

## Local Development

```bash
# 1. Clone and install
git clone https://github.com/vaishnavi-eklaspur/itera.git
cd itera
npm install

# 2. Configure environment
cp .env.example .env
```

Edit `.env` with your values:

```env
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
NEXTAUTH_SECRET=<random-32-char-string>
NEXTAUTH_URL=http://localhost:3000
GEMINI_API_KEY=AIza...                 # optional — AI features disabled without it
INTERNAL_API_SECRET=<random-string>   # protects internal AI route
CRON_SECRET=<random-string>           # protects scheduled publish endpoint
```

Generate secrets:

```bash
openssl rand -base64 32    # use output for NEXTAUTH_SECRET
openssl rand -hex 16       # use output for INTERNAL_API_SECRET and CRON_SECRET
```

```bash
# 3. Set up database
npx prisma db push      # create tables
npx prisma db seed      # seed sample data (10 packages, 18 enquiries, 3 users)

# 4. Run
npm run dev              # starts on http://localhost:3000
```

### Test credentials (from seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@itera.in | admin123 |
| Consultant | consultant@itera.in | consultant123 |
| Traveller | traveller@itera.in | traveller123 |

### Run tests

```bash
npm test                 # 64 tests across 4 files
npm run test:watch       # watch mode
```

---

## Production Deployment (Vercel)

### 1. Connect repository

- Push to GitHub
- Import the repository in [vercel.com/new](https://vercel.com/new)
- Vercel auto-detects Next.js — no build config needed

### 2. Environment variables

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | Neon connection string (pooled, with `?sslmode=require`) |
| `NEXTAUTH_SECRET` | `<random-32-chars>` | **Must be different from dev** |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Your production URL |
| `GEMINI_API_KEY` | `AIza...` | Optional — AI features disabled without it |
| `INTERNAL_API_SECRET` | `<random-string>` | Protects `/api/internal/ai` |
| `CRON_SECRET` | `<random-string>` | Protects `/api/cron/publish` |

### 3. Database migration

After first deploy, run from your local machine:

```bash
DATABASE_URL="<production-connection-string>" npx prisma db push
DATABASE_URL="<production-connection-string>" npx prisma db seed
```

Or use Neon's SQL Editor to run the generated SQL from `npx prisma migrate diff`.

### 4. Scheduled publishing (optional)

To auto-publish packages with a future `scheduledAt` date, set up a Vercel Cron Job:

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/publish?secret=YOUR_CRON_SECRET",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This checks every 6 hours for packages due for publication.

---

## Production Deployment (Other Platforms)

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

### Railway / Render / Fly.io

1. Connect GitHub repository
2. Set environment variables (same as Vercel table above)
3. Build command: `npm run build`
4. Start command: `npm start`
5. Run `npx prisma db push` as a release command or one-off task

---

## Database Management

```bash
# View data in browser
npm run db:studio        # opens Prisma Studio at localhost:5555

# Create a migration (for production changes)
npm run db:migrate       # creates migration file + applies

# Push schema changes directly (dev only)
npm run db:push

# Re-seed data
npm run db:seed
```

---

## Project Structure

```
itera/
├── prisma/
│   ├── schema.prisma          # data model (11 tables)
│   └── seed.ts                # sample data generator
├── src/
│   ├── app/
│   │   ├── (auth)/            # login, register pages
│   │   ├── (public)/          # packages, blog, my-enquiries
│   │   ├── admin/             # admin panel (7 sections)
│   │   ├── api/               # 22 API routes
│   │   ├── layout.tsx         # root layout (fonts, providers)
│   │   ├── page.tsx           # homepage
│   │   └── sitemap.ts         # dynamic sitemap
│   ├── components/
│   │   ├── admin/             # blog editor, enquiry detail, package editor
│   │   ├── layout/            # navbar, footer, providers
│   │   └── packages/          # enquiry form, gallery, grid, estimator
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config
│   │   ├── db.ts              # Prisma client
│   │   ├── email.ts           # auto-ack email (mock)
│   │   ├── rate-limit.ts      # sliding window rate limiter
│   │   ├── utils.ts           # formatPrice, slugify, timeAgo, etc.
│   │   └── validations.ts     # Zod schemas
│   └── proxy.ts               # middleware (auth, redirects, security headers)
├── tests/
│   ├── validations.test.ts    # 18 schema tests
│   ├── rate-limit.test.ts     # 5 rate limiter tests
│   ├── utils.test.ts          # 18 utility tests
│   └── security.test.ts       # 12 security tests
├── TDD.md                     # technical design document
├── deployment.md              # this file
└── .env.example               # environment template
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `PrismaClientInitializationError` | Check `DATABASE_URL` — ensure `?sslmode=require` for Neon |
| Login fails silently | Verify `NEXTAUTH_SECRET` is set and `NEXTAUTH_URL` matches the actual domain |
| AI extraction not running | Check `GEMINI_API_KEY` is set. The feature degrades gracefully — enquiries still work without it |
| `ERR_MODULE_NOT_FOUND` on deploy | Run `npx prisma generate` before build (the `postinstall` script handles this) |
| Security headers not appearing | Headers are set in `proxy.ts` middleware — verify the middleware matcher covers the route |
| Tests fail on CI | Ensure `vitest` is in `devDependencies` and CI runs `npm ci` before `npm test` |
