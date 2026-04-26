# Changelog

All notable changes to VeraLeap are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Removed
- Google Maps integration (`MapView`, `PropertyMap`, `LocationPicker`, `useGoogleMapsKey` hook, `get-maps-key` edge function).
- `@vis.gl/react-google-maps` dependency.
- `VITE_GOOGLE_MAPS_API_KEY` environment variable.

### Added
- Architecture diagram (`docs/architecture.svg`) covering client, Supabase, and external services.
- Demo video script (`docs/DEMO_SCRIPT.md`) for recording a 90-second walkthrough.
- GitHub Actions CI pipeline: lint, typecheck, test, and build on every PR.
- Vercel deploy config with security headers (HSTS, X-Frame-Options, Permissions-Policy) and asset caching.
- Sentry error tracking integration (`src/lib/sentry.ts`) — no-ops without a DSN.
- PostHog product analytics integration (`src/lib/posthog.ts`) — no-ops without a key.
- Vite manual chunk splitting for `react`, `supabase`, and `ui` vendor bundles.
- `.env.example` with all required and optional environment variables.
- `SECURITY.md` with a responsible-disclosure policy.
- Additional Vitest coverage for the SEO hook, route tree, and the 404 page.

### Changed
- README rewritten with status badges, deploy instructions, observability section, and seed-account login table.
- Removed Lovable-specific Playwright config in favour of standard `@playwright/test` setup.

## [0.1.0] - 2026-04-19

Initial portfolio release.

### Added
- React 18 + TypeScript + Vite frontend with Tailwind, shadcn/ui, and Framer Motion.
- Supabase backend with row-level security across 12 tables.
- Four-role RBAC: tenant, owner, broker, admin.
- Mandatory TOTP 2FA for brokers and admins via `MfaGuard`.
- Real-time notifications via Supabase Realtime.
- Rate limiting for review, report, and visit submissions.
- Progressive Web App manifest and SEO-ready per-page meta tags.
- Demo seed data — 10 verified listings across 8 cities.
