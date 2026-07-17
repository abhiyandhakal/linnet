# Linnet operations

## Required environment

`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `WEB_ORIGIN` are mandatory. Google and OpenAI values are optional at boot; Google sign-in and model-backed interpretation are unavailable until configured.

## Migrations

Run `bun run db:generate` after changing the schema, commit the generated migration, then run `bun run db:migrate` once per environment before releasing the API or worker.

## Durable jobs

The worker leases queued Postgres jobs for one minute. An expired lease is returned to the queue on worker startup. Idempotency keys prevent duplicate capture jobs; handlers must remain idempotent before new job types are enabled.

## Calendar boundary

Calendar credentials must be encrypted with `TOKEN_ENCRYPTION_KEY`. The API stores only Linnet-owned provider event identifiers; integrations must not modify an event that lacks the Linnet ownership marker.
