# VeraLeap

Rental scam prevention platform. Verify rental listings, check landlord credibility, and connect with trusted brokers before you commit.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (auth, database, storage, edge functions)
- TanStack Query for data fetching
- React Router v6
- `@vis.gl/react-google-maps` for map views

## Getting started

```sh
npm install
npm run dev
```

Required environment variables (see `.env`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

The `get-maps-key` Supabase edge function expects a `GOOGLE_MAPS_API_KEY` secret on the Supabase side; the map shows a placeholder if the key is not configured.

## Scripts

- `npm run dev` — start Vite dev server on port 8080
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm test` — run Vitest once
- `npm run test:watch` — Vitest in watch mode
