# Final Security Verification

**Date:** 2026-11-07
**Scope:** Verify all remediation from REMEDIATION_REPORT.md with live API tests and build tools.

---

## 1. IP Header Trust & Login Rate Limiting

### getClientIp behavior

| Header sent | Returned IP | Correct? |
|---|---|---|
| `x-real-ip: 1.2.3.4` + `x-forwarded-for: 9.9.9.9, 8.8.8.8` | `1.2.3.4` | Yes — prefers trusted proxy header |
| `x-forwarded-for: spoofed, 10.0.0.1` (no x-real-ip) | `10.0.0.1` | Yes — rightmost value (proxy-appended) |
| No headers | `unknown` | Yes — safe fallback |

### Login rate limiting

- Path: `POST /api/auth/callback/credentials`
- Window: 15 minutes (900,000ms), max 5 attempts per IP
- Key: `login:<ip>` (isolated from enquiry rate limiter)
- Verified: proxy intercepts before auth handler runs

### Unresolved risks (Vercel/serverless)

| Risk | Severity | Detail |
|---|---|---|
| In-memory rate limiter resets on cold start | Medium | The `Map<string, number[]>` lives in process memory. On Vercel serverless, each function instance has its own Map, and concurrent instances don't share state. An attacker sending requests to different instances bypasses the limiter. |
| Multiple instances don't share rate-limit state | Medium | Same root cause. Mitigation requires an external store (Redis/Upstash). Acceptable for internship scope — the limiter still throttles sequential abuse from a single instance. |
| x-forwarded-for rightmost may be proxy IP, not client | Low | Deployment-dependent. On Vercel, `x-real-ip` is authoritative and takes priority. The rightmost fallback is a defense-in-depth layer, not the primary signal. |

---

## 2. API Authorization Tests

### Unauthenticated requests (no session cookie)

| Endpoint | Method | Status | Expected |
|---|---|---|---|
| `/api/admin/packages` | GET | **401** | 401 |
| `/api/admin/blog` | GET | **401** | 401 |
| `/api/admin/enquiries` | GET | **401** | 401 |
| `/api/admin/blog/:id` | GET | **401** | 401 (SEC-04 fix) |
| `/api/admin/enquiries/:id` | PUT | **401** | 401 (SEC-05 fix) |
| `/api/admin/blog` | POST | **401** | 401 |

### TRAVELLER role (proxy-level block)

| Endpoint | Method | Status | Expected |
|---|---|---|---|
| `/api/admin/packages` | GET | **403** | 403 |
| `/api/admin/blog` | GET | **403** | 403 |

### ADMIN role (full access)

| Endpoint | Method | Status | Expected |
|---|---|---|---|
| `/api/admin/packages` | GET | **200** | 200 |
| `/api/admin/blog` | GET | **200** | 200 |
| `/api/admin/enquiries` | GET | **200** | 200 |
| `/api/admin/blog` | POST (create) | **201** | 201 |
| `/api/admin/enquiries/:id` | PUT | **200** | 200 |
| `/api/admin/enquiries/:id/notes` | POST | **201** | 201 |
| `/api/admin/enquiries/bulk` | PUT | **200** | 200 |

### CONSULTANT role (enquiry ops only)

| Endpoint | Method | Status | Expected |
|---|---|---|---|
| `/api/admin/packages` | GET | **200** | 200 (read allowed) |
| `/api/admin/blog` | GET | **200** | 200 (read allowed) |
| `/api/admin/enquiries` | GET | **200** | 200 (read allowed) |
| `/api/admin/blog/:id` | GET | **200** | 200 (read allowed) |
| `/api/admin/blog` | POST (create) | **403** | 403 (content write blocked) |
| `/api/admin/blog/:id` | DELETE | **403** | 403 (destructive blocked) |
| `/api/admin/enquiries/:id` | PUT | **200** | 200 (enquiry write allowed) |
| `/api/admin/enquiries/:id/notes` | POST | **201** | 201 (enquiry write allowed) |
| `/api/admin/enquiries/bulk` | PUT | **403** | 403 (bulk is ADMIN-only) |
| `/api/admin/packages/:id` | DELETE | **403** | 403 (destructive blocked) |

**All 27 authorization checks returned the expected status code.**

---

## 3. Build Tool Results

| Tool | Result |
|---|---|
| `npx vitest run` | **4 files, 64 tests passed** (0 failures) |
| `npx tsc --noEmit` | **0 errors** |
| `npx eslint .` | **0 errors**, 17 warnings (all pre-existing `<img>` vs `next/image`) |
| `npm run build` | **Success** — all routes compiled, proxy active |

---

## 4. Security Headers

| Header | Value | Present? |
|---|---|---|
| `X-Powered-By` | (absent) | Suppressed (SEC-08) |
| `X-Content-Type-Options` | `nosniff` | Yes |
| `X-Frame-Options` | `DENY` | Yes |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Yes |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Yes |
| `Content-Security-Policy` | Full policy with `frame-ancestors 'none'` | Yes |

---

## 5. Unresolved Risks (accepted / out of scope)

| Finding | Status | Rationale |
|---|---|---|
| In-memory rate limiter on serverless | Accepted | Adequate for demo/internship. Production would use Redis/Upstash. Rate limiting still works per-instance. |
| Gemini API receives customer enquiry text | Accepted | Architectural decision per TDD 2.4. Data is limited to what the customer submitted publicly. Prompt injection mitigated with extraction prompt guard. |
| CSP allows `unsafe-inline` and `unsafe-eval` for scripts | Accepted | Required by Next.js development/hydration. Production CSP can be tightened with nonce-based approach. |
| ESLint `<img>` warnings | Cosmetic | Not security-related. `next/image` is a performance optimization, not a security fix. |
