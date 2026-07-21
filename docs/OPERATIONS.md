# Linnet operations

## Required environment

`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `WEB_ORIGIN` are mandatory. Google and Groq values are optional at boot; Google sign-in and model-backed interpretation are unavailable until configured.

## Vercel beta

Linnet uses a single Vercel project and one public origin: `https://linnet.abhiyan.me`. Vercel Functions run the Elysia API under `/api`, and Vercel Queues dispatch `linnet-jobs` to the private `api/queue.ts` consumer.

Set these production variables in Vercel:

```text
DATABASE_URL=<Supabase pooled PostgreSQL URL>
BETTER_AUTH_SECRET=<random 32+ character value>
BETTER_AUTH_URL=https://linnet.abhiyan.me
WEB_ORIGIN=https://linnet.abhiyan.me
AI_PROVIDER=groq
GROQ_API_KEY=<rotated server-only key>
GROQ_ROUTINE_MODEL=openai/gpt-oss-20b
GROQ_REASONING_MODEL=openai/gpt-oss-120b
GOOGLE_CLIENT_ID=<OAuth web client ID>
GOOGLE_CLIENT_SECRET=<OAuth web client secret>
GOOGLE_CALENDAR_REDIRECT_URL=https://linnet.abhiyan.me/api/v1/calendar/google/callback
TOKEN_ENCRYPTION_KEY=<base64 32-byte key>
NODE_ENV=production
```

Google OAuth needs `https://linnet.abhiyan.me` as an authorized JavaScript origin and `https://linnet.abhiyan.me/api/auth/callback/google` as an authorized redirect URI. Calendar authorization uses the redirect URL above.

Run migrations as an explicit release step before the first deployment:

```sh
bun run db:migrate
```

The Expo preview profile builds an installable APK and embeds `https://linnet.abhiyan.me` as its public API origin. Build it with `bunx eas-cli build --platform android --profile preview` from `apps/mobile`.

## Migrations

Run `bun run db:generate` after changing the schema, commit the generated migration, then run `bun run db:migrate` once per environment before releasing the API or worker.

## Durable jobs

The worker leases queued Postgres jobs for one minute. An expired lease is returned to the queue on worker startup. Idempotency keys prevent duplicate capture jobs; handlers must remain idempotent before new job types are enabled.

## Calendar boundary

Calendar credentials must be encrypted with `TOKEN_ENCRYPTION_KEY`. The API stores only Linnet-owned provider event identifiers; integrations must not modify an event that lacks the Linnet ownership marker.
