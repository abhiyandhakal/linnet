# AGENTS.md - AI Agent Context for Linnet Project

**Last Updated:** 2026-01-21  
**Project:** Linnet - AI Personal Secretary  
**Purpose:** This document provides comprehensive context for AI coding agents working on this project across sessions.

---

## Project Overview

**Linnet** is an AI-powered personal secretary that helps users capture thoughts via voice/text, organizes schedules automatically, and provides daily briefings. The system uses natural language processing to eliminate manual data entry.

### Tech Stack

```
Frontend:
- Landing Page: Astro + Tailwind CSS v4
- Dashboard: TanStack Start (React) + Tailwind CSS v4

Backend:
- API: ElysiaJS (Bun runtime)
- Auth: Auth.js v5 with Google OAuth
- Database: Neon Postgres + Drizzle ORM + pgvector

Infrastructure:
- Monorepo: Bun workspaces
- Build Tool: TurboRepo
- Package Manager: Bun
```

---

## Architecture

### Monorepo Structure

```
linnet/
├── apps/
│   ├── api/              # ElysiaJS backend (port 3500)
│   ├── landing/          # Astro landing page (port 3501)
│   └── dashboard/        # TanStack Start dashboard (port 3502)
├── packages/
│   ├── db/               # Drizzle ORM schema + migrations
│   └── logic/            # Shared business logic (planned)
├── .env                  # Environment variables (NOT in git)
├── package.json          # Root workspace config
├── PROGRESS.md           # Phase-by-phase progress tracker
└── AGENTS.md            # This file
```

### Port Allocation

- **3500**: API server (ElysiaJS)
- **3501**: Landing page (Astro)
- **3502**: Dashboard (TanStack Start)

---

## Environment Variables

All environment variables are defined in `.env` at the repository root:

```bash
# API Server
API_PORT=3500
API_HOST=localhost
API_URL=http://localhost:3500

# Landing Page
LANDING_URL=http://localhost:3501

# Dashboard
DASHBOARD_URL=http://localhost:3502
VITE_API_URL=http://localhost:3500
VITE_LANDING_URL=http://localhost:3501

# Database (Neon)
DATABASE_URL=postgresql://...

# Auth.js
AUTH_SECRET=...
AUTH_URL=http://localhost:3500
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# AI
GEMINI_API_KEY=...
```

### Important Notes:
- **NEVER hardcode URLs** - always use environment variables
- `AUTH_URL` is set to the API server (3500) where Auth.js runs
- Dashboard uses `VITE_*` prefixed variables (accessible in browser)
- API uses unprefixed variables (server-side only)

---

## Authentication Flow

### OAuth Flow Diagram

```
1. User visits Landing Page (3501)
   ↓
2. Clicks "Get Started" → Redirects to ${API_URL}/auth/signin (3500)
   ↓
3. Auth.js shows signin page with "Sign in with Google" button
   ↓
4. User clicks button → POST to ${API_URL}/auth/signin/google with CSRF token
   ↓
5. Auth.js redirects to Google OAuth consent screen
   ↓
6. User authorizes → Callback to ${AUTH_URL}/auth/callback/google (3500)
   ↓
7. Auth.js creates session in DB and redirects to Dashboard (3502)
   ↓
8. Dashboard checks session via ${API_URL}/auth/session
   ↓
9. If authenticated: Show dashboard home
   If not authenticated: Redirect to Landing (3501)
```

**IMPORTANT:** The landing page must link to `/auth/signin`, NOT `/auth/signin/google`. Auth.js requires a CSRF-protected form submission, which is handled by the signin page.

### Key Files

**API (apps/api/src/):**
- `auth.config.ts`: Auth.js v5 configuration
  - Google OAuth provider
  - Drizzle adapter for session persistence
  - `basePath: "/auth"` - tells Auth.js its base path
  - Redirect callback (sends users to dashboard after signin)
- `routes/auth.ts`: Auth endpoints
  - `/auth/*` - Catch-all for ALL Auth.js routes
  - Auth.js internally handles: `/auth/signin`, `/auth/signin/google`, `/auth/callback/google`, `/auth/session`, etc.
- `.env`: **MUST** contain correct environment variables (see Environment Variables section)

**Dashboard (apps/dashboard/app/):**
- `utils/auth.ts`: Session utility
  - `getSession()` - Fetches session from API
- `routes/index.tsx`: Home page with auth guard
  - Redirects unauthenticated users to landing page
- `routes/api/auth/$.ts`: Auth proxy route (optional)

---

## Database Schema

Located in `packages/db/src/schema/`

### Users & Auth (users.ts)
```typescript
- users: User accounts
- accounts: OAuth provider data
- sessions: Active sessions
- verification_tokens: Email verification
```

### App Data (app.ts)
```typescript
- tasks: User tasks with status/priority
- events: Calendar events
- notes: User notes with vector embeddings
- embeddings: Semantic search vectors (pgvector)
```

### Running Migrations

```bash
# Generate migration
cd packages/db
bun run db:generate

# Push to database
bun run db:push

# Enable pgvector (one-time setup)
bun run scripts/enable-vector.ts
```

---

## Design System: "Analog Utility"

Inspired by paper notebooks with minimal digital touches.

### Colors
```css
--paper: #FDFCF0        /* Cream paper background */
--ink: #1A1A1A          /* Dark text */
--muted-ink: #666666    /* Secondary text */
--red-pen: #E63946      /* Accent color */
--border: #E0DED5       /* Subtle borders */
```

### Typography
- **Headings**: Instrument Serif (via @fontsource/instrument-serif)
- **Body**: Outfit (via @fontsource/outfit)

### Visual Effects
- Paper texture background
- SVG noise filter overlay
- Subtle shadows and borders
- Handwritten accent elements (red pen color)

### CSS Variables
Both landing and dashboard use the same design tokens defined in their respective CSS files.

---

## Critical Technical Issues & Solutions

### 1. Tailwind CSS v4 Compatibility (FIXED)

**Problem:** `@astrojs/tailwind` (v3-compatible) conflicts with Tailwind v4's `@import "tailwindcss"` syntax.

**Error:** `@layer base is used but no matching @tailwind base directive is present`

**Solution:**
- Removed `@astrojs/tailwind` from `apps/landing/package.json`
- Added `@tailwindcss/postcss` + `postcss`
- Created `apps/landing/postcss.config.js`:
  ```js
  import tailwindcss from '@tailwindcss/postcss';
  export default { plugins: [tailwindcss()] };
  ```

### 2. TanStack Start Import Changes (FIXED)

**Problem:** TanStack Start v1.120.20 moved `Meta` and `Scripts` components to `@tanstack/react-router`.

**Error:** `"Meta" is not exported by @tanstack/start/dist/esm/client.js`

**Solution in `apps/dashboard/app/routes/__root.tsx`:**
```typescript
// OLD (broken):
import { Meta, Scripts } from '@tanstack/start'

// NEW (working):
import { HeadContent, Scripts } from '@tanstack/react-router'

// In component:
<head><HeadContent /></head> // instead of <Meta />
```

### 3. createServerFn Not Available (FIXED)

**Problem:** `createServerFn` doesn't exist in TanStack Start v1.120.20.

**Solution:** Use regular async functions in loaders instead:
```typescript
// In apps/dashboard/app/utils/auth.ts
export async function getSession(): Promise<Session> {
  const response = await fetch(`${API_URL}/auth/session`, ...);
  return response.json();
}
```

### 4. Auth.js OAuth Flow Issues (FIXED)

**Problem:** Getting `UnknownAction` error when trying to sign in with Google.

**Root Causes:**
1. `apps/api/.env` had incorrect `AUTH_URL` (pointing to landing page instead of API)
2. `apps/api/.env` was missing `LANDING_URL` and `DASHBOARD_URL`
3. Landing page was linking directly to `/auth/signin/google` instead of `/auth/signin`
4. Elysia prefix was interfering with Auth.js path handling

**Solution:**
1. **Fix `apps/api/.env`**: Ensure it matches root `.env` with correct URLs:
   ```bash
   AUTH_URL=http://localhost:3500  # Must point to API server
   LANDING_URL=http://localhost:3501
   DASHBOARD_URL=http://localhost:3502
   ```

2. **Fix landing page link**: Change from `/auth/signin/google` to `/auth/signin`
   ```astro
   <!-- apps/landing/src/components/Hero.astro -->
   <a href={`${apiUrl}/auth/signin`}>Get Started</a>
   ```

3. **Fix Auth.js config**: Add `basePath: "/auth"` to `auth.config.ts`
   ```typescript
   export const authConfig: AuthConfig = {
     basePath: "/auth",
     // ...
   }
   ```

4. **Fix Elysia routing**: Remove prefix to let Auth.js see full path
   ```typescript
   // apps/api/src/routes/auth.ts
   export const authRoutes = new Elysia()  // No prefix!
     .all("/auth/*", async ({ request }) => {
       const response = await Auth(request, authConfig);
       return response;
     });
   ```

**Key Learning:** Auth.js expects users to visit `/auth/signin` first, which shows a form with CSRF protection. Clicking "Sign in with Google" submits a POST request to `/auth/signin/google` with the CSRF token. Direct GET requests to `/auth/signin/google` will fail.

---

## Development Workflow

### Starting Development Servers

```bash
# From repository root
bun dev

# This runs all three apps in parallel:
# - API on 3500
# - Landing on 3501
# - Dashboard on 3502
```

### Running Builds

```bash
# Build all apps
bun run build

# Build specific app
cd apps/api && bun run build
cd apps/landing && bun run build
cd apps/dashboard && bun run build
```

### Git Commit Conventions

Use conventional commits:
- `feat(scope): description` - New features
- `fix(scope): description` - Bug fixes
- `refactor(scope): description` - Code refactoring
- `chore(scope): description` - Maintenance tasks
- `docs(scope): description` - Documentation updates

**Scopes:** `api`, `landing`, `dashboard`, `db`, `root`

### Example Commits:
```bash
git commit -m "feat(dashboard): add session check to home page"
git commit -m "fix(api): update CORS origins to use env variables"
git commit -m "refactor(db): extract embeddings to separate schema file"
```

---

## Current Implementation Status

See `PROGRESS.md` for detailed phase-by-phase progress.

### ✅ Completed Phases

**Phase 0: Infrastructure**
- Bun workspace monorepo setup
- Database schema with pgvector
- Migrations pushed to Neon

**Phase 1: Landing Page**
- Full Astro site with Analog Utility design
- Hero, Features, HowItWorks, Footer components
- Tailwind v4 with PostCSS plugin

**Phase 2: Authentication API**
- Auth.js v5 with Google OAuth
- Session persistence via Drizzle adapter
- `/auth/session` endpoint for session checks

**Phase 3: Dashboard Setup**
- TanStack Start with fixed imports
- Session utility with environment variables
- Authenticated home page with greeting
- ✅ **OAuth Flow Verified** - Full authentication working end-to-end

**Phase 4: Core Features**
- Tasks Module UI with full CRUD operations
- Events Module UI with full CRUD operations
- Notes Module UI with full CRUD operations
- Dashboard navigation and layout
- All API endpoints implemented and working

**Phase 5: AI Integration**
- Gemini client setup in `packages/logic`
- Natural language parsing for tasks/events
- Daily briefing generation with AI summaries
- AI-powered form population

**Phase 6: Vector Search**
- Embedding generation pipeline with Gemini text-embedding-004
- Semantic search for notes using pgvector
- Search mode toggle (text/semantic) in UI
- Automatic embedding management on create/update

### 📋 Pending Phases

**Phase 7-9: Testing, Deployment, Docs**

## Common Tasks for AI Agents

### Adding a New Route to Dashboard

1. Create route file in `apps/dashboard/app/routes/`
2. Use `createFileRoute` from `@tanstack/react-router`
3. Add loader if data fetching is needed
4. Check authentication status via `getSession()`
5. Use environment variables for API calls

### Creating a New API Endpoint

1. Create route file in `apps/api/src/routes/`
2. Use Elysia routing syntax
3. Import and use `.use()` in `apps/api/src/index.ts`
4. Add CORS origin if needed (uses env variables)
5. Update API types if needed

### Adding Database Tables

1. Define schema in `packages/db/src/schema/`
2. Export from `packages/db/src/schema/index.ts`
3. Generate migration: `bun run db:generate`
4. Review migration in `packages/db/drizzle/`
5. Push to database: `bun run db:push`

### Updating Environment Variables

1. Add to `.env` (NOT committed to git)
2. Document in this file (AGENTS.md)
3. Update all locations using hardcoded values
4. Prefix with `VITE_` if needed in browser (Dashboard)
5. Add to production environment when deploying

---

## Debugging Tips

### Build Failures

1. Check for hardcoded URLs (should use env variables)
2. Verify all imports are from correct packages
3. For Tailwind issues, check PostCSS config
4. For TanStack Start issues, check version (1.120.20)

### Runtime Errors

1. Check browser console for client-side errors
2. Check API server logs for backend errors
3. Verify environment variables are loaded
4. Check CORS configuration if fetch fails

### Authentication Issues

1. Verify `AUTH_URL` matches OAuth callback in Google Console
2. Check `AUTH_SECRET` is set (generate with: `openssl rand -base64 32`)
3. Verify database has users/accounts/sessions tables
4. Test `/auth/session` endpoint directly

---

## Important Files to Read First

When starting a new task, always read these files first:

1. **PROGRESS.md** - Current project status and completed work
2. **AGENTS.md** - This file (architectural overview)
3. **.env** - Environment configuration
4. **apps/api/src/auth.config.ts** - Auth flow logic
5. **apps/dashboard/app/routes/index.tsx** - Main dashboard page
6. **packages/db/src/schema/** - Database schema

---

## Contact & Resources

- **Repository:** (Add GitHub URL when available)
- **Documentation:** See individual README files in each app
- **Neon Dashboard:** https://console.neon.tech/
- **Google OAuth Console:** https://console.cloud.google.com/

---

## Notes for AI Agents

### Do's ✅
- Always use environment variables instead of hardcoded URLs
- Follow conventional commit message format
- Update PROGRESS.md when completing a phase
- Test builds after making changes (`bun run build`)
- Check for existing patterns before creating new ones

### Don'ts ❌
- Don't hardcode localhost URLs or port numbers
- Don't use `createServerFn` (not available in TanStack Start v1.120.20)
- Don't import `Meta` from `@tanstack/start` (use `HeadContent` from router)
- Don't commit `.env` file
- Don't skip reading PROGRESS.md before starting work

### When Stuck
1. Check this file (AGENTS.md) for architectural decisions
2. Check PROGRESS.md for implementation history
3. Search for similar patterns in the codebase
4. Check error logs carefully (they're usually accurate)
5. Verify environment variables are loaded correctly

---

**End of AGENTS.md**

*This document should be updated whenever architectural decisions are made or new patterns are established.*
