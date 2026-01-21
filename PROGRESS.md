# Linnet Development Progress

## Project Overview
AI Personal Secretary built with:
- **Landing:** Astro + Tailwind v4 (Port 3501)
- **Dashboard:** TanStack Start + Tailwind v4 (Port 3502)
- **API:** ElysiaJS + Auth.js (Port 3500)
- **DB:** Neon Postgres + Drizzle ORM

## Phase 0: Infrastructure Setup ✅

### Completed
- [x] Monorepo structure (Bun workspaces + Turbo)
- [x] Database schema (Users, Accounts, Sessions, Tasks, Events, Notes, Embeddings)
- [x] pgvector extension enabled in Neon
- [x] Migrations pushed successfully
- [x] Environment variables configured

### Tech Stack
- Bun runtime
- Drizzle ORM
- Neon Postgres with pgvector
- Auth.js v5

---

## Phase 1: Landing Page ✅

### Completed
- [x] Astro setup with Tailwind v4
- [x] "Analog Utility" design system implemented
  - Paper texture background (#FDFCF0)
  - Instrument Serif (headings) + Outfit (body)
  - Noise filter overlay
  - Red pen accent (#E63946)
- [x] Hero section
- [x] Features section
- [x] How It Works section
- [x] Footer with "Get Started" CTA
- [x] OAuth links point to API endpoints

### Known Issues
- [ ] **CRITICAL:** Tailwind v4 + @astrojs/tailwind conflict causing PostCSS error
  - Error: `@layer base is used but no matching @tailwind base directive is present`
  - Root cause: `@astrojs/tailwind` is v3-compatible, conflicts with v4 CSS imports
  - **Fix needed:** Remove `@astrojs/tailwind`, use Tailwind v4 Vite plugin directly

---

## Phase 2: Authentication (API) ✅

### Completed
- [x] Auth.js v5 setup in ElysiaJS
- [x] Google OAuth provider configured
- [x] Environment variables set:
  - `AUTH_SECRET`
  - `AUTH_URL=http://localhost:3501`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- [x] OAuth callbacks registered:
  - `http://localhost:3501/api/auth/callback/google`
  - `http://localhost:3502/api/auth/callback/google`

### Pending
- [ ] Session management integration with Drizzle adapter
- [ ] Protected route middleware

---

## Phase 3: Dashboard Setup ✅

### Completed
- [x] TanStack Start (v1.120.20) setup
- [x] Tailwind v4 migration
- [x] Root route (`__root.tsx`) fixed
  - Issue: `Meta` and `Scripts` moved from `@tanstack/start` to `@tanstack/react-router`
  - Solution: Import `HeadContent` and `Scripts` from `@tanstack/react-router`
- [x] Auth proxy route created (`/api/auth/$`)
  - Forwards requests from port 3502 → 3500
- [x] Build passing

### Route Structure
```
app/routes/
├── __root.tsx (layout)
├── index.tsx (dashboard home)
├── tasks/
├── events/
├── notes/
└── api/auth/$.ts (proxy)
```

### Pending
- [ ] Implement dashboard UI
- [ ] Session verification on load
- [ ] Protected routes

---

## Phase 4: Core Features (PENDING)

### Tasks Module
- [ ] Create task form
- [ ] Task list view
- [ ] Task status updates
- [ ] Natural language parsing

### Events Module
- [ ] Calendar view
- [ ] Event creation
- [ ] Google Calendar sync

### Notes Module
- [ ] Rich text editor
- [ ] Note organization
- [ ] Search functionality

---

## Phase 5: AI Integration (PENDING)

### Gemini API Setup
- [ ] Configure Gemini client (`GEMINI_API_KEY` set)
- [ ] Implement in `packages/logic`

### AI Features
- [ ] Natural language → structured data
- [ ] Daily briefing generation
- [ ] Smart suggestions

---

## Phase 6: Vector Search (PENDING)

### pgvector Integration
- [ ] Embedding generation pipeline
- [ ] Semantic search for notes
- [ ] Similar task detection

---

## Phase 7: Testing (PENDING)

- [ ] API endpoint tests
- [ ] Auth flow tests
- [ ] Component tests (Dashboard)

---

## Phase 8: Deployment (PENDING)

- [ ] API deployment config
- [ ] Landing page deployment
- [ ] Dashboard deployment
- [ ] Environment variables in production

---

## Phase 9: Documentation (PENDING)

- [ ] API documentation
- [ ] User guide
- [ ] Developer setup guide

---

## Current Blockers

### 1. Landing Page CSS Error (HIGH PRIORITY)
**Error:**
```
[postcss] @layer base is used but no matching @tailwind base directive is present
```

**Root Cause:**
- Using Tailwind v4 with `@import "tailwindcss"` syntax
- `@astrojs/tailwind` integration expects v3 directives
- Conflict between v3 integration and v4 CSS-first approach

**Solution:**
1. Remove `@astrojs/tailwind` from `apps/landing/package.json`
2. Remove from `astro.config.mjs`
3. Add `@tailwindcss/vite` plugin directly
4. Keep existing `global.css` with `@import "tailwindcss"`

### 2. Dashboard Client Export Warning (LOW PRIORITY)
**Warning:**
```
"default" is not exported by "app/client.tsx"
```

**Action:** Check if `app/client.tsx` exists and has correct exports

---

## Next Actions

1. ✅ Update environment variables
2. ✅ Fix Dashboard build
3. 🔄 Fix Landing page Tailwind v4 conflict
4. ⏳ Start dev server (`bun dev`)
5. ⏳ Verify OAuth flow (3501 → API → 3502)
6. ⏳ Implement dashboard UI
7. ⏳ Integrate Gemini API

---

## Git Commits Log

- `fix(dashboard): replace Meta with HeadContent from @tanstack/react-router`
- `feat(dashboard): add auth proxy route for OAuth flow`
- `chore: update environment variables with OAuth and database credentials`

---

**Last Updated:** 2026-01-21
**Current Phase:** Phase 3 (Dashboard Setup) → Phase 1 (Landing Page CSS Fix)
