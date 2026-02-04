# Linnet Monorepo

A full-stack TypeScript monorepo with TanStack Start frontend and Elysia backend, featuring end-to-end type safety via Elysia Eden Treaty.

## Architecture

```
linnet-monorepo/
├── apps/
│   ├── api/              # Elysia backend (REST API)
│   └── dashboard/        # TanStack React frontend (Vite)
└── packages/
    └── api-client/       # Type-safe API client (Elysia Eden)
```

## Tech Stack

- **Frontend**: TanStack Router (React)
- **Backend**: Elysia (Bun-native web framework)
- **Type Safety**: Elysia Eden Treaty (end-to-end types)
- **Package Manager**: Bun
- **Monorepo**: Bun workspaces

## Prerequisites

- [Bun](https://bun.sh) v1.2.13 or later

## Getting Started

### 1. Install Dependencies

```bash
bun install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Default configuration:
- API: `http://localhost:3500`
- Dashboard: `http://localhost:3501`

### 3. Run Development Servers

**Start both servers:**
```bash
bun run dev
```

**Or start individually:**

```bash
# API server (port 3500)
cd apps/api && bun run dev

# Dashboard (port 3501)
cd apps/dashboard && bun run dev
```

## Available Commands

### Root Commands

```bash
# Run all dev servers
bun run dev

# Build all packages
bun run build

# Type check all packages
bun run typecheck
```

### Package-Specific Commands

```bash
# API
cd apps/api
bun run dev          # Start dev server
bun run typecheck    # Type check

# Dashboard
cd apps/dashboard
bun run dev          # Start dev server with HMR
bun run build        # Build for production
bun run start        # Start production server
bun run typecheck    # Type check
```

## Environment Variables

### API (`apps/api`)

| Variable | Default | Description |
|----------|---------|-------------|
| `API_PORT` | `3500` | Port for API server |
| `API_HOST` | `localhost` | Host for API server |

### Dashboard (`apps/dashboard`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3500` | API endpoint URL |

## Type Safety

This monorepo features end-to-end type safety using Elysia Eden Treaty:

1. **Define API routes** in `apps/api/src/app.ts`
2. **Export the app type**: `export type App = typeof app`
3. **Create the Eden client** in `packages/api-client`
4. **Use in the dashboard** for typed requests

Example:

```typescript
// apps/api/src/app.ts
export const app = new Elysia()
  .get('/users/:id', ({ params }) => ({ id: params.id, name: 'John' }))

export type App = typeof app

// packages/api-client/src/index.ts
export const createApiClient = <App>(baseUrl: string) => treaty<App>(baseUrl)

// apps/dashboard/src/router.tsx
const api = createApiClient<App>(import.meta.env.VITE_API_URL)
const { data } = await api.users['123'].get()
```

## Project Structure

### Packages

- **`@linnet/api-client`**: Type-safe API client using Elysia Eden Treaty

### Apps

- **`api`**: Elysia REST API server
- **`dashboard`**: TanStack Start SSR application

## Development

### Adding a New Package

1. Create package directory: `packages/my-package`
2. Add `package.json` with workspace protocol dependencies
3. Add to workspace in root `package.json`

### Adding a New Route

**API:**
```typescript
// apps/api/src/index.ts
app.get('/new-route', () => ({ message: 'Hello!' }))
```

**Frontend:**
```typescript
// Access via api-client with full type safety
const response = await api['new-route'].get()
```

## Build

```bash
# Build all packages
bun run build

# Output: apps/dashboard/dist/
```

## Troubleshooting

### Port Conflicts

If ports 3500/3501 are in use, update `.env`:

```bash
API_PORT=4000
VITE_API_URL=http://localhost:4000
```

And update dashboard dev command:
```bash
cd apps/dashboard
vinxi dev --config app.config.ts --port 4001
```

### Type Errors

Run type check to identify issues:
```bash
bun run typecheck
```

### Clean Install

```bash
rm -rf node_modules bun.lock
bun install
```

## License

MIT
