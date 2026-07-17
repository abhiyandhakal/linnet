# Linnet

Linnet is a plan-driven personal secretary. Goals and plan revisions are durable; actions, calendar blocks, and daily briefs are the execution layer derived from them.

## Local development

1. Copy `.env.example` to `.env` and provide a PostgreSQL connection string.
2. Run `bun install`.
3. Run `bun run db:generate && bun run db:migrate`.
4. Start the API with `bun run dev:api`, the worker with `bun run dev:worker`, and the web app with `bun run dev:web`.

For the mobile app, set `EXPO_PUBLIC_API_URL` to a reachable API origin and run `bun run --cwd apps/mobile start`. EAS profiles live in `apps/mobile/eas.json`.

The API serves OpenAPI at `/openapi` in development and `/openapi/json` in every environment.

Invite the first beta account after migrating with `bun run db:invite -- you@example.com`.
