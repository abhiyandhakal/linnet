# Linnet Monorepo

A full-stack TypeScript monorepo with TanStack Start frontend and Elysia backend, featuring end-to-end type safety via Elysia Eden Treaty.

## Architecture

```
linnet-monorepo/
├── apps/
│   ├── api/              # Elysia backend (REST API)
│   └── dashboard/        # TanStack Start frontend (SSR React)
└── packages/
    ├── logic/            # Shared business logic (Zod schemas)
    ├── api-client/       # Type-safe API client (Elysia Eden)
    └── ui/               # Shared React components
```

## Tech Stack

- **Frontend**: TanStack Start (React + SSR)
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

1. **Define API routes** in `apps/api/src/index.ts`
2. **Export the app type**: `export type App = typeof app`
3. **Import in api-client**: Type-safe client is automatically generated
4. **Use in frontend**: Full autocomplete and type checking

Example:

```typescript
// apps/api/src/index.ts
const app = new Elysia()
  .get('/users/:id', ({ params }) => ({ id: params.id, name: 'John' }))

export type App = typeof app

// packages/api-client/src/index.ts
export const api = edenTreaty<App>('http://localhost:3500')

// apps/dashboard - Usage
const { data } = await api.users['123'].get()
// data is fully typed! { id: string, name: string }
```

## Project Structure

### Packages

- **`@linnet/logic`**: Shared business logic, validation schemas (Zod)
- **`@linnet/api-client`**: Type-safe API client using Elysia Eden Treaty
- **`@linnet/ui`**: Shared React components and utilities

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

# Output: apps/dashboard/.output/
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
