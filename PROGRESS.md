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
  - `AUTH_URL=http://localhost:3500` (API server)
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `LANDING_URL=http://localhost:3501`
  - `DASHBOARD_URL=http://localhost:3502`
- [x] OAuth callbacks registered:
  - `http://localhost:3500/auth/callback/google`
- [x] Session management with Drizzle adapter
- [x] **OAuth flow verified end-to-end** (2026-01-21)
  - Landing → Auth.js signin page → Google → Dashboard
  - Session creation working
  - Redirect callback working

---

## Phase 3: Dashboard Setup ✅

### Completed
- [x] TanStack Start (v1.120.20) setup
- [x] Tailwind v4 migration
- [x] Root route (`__root.tsx`) fixed
  - Issue: `Meta` and `Scripts` moved from `@tanstack/start` to `@tanstack/react-router`
  - Solution: Import `HeadContent` and `Scripts` from `@tanstack/react-router`
- [x] Session utility created (`utils/auth.ts`)
  - `getSession()` function for checking authentication
- [x] Protected home route
  - Redirects to landing if not authenticated
  - Shows user greeting if authenticated
- [x] Build passing

### Route Structure
```
app/routes/
├── __root.tsx (layout)
├── index.tsx (protected dashboard home)
├── tasks/
├── events/
├── notes/
└── utils/auth.ts (session management)
```

---

## Phase 4: Core Features ✅

### Dashboard Navigation ✅
- [x] Sidebar navigation component (`components/Navigation.tsx`)
- [x] Dashboard layout wrapper (`components/DashboardLayout.tsx`)
- [x] Active route highlighting
- [x] Sign out functionality

### Tasks Module ✅
- [x] Create task form (`routes/tasks.new.tsx`)
- [x] Task list view (`routes/tasks.tsx`)
- [x] Task detail/edit page (`routes/tasks.$id.tsx`)
- [x] Task status updates (quick actions: Start, Done)
- [x] Full CRUD operations
- [x] Priority indicators (high/medium/low with color coding)
- [x] Due date display
- [x] Tags support
- [x] API endpoints (`apps/api/src/routes/tasks.ts`)
  - GET /tasks - List all tasks
  - GET /tasks/:id - Get single task
  - POST /tasks - Create task
  - PATCH /tasks/:id - Update task
  - DELETE /tasks/:id - Delete task

### Events Module ✅
- [x] Event creation form (`routes/events.new.tsx`)
- [x] Event list view (`routes/events.tsx`)
- [x] Event detail/edit page (`routes/events.$id.tsx`)
- [x] Upcoming/All events toggle
- [x] Full CRUD operations
- [x] Smart date labels (Today, Tomorrow, or full date)
- [x] Time range display
- [x] Location and attendees support
- [x] Time validation (end time must be after start time)
- [x] API endpoints (`apps/api/src/routes/events.ts`)
  - GET /events - List all events
  - GET /events/upcoming - List upcoming events only
  - GET /events/:id - Get single event
  - POST /events - Create event
  - PATCH /events/:id - Update event
  - DELETE /events/:id - Delete event

### Notes Module ✅
- [x] Create note form (`routes/notes.new.tsx`)
- [x] Note list view (`routes/notes.tsx`)
- [x] Note detail/edit page (`routes/notes.$id.tsx`)
- [x] Full CRUD operations
- [x] Real-time search with debouncing (300ms)
- [x] Grid layout (2 columns on desktop)
- [x] Content truncation with preview
- [x] Tags support
- [x] Monospace font for content editing
- [x] API endpoints (`apps/api/src/routes/notes.ts`)
  - GET /notes?search=query - List all notes with optional search
  - GET /notes/:id - Get single note
  - POST /notes - Create note
  - PATCH /notes/:id - Update note
  - DELETE /notes/:id - Delete note

### Features Implemented
- ✅ Clickable cards/links to detail pages
- ✅ Edit mode toggle on detail pages
- ✅ Delete confirmations (using window.confirm)
- ✅ Loading states (during create/update/delete operations)
- ✅ Error handling (validation and API errors)
- ✅ Proper form validation
- ✅ Consistent UI/UX across all modules
- ✅ Analog Utility design system maintained

### Known Limitations
- [ ] Natural language parsing (deferred to Phase 5)
- [ ] Google Calendar sync (deferred)
- [ ] Rich text editor for notes (using plain textarea with monospace font)
- [ ] Advanced search/filtering
- [ ] Pagination (all lists load entire dataset)

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

### 1. Landing Page CSS Error (FIXED ✅)
**Error:**
```
[postcss] @layer base is used but no matching @tailwind base directive is present
```

**Root Cause:**
- Using Tailwind v4 with `@import "tailwindcss"` syntax
- `@astrojs/tailwind` integration expects v3 directives
- Conflict between v3 integration and v4 CSS-first approach

**Solution Applied:**
1. ✅ Removed `@astrojs/tailwind` from `apps/landing/package.json`
2. ✅ Removed from `astro.config.mjs`
3. ✅ Added `@tailwindcss/postcss` plugin with `postcss.config.js`
4. ✅ Kept existing `global.css` with `@import "tailwindcss"`

### 2. Auth.js OAuth Flow Issues (FIXED ✅)
**Error:**
```
UnknownAction: Unsupported action
```

**Root Cause:**
- `apps/api/.env` had outdated `AUTH_URL` (3501 instead of 3500)
- Missing `LANDING_URL` and `DASHBOARD_URL` in API's .env
- Landing page linking directly to `/auth/signin/google` instead of `/auth/signin`
- Elysia prefix interfering with Auth.js path handling

**Solution Applied:**
1. ✅ Fixed `apps/api/.env` to match root `.env`
2. ✅ Changed landing link to `/auth/signin` (not `/auth/signin/google`)
3. ✅ Added `basePath: "/auth"` to Auth.js config
4. ✅ Removed Elysia prefix to let Auth.js see full path

---

## Next Actions

1. ✅ Update environment variables
2. ✅ Fix Dashboard build
3. ✅ Fix Landing page Tailwind v4 conflict
4. ✅ Verify OAuth flow end-to-end
5. ✅ **Complete Phase 4: Core Features**
   - ✅ Implement dashboard navigation
   - ✅ Build Tasks module UI with full CRUD
   - ✅ Build Events module UI with full CRUD
   - ✅ Build Notes module UI with full CRUD
6. 🔄 **Start Phase 5: AI Integration**
   - Set up Gemini client in `packages/logic`
   - Implement natural language parsing for tasks/events
   - Generate daily briefings
   - Add smart suggestions
7. ⏳ **Phase 6: Vector Search**
   - Implement embedding generation
   - Add semantic search for notes
8. ⏳ **Phase 7: Testing**
   - E2E tests for OAuth flow
   - API endpoint tests
   - CRUD operation tests

---

## Git Commits Log

- `feat(dashboard): add complete CRUD for tasks, events, and notes` (2026-01-21)
- `feat(dashboard): add navigation sidebar and dashboard layout` (2026-01-21)
- `feat(events): implement events module with CRUD API and UI` (2026-01-21)
- `feat(tasks): implement tasks module with CRUD API and UI` (2026-01-21)
- `docs(root): update PROGRESS.md to reflect completed OAuth flow` (2026-01-21)
- `docs(root): update AGENTS.md with OAuth flow fix details` (2026-01-21)
- `fix(auth): resolve OAuth flow by fixing signin URL and auth routing` (2026-01-21)
- `fix(dashboard): replace Meta with HeadContent from @tanstack/react-router`
- `feat(dashboard): add auth proxy route for OAuth flow`
- `chore: update environment variables with OAuth and database credentials`

---

**Last Updated:** 2026-01-21
**Current Phase:** Phase 4 (Core Features) ✅ → Phase 5 (AI Integration) 🔄
