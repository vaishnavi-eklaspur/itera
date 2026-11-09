# Itera deployment guide

## Reviewer access

- **Repository:** https://github.com/vaishnavi-eklaspur/itera
- **Live app:** https://itera-5nq4.vercel.app

Seeded demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@itera.in` | `admin123` |
| Editor | `editor@itera.in` | `editor123` |
| Consultant | `consultant@itera.in` | `consultant123` |
| Traveller | `traveller@itera.in` | `traveller123` |

These credentials are for the review database only. Rotate or remove them
before any real deployment.

## Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer; Neon is suitable for Vercel
- A database connection string with SSL enabled for hosted PostgreSQL
- Optional Groq and/or Gemini API key for live AI calls

## Local setup (PowerShell)

```powershell
git clone https://github.com/vaishnavi-eklaspur/itera.git
Set-Location itera
npm install
Copy-Item .env.example .env
```

Edit `.env` with local values. Names only are listed below; do not commit the
file or any secret.

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Session signing secret |
| `NEXTAUTH_URL` | Yes | Base URL, for example `http://localhost:3000` |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical/sitemap/robots base URL |
| `GROQ_API_KEY` | No | Preferred AI extraction and drafting provider |
| `GEMINI_API_KEY` | No | AI fallback provider |
| `INTERNAL_API_SECRET` | Yes | Protects the internal AI endpoint |
| `CRON_SECRET` | Yes | Protects scheduled retention and package-publishing requests |
| `ENQUIRY_RETENTION_DAYS` | No | Closed-enquiry retention period; default is 730 |

`NEXT_PUBLIC_SITE_URL` and `ENQUIRY_RETENTION_DAYS` are optional and are not
included in the current `.env.example`; add them to `.env` or the deployment
environment only when you need to override their defaults.

Generate local secrets with a password manager or a cryptographically secure
generator. For example, with OpenSSL:

```powershell
openssl rand -base64 32
openssl rand -hex 32
```

Create the schema and sample data:

```powershell
npx prisma db push
npx prisma db seed
```

Start the app:

```powershell
npm run dev
```

The default URL is http://localhost:3000. To use port 3001:

```powershell
npx next dev -p 3001
```

The seed creates packages, seasonal prices, enquiries, replies, notes, blog
posts and users. Re-running it is intended to be safe for the demo database.

## Verification commands

```powershell
npm test
npm run lint
npx tsc --noEmit
npm run build
```

For database inspection:

```powershell
npm run db:studio
```

## Vercel deployment

1. Import `vaishnavi-eklaspur/itera` at https://vercel.com/new.
2. Add the environment variables above in Project Settings for the
   **Production** environment.
3. Set `NEXTAUTH_URL` and, preferably, `NEXT_PUBLIC_SITE_URL` to the final
   HTTPS domain.
4. Deploy. The repository build command is `npm run vercel-build`, which runs
   `prisma db push --skip-generate && next build`.
5. Seed the production database once from a controlled machine:

   ```powershell
   $env:DATABASE_URL = "<production-connection-string>"
   npx prisma db seed
   Remove-Item Env:DATABASE_URL
   ```

   Never place the connection string in source control or a shell history
   shared with the team.

`vercel.json` schedules `/api/cron/retention` daily at 02:00 UTC and
`/api/cron/publish` daily at 03:00 UTC. Both schedules meet Vercel Hobby's
once-daily limit; scheduled publishing can be delayed by up to roughly 24
hours. Scheduled edits to published packages keep the current content and
prices live until the cron activates the staged version and prices together;
staff can use “Publish Now” to activate an edit immediately. Scheduled edits
cannot change a package URL slug, since that is package-level data and changing
it would affect the live URL immediately. Both handlers reject requests when
`CRON_SECRET` is missing or the bearer token is incorrect. Vercel supplies the
configured cron authorization header. These schedules are deployed only when
the commit containing `vercel.json` is deployed.

## Other hosts

For a long-running Node host:

```powershell
npm ci
npx prisma generate
npm run build
npx prisma db push
npm start
```

Set the same environment variables and expose the port selected by the host.
For multiple application instances, replace the in-memory rate limiter with a
shared Redis/Upstash or platform rate-limit service before production traffic.

## Troubleshooting

| Symptom | Check |
|---|---|
| Prisma cannot connect | Confirm `DATABASE_URL`, SSL parameters and database network access |
| Login redirects or fails | Confirm `NEXTAUTH_SECRET` and that `NEXTAUTH_URL` exactly matches the current origin |
| AI fields use fallback values | Configure `GROQ_API_KEY` or `GEMINI_API_KEY`; the core enquiry flow still works without them |
| Cron returns 401 | Set `CRON_SECRET` in the deployment environment and confirm the platform sends its configured bearer authorization header |
| Images do not render | Check the image host is permitted by `next.config.ts` and the response CSP |
| Port already in use | Start Next.js with `npx next dev -p 3001` or stop the specific process holding the port |

## Security notes

Do not commit `.env`, production credentials, real traveller data or API keys.
Use separate secrets and databases for local, preview and production
environments. Review the current CSP, external image hosts and distributed
rate-limiting behaviour before treating the deployment as production-ready.
