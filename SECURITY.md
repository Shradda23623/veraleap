# Security Policy

## Reporting a vulnerability

If you find a security issue in VeraLeap, please report it privately so it can be fixed before being disclosed publicly.

**Email:** shradda141@gmail.com
**Subject line:** `Security: <one-line summary>`

Please include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce, or a proof-of-concept if you have one.
- The commit hash or version you tested against.
- Whether you'd like to be credited in the fix announcement.

You'll get a response within 72 hours. Verified issues are typically patched within 7 days for high-severity bugs, 30 days for lower-severity ones.

## What's in scope

- The deployed application at `veraleap.com` (and any preview deployment under `*.vercel.app`).
- The source code in this repository, including SQL migrations.
- Authentication and authorization flows (sign-in, MFA enrollment, role checks, RLS policies).

## What's out of scope

- Issues in third-party services (Supabase, Google Maps, Vercel) — please report those upstream.
- Denial-of-service via volumetric load; rate limiting is enforced at the database layer but not designed to defend against L7 floods.
- Self-XSS or attacks requiring access to a user's already-authenticated session.
- Missing security headers on local-development builds.

## Hardening that's already in place

- Row-level security enforced on every table (`profiles`, `properties`, `favorites`, `notifications`, `visits`, `reviews`, `reports`, `rate_limits`, etc.).
- Admin-only tables gated through a `has_role()` SQL function rather than client-side checks.
- Mandatory TOTP for brokers and admins before any privileged action.
- Server-side proxy for the Google Maps API key — the key never ships to the browser.
- Strict transport security, frame deny, and a tight permissions policy on production responses.
- Per-user, per-window rate limits on review submissions, report filings, and visit requests.

Thanks for helping keep VeraLeap and its users safe.
