# Itera deployment guide

This guide covers a local reviewer setup and the deployed Vercel application.
Do not use the demo credentials or a demo seed database for real customer
traffic.

- **Repository:** https://github.com/vaishnavi-eklaspur/itera
- **Live application:** https://itera-5nq4.vercel.app/
- **Technical design:** [TDD.pdf](TDD.pdf)

## 1. Prerequisites

- Node.js **20.9 or newer** (Next.js 16 requirement)
- npm
- PostgreSQL database and a connection URL
- Git
- Optional Groq and/or Gemini API key for provider-backed AI extraction

Neon is used for the deployed PostgreSQL database. Any compatible PostgreSQL
instance can be used locally.

## 2. Install and configure locally

In PowerShell:

```powershell
git clone https://github.com/vaishnavi-eklaspur/itera.git
Set-Location itera
npm ci
Copy-Item .env.example .env
```

Edit `.env` with values for your local environment. These are the environment
variable **names** read by the application; never commit their values:

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Signs/authenticates application sessions |
| `NEXTAUTH_URL` | Yes | Canonical application origin, e.g. local HTTP origin |
| `INTERNAL_API_SECRET` | Yes for AI extraction | Authenticates internal AI route requests |
| `CRON_SECRET` | Yes for scheduled jobs | Authorizes publishing and retention cron requests |
| `GROQ_API_KEY` | No | Preferred extraction provider |
| `GEMINI_API_KEY` | No | Extraction fallback provider |
| `NEXT_PUBLIC_SITE_URL` | No | Overrides the canonical URL used for sitemap/robots |
| `ENQUIRY_RETENTION_DAYS` | No | Closed-enquiry retention threshold; defaults to 730 days |

With neither AI provider key configured, enquiry submission still follows the
deterministic fallback path. AI output should be reviewed by staff; production
destination extraction and package suggestions have not been fully verified.

## 3. Prepare the database and seed demo data

The project's setup and Vercel build use Prisma schema synchronization
(`db push`), not `prisma migrate deploy` as a clean-database bootstrap:

```powershell
npx prisma db push
npm run db:seed
```

The repository contains incremental SQL migration files but does not contain
a complete initial migration baseline. `db push` is the documented setup path
for an empty review database. The seed creates demo roles, packages,
seasonal prices, enquiries and blog content; it is intended for a demo
database, not production traveller data.

Start the development server:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To use another port:

```powershell
npx next dev -p 3001
```

Optional database browser:

```powershell
npm run db:studio
```

## 4. Reviewer demo accounts

`prisma/seed.ts` upserts these accounts and hashes their passwords with
bcrypt; `src/lib/auth.ts` checks credentials against those hashes. They are
verified against the actual seed and authentication implementation:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@itera.in` | `admin123` |
| Editor | `editor@itera.in` | `editor123` |
| Consultant | `consultant@itera.in` | `consultant123` |
| Traveller | `traveller@itera.in` | `traveller123` |

These are public demo credentials and are not suitable for real use. They
work only where the corresponding seed has been run. The live production
database's current seeded-account state was not independently confirmed for
this documentation update.

## 5. Run checks

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```

The reviewed workspace check on 2026-11-09 passed 114 tests across 18 files,
TypeScript checking and the production build. ESLint completed with no errors
and 19 warnings. The current workspace contains uncommitted changes that are
not part of deployed commit `4c58cbb`; see [TDD.pdf](TDD.pdf) for the release
boundary and verification notes.

## 6. Deploy to Vercel

1. Import `vaishnavi-eklaspur/itera` in Vercel.
2. Configure the required environment variables above in the intended
   deployment environment. Add `GROQ_API_KEY` and/or `GEMINI_API_KEY` only
   when provider-backed extraction is desired.
3. Set `NEXTAUTH_URL` to the canonical HTTPS origin. Set
   `NEXT_PUBLIC_SITE_URL` to the same origin when overriding sitemap/robots
   metadata.
4. Use the repository's `npm run vercel-build` build command. It runs
   `prisma db push --skip-generate && next build`; this changes the target
   database schema, so validate the environment and database before deploying.
5. Seed only a dedicated review/demo database, once, from an authorized
   environment. Do not copy production credentials into a shell command,
   source file or shared terminal history.
6. Confirm the deployment reaches Ready, then check the public pages and
   protected staff sign-in with the intended environment.

The repository's `vercel.json` schedules package publishing daily at 03:00 UTC
and retention at 02:00 UTC. Both routes require the configured cron bearer
secret. Scheduled package publication can therefore occur up to roughly a
day after the selected time on this schedule.

## 7. Operational behavior and limitations

- Email acknowledgement is a fixed-template implementation logged by the
  application; no external email delivery provider is connected.
- WhatsApp, payments, hotel/flight inventory and booking are not connected to
  live services. This is consistent with the assignment's allowance for
  mocked external integrations.
- Production AI returned HTTP 200 for a synthetic enquiry and persisted
  dates, traveller counts, budget and a draft reply, but destination was null
  and package suggestions were empty. Provider-level historical logs were
  unavailable; do not treat full production extraction as verified.
- The client's original 140 legacy URL inventory was not available. Redirect
  patterns were structurally checked, but exact client URL correspondence
  remains unverified.
- The current deployment's mobile Lighthouse LCP is 4.953 s (home), 2.518 s
  (packages) and 3.765 s (Munnar detail). All improved against the retained
  baseline; the 2.5 s target was not met.
- Demo-seeded accounts must be changed or removed before real use. The
  in-memory rate limiter is not shared across serverless instances.
- The pushed release SHA is
  `4c58cbbeb3db0e9e42aa53358b2a5420bca935cf`. Local quote-approval and
  related-record retention changes are not in that deployed commit.

## 8. Troubleshooting

| Symptom | Check |
|---|---|
| Prisma cannot connect | Validate `DATABASE_URL`, SSL requirements and database network access |
| Authentication fails | Confirm `NEXTAUTH_SECRET`, `NEXTAUTH_URL` and that the seed ran against this database |
| AI returns fallback data | Check provider environment configuration; enquiry intake is designed to continue without provider success |
| Cron returns 401 | Confirm `CRON_SECRET` and the platform's bearer authorization header |
| Remote image is blocked | Check the image host allowlist in `next.config.ts` and CSP in `src/proxy.ts` |
| Port is occupied | Start Next.js with `npx next dev -p 3001` |

Never commit `.env`, API keys, production connection strings or real traveller
data.
