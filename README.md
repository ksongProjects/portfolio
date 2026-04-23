# Portfolio Demo Lab

Next.js 16 app for portfolio landing plus route-based demo apps.

## Routes

- `/` portfolio landing page
- `/night-sky` interactive night sky explorer
- `/finance` placeholder for future live portfolio viewer
- `/budget` placeholder for future budget manager

## Architecture

App use modular monolith shape now:

- `src/app` keeps route entry points
- `src/features/<feature>` owns page components and page data loaders
- `src/server` keeps shared infra like DB access and service registry
- `src/lib` keeps shared types, content, and pure helpers

This keeps one frontend app, one deployment, one auth/session surface, while leaving clean seams for future service splits.

## Microservice-ready seam

Finance and budget placeholders already read optional service URLs from env:

- `FINANCE_SERVICE_URL`
- `BUDGET_SERVICE_URL`

Best practice path:

1. Browser talks to Next.js route handlers or server actions.
2. Next.js acts as BFF/gateway for auth, caching, normalization, and secret handling.
3. Feature services move out only when needed for scale, background jobs, vendor complexity, or team ownership.

## Development

Run local dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data setup

Night sky route can use Supabase-backed catalog data.

```bash
npm run db:push
npm run sky:sync
```

Set `DATABASE_URL`, `POSTGRES_URL`, or `SUPABASE_DB_URL` first.
