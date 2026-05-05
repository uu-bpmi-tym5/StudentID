# StudentID — Frontend Technical Documentation

> **Scope:** Next.js application layer — routing, layouts, pages, components, data fetching, state management, real-time subscriptions, design system, and client/server rendering boundaries.
> **Last updated:** April 2026

---

## Table of Contents

1. [Frontend Technology Stack](#1-frontend-technology-stack)
2. [Design System & Theming](#2-design-system--theming)
   - 2.1 [Colour Palette (Command Center Theme)](#21-colour-palette-command-center-theme)
   - 2.2 [Typography](#22-typography)
   - 2.3 [Utility Classes](#23-utility-classes)
   - 2.4 [Component Library (shadcn/ui)](#24-component-library-shadcnui)
3. [Application Shell](#3-application-shell)
   - 3.1 [Root Layout](#31-root-layout)
   - 3.2 [Route Groups](#32-route-groups)
4. [Route Map](#4-route-map)
5. [Auth Group — `(auth)`](#5-auth-group--auth)
   - 5.1 [Auth Layout](#51-auth-layout)
   - 5.2 [/login](#52-login)
   - 5.3 [/register](#53-register)
6. [Dashboard Group — `(dashboard)`](#6-dashboard-group--dashboard)
   - 6.1 [Dashboard Layout & Sidebar](#61-dashboard-layout--sidebar)
   - 6.2 [/dashboard](#62-dashboard)
   - 6.3 [/events](#63-events)
   - 6.4 [/events/new](#64-eventsnew)
   - 6.5 [/events/[eventId]](#65-eventseventid)
   - 6.6 [/events/[eventId]/edit](#66-eventseventidedit)
   - 6.7 [/students](#67-students)
   - 6.8 [/students/[studentId]](#68-studentsstudentid)
   - 6.9 [/tappers](#69-tappers)
   - 6.10 [/tappers/[tapperId]](#610-tapperstapperid)
   - 6.11 [/cards](#611-cards)
   - 6.12 [/analytics](#612-analytics)
   - 6.13 [/my-attendance](#613-my-attendance)
   - 6.14 [/settings](#614-settings)
7. [Component Catalogue](#7-component-catalogue)
   - 7.1 [Shared Components](#71-shared-components)
   - 7.2 [Auth Components](#72-auth-components)
   - 7.3 [Dashboard / Navigation](#73-dashboard--navigation)
   - 7.4 [Students Components](#74-students-components)
   - 7.5 [Tappers Components](#75-tappers-components)
   - 7.6 [Cards Components](#76-cards-components)
   - 7.7 [UI Primitives (shadcn/ui)](#77-ui-primitives-shadcnui)
8. [Rendering Strategy — RSC vs Client Components](#8-rendering-strategy--rsc-vs-client-components)
9. [Data Fetching Patterns](#9-data-fetching-patterns)
   - 9.1 [Server-Side Fetching (RSC)](#91-server-side-fetching-rsc)
   - 9.2 [Client-Side Mutations (fetch)](#92-client-side-mutations-fetch)
   - 9.3 [Real-Time Subscriptions (Supabase Realtime)](#93-real-time-subscriptions-supabase-realtime)
10. [State Management](#10-state-management)
11. [Form Handling](#11-form-handling)
12. [Navigation & Routing Logic](#12-navigation--routing-logic)
    - 12.1 [Middleware Route Guard](#121-middleware-route-guard)
    - 12.2 [Role-Based Sidebar Navigation](#122-role-based-sidebar-navigation)
13. [Type System](#13-type-system)
14. [Hooks](#14-hooks)
15. [Frontend Data Flow Diagrams](#15-frontend-data-flow-diagrams)
    - 15.1 [Login Flow](#151-login-flow)
    - 15.2 [Card Pairing Flow](#152-card-pairing-flow)
    - 15.3 [Add Student Flow](#153-add-student-flow)
    - 15.4 [Register Tapper Flow](#154-register-tapper-flow)
    - 15.5 [Realtime Tapper Status Update](#155-realtime-tapper-status-update)
16. [Stub Pages & Incomplete Features](#16-stub-pages--incomplete-features)

---

## 1. Frontend Technology Stack

| Concern | Library / Tool | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.1 |
| Language | TypeScript | ^5 |
| UI | React | 19.2.4 |
| Component primitives | shadcn/ui (via `shadcn` CLI) | ^4.1.1 |
| Base UI (headless) | `@base-ui/react` | ^1.3.0 |
| Styling | Tailwind CSS v4 | ^4 |
| Animation utilities | `tw-animate-css` | ^1.4.0 |
| Icons | `lucide-react` | ^1.7.0 |
| Forms | `react-hook-form` | ^7.72.0 |
| Schema validation | Zod | ^4.3.6 |
| Form + Zod bridge | `@hookform/resolvers` | ^5.2.2 |
| Toast notifications | `sonner` | ^2.0.7 |
| Date formatting | `date-fns` | ^4.1.0 |
| Theming | `next-themes` | ^0.4.6 |
| Supabase browser client | `@supabase/ssr` + `@supabase/supabase-js` | ^0.10.0 / ^2.101.0 |
| Class utilities | `clsx` + `tailwind-merge` | ^2.1.1 / ^3.5.0 |

---

## 2. Design System & Theming

The application uses a custom **"Command Center"** theme: an industrial/utilitarian dark interface with warm amber accents, inspired by hardware control panels and mission dashboards.

### 2.1 Colour Palette (Command Center Theme)

Colours are defined as CSS custom properties using the OKLCH colour space for perceptual uniformity. Both light and dark mode tokens are defined; the HTML element is hardcoded to `.dark` via the root layout class, so only the dark palette is active at runtime.

#### Dark Mode Tokens (active)

| Token | OKLCH Value | Usage |
|---|---|---|
| `--background` | `oklch(0.115 0.005 260)` | Page background (deep cool grey-blue) |
| `--foreground` | `oklch(0.93 0.008 80)` | Body text (warm off-white) |
| `--card` | `oklch(0.155 0.006 260)` | Card surfaces |
| `--primary` | `oklch(0.78 0.145 70)` | Amber accent — buttons, links, active states |
| `--muted` | `oklch(0.20 0.008 260)` | Subtle backgrounds |
| `--muted-foreground` | `oklch(0.60 0.01 260)` | Subdued text |
| `--destructive` | `oklch(0.65 0.2 25)` | Error / delete actions |
| `--success` | `oklch(0.68 0.16 155)` | Online status, positive scan feedback |
| `--warning` | `oklch(0.78 0.145 70)` | Unknown card / out-of-window scan |
| `--border` | `oklch(1 0 0 / 8%)` | Very subtle white-alpha borders |
| `--sidebar` | `oklch(0.13 0.005 260)` | Sidebar background (slightly darker than page) |

#### Chart Tokens

Five chart tokens are defined for future charting components:

| Token | Hue | Intended use |
|---|---|---|
| `--chart-1` | Amber (~70°) | Primary series |
| `--chart-2` | Orange (~40°) | Secondary series |
| `--chart-3` | Green (~155°) | Positive / present series |
| `--chart-4` | Cool blue (~260°) | Neutral / info series |
| `--chart-5` | Red-orange (~25°) | Negative / absent series |

### 2.2 Typography

Three Google Fonts are loaded via `next/font/google` in the root layout and exposed as CSS variables:

| Variable | Font | Usage |
|---|---|---|
| `--font-outfit` | Outfit | Body / sans (`font-sans`) |
| `--font-bricolage-grotesque` | Bricolage Grotesque | Headings (`font-heading`) |
| `--font-jetbrains-mono` | JetBrains Mono | Monospace (`font-mono`) — card UIDs, tapper IDs, stat numbers |

All `h1–h6` elements receive `font-heading` and `tracking-tight` via a global base layer rule.

### 2.3 Utility Classes

Custom utility classes are defined in `globals.css` under `@layer utilities`:

| Class | Effect |
|---|---|
| `.bg-noise` | Applies a subtle SVG fractal noise texture at 3% opacity — used on `<body>` |
| `.glow-amber` | Double amber box-shadow glow effect |
| `.scan-line` | Animated vertical amber scan-line overlay (3 s ease-in-out loop) |
| `.grid-overlay` | Subtle 24 × 24 px white-alpha grid background — used in auth layout |
| `.pulse-online` | Pulsing opacity animation (2 s loop) — used on online status dots |
| `.text-balance` | `text-wrap: balance` |

### 2.4 Component Library (shadcn/ui)

The project uses shadcn/ui as its component base, installed at `app/components/ui/`. Components are owned source files (not `node_modules`) and are customised to match the Command Center theme.

**Installed UI components:**

| File | Component(s) |
|---|---|
| `avatar.tsx` | `Avatar`, `AvatarImage`, `AvatarFallback` |
| `badge.tsx` | `Badge` — variants: `default`, `secondary`, `outline`, `destructive` |
| `button.tsx` | `Button` — variants: `default`, `outline`, `ghost`, `destructive`; sizes: `default`, `sm`, `icon-sm` |
| `card.tsx` | `Card`, `CardContent`, `CardHeader`, `CardFooter` |
| `dialog.tsx` | `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` |
| `dropdown-menu.tsx` | `DropdownMenu` family |
| `input.tsx` | `Input` |
| `label.tsx` | `Label` |
| `separator.tsx` | `Separator` |
| `sheet.tsx` | `Sheet` family |
| `sidebar.tsx` | Full shadcn Sidebar system — `Sidebar`, `SidebarProvider`, `SidebarInset`, `SidebarContent`, `SidebarHeader`, `SidebarFooter`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarGroupContent`, `SidebarSeparator` |
| `skeleton.tsx` | `Skeleton` |
| `sonner.tsx` | `Toaster` (wraps `sonner`) |
| `table.tsx` | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` |
| `tabs.tsx` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| `tooltip.tsx` | `Tooltip`, `TooltipProvider`, `TooltipContent`, `TooltipTrigger` |

---

## 3. Application Shell

### 3.1 Root Layout

**File:** `app/app/layout.tsx`  
**Type:** React Server Component

The root layout is the single HTML document wrapper for the entire application.

```
<html lang="en" class="font-vars dark h-full antialiased">
  <body class="min-h-full flex flex-col bg-noise">
    <TooltipProvider delay={300}>
      {children}
    </TooltipProvider>
    <Toaster position="bottom-right" ... />
  </body>
</html>
```

**Responsibilities:**
- Loads and injects all three Google Fonts as CSS variables.
- Forces `dark` mode via hardcoded `dark` class on `<html>`.
- Wraps everything in `TooltipProvider` (300 ms delay) so any child can use `Tooltip` without a local provider.
- Mounts the global `Toaster` (sonner) at `bottom-right` with themed styles (`bg-card border-border`).
- Sets the title template `"%s · StudentID"` for `<title>` tags throughout child pages.

**Metadata:**
```typescript
{
  title: { default: "StudentID", template: "%s · StudentID" },
  description: "NFC-based student identification & attendance tracking system"
}
```

### 3.2 Route Groups

The App Router file tree uses two **route groups** (parenthesised directories) to apply distinct layouts without affecting URL paths:

| Route Group | Layout File | Pages Contained |
|---|---|---|
| `(auth)` | `app/(auth)/layout.tsx` | `/login`, `/register` |
| `(dashboard)` | `app/(dashboard)/layout.tsx` | All authenticated pages |

The root `app/page.tsx` is a simple redirect: it immediately calls `redirect("/dashboard")` with no UI.

---

## 4. Route Map

```
/                           → redirect to /dashboard (root page.tsx)
│
├── (auth)
│   ├── /login              LoginPage       → LoginForm (client)
│   └── /register           RegisterPage    → RegisterForm (client)
│
└── (dashboard)
    ├── /dashboard          DashboardPage   (RSC stub — static stats grid)
    ├── /events             EventsPage      (RSC stub — empty state)
    │   ├── /events/new     NewEventPage    (RSC stub — placeholder form)
    │   └── /events/:id     EventDetailPage (RSC stub — live feed placeholder)
    │       └── /edit       EditEventPage   (RSC stub)
    ├── /students           StudentsPage    (RSC → StudentsPageClient)
    │   └── /students/:id   StudentDetailPage (RSC — full detail view)
    ├── /tappers            TappersPage     (RSC → TappersPageClient + Realtime)
    │   └── /tappers/:id    TapperDetailPage (RSC — full detail view)
    ├── /cards              CardsPage       (RSC → UnregisteredScans (Realtime) + CardsTable)
    ├── /analytics          AnalyticsPage   (RSC stub)
    ├── /my-attendance      MyAttendancePage (RSC stub — student-only)
    └── /settings           SettingsPage    (RSC stub — admin-only)
```

---

## 5. Auth Group — `(auth)`

### 5.1 Auth Layout

**File:** `app/app/(auth)/layout.tsx`  
**Type:** Server Component (no data fetching)

Provides a full-screen centered container for the auth forms. Visual elements:
- `grid-overlay` utility class on a full-screen `absolute` div — creates a subtle 24 px grid background.
- Amber radial gradient glow (600 × 600 px ellipse, 6% opacity) centered behind the form card.
- The form card itself is rendered in a `relative z-10 w-full max-w-md px-6` container.

### 5.2 /login

**File:** `app/app/(auth)/login/page.tsx`  
**Type:** Server Component (thin shell)  
**Metadata:** `title: "Sign In"`

Wraps `<LoginForm />` in `<Suspense>` (required because `LoginForm` calls `useSearchParams()` inside).

#### `LoginForm` Component

**File:** `app/components/auth/login-form.tsx`  
**Type:** Client Component (`"use client"`)

| Aspect | Detail |
|---|---|
| State | `useTransition` for async pending state |
| Form library | `react-hook-form` with `zodResolver` |
| Validation schema | `{ email: z.string().email(), password: z.string().min(6) }` |
| Auth method | `supabase.auth.signInWithPassword({ email, password })` via browser client |
| Redirect | Reads `?redirect=` query param (set by middleware when bouncing unauthenticated users); defaults to `/dashboard` |
| Success | `router.push(redirect)` + `router.refresh()` |
| Error | `toast.error("Authentication failed", { description: error.message })` |

**Visual structure:**
```
Logo (centred)
"Welcome back" heading
"Sign in to your StudentID account" subtitle
─────────────────────────────────
Card (border + bg-card + shadow)
  Email field (label + input + error)
  Password field (label + input + error)
  Submit button (full-width, spinner on pending)
─────────────────────────────────
"Don't have an account? Create one →" (link to /register)
```

### 5.3 /register

**File:** `app/app/(auth)/register/page.tsx`  
**Type:** Server Component  
**Metadata:** `title: "Create Account"`

Renders `<RegisterForm />` directly (no Suspense needed — no `useSearchParams`).

#### `RegisterForm` Component

**File:** `app/components/auth/register-form.tsx`  
**Type:** Client Component (`"use client"`)

| Aspect | Detail |
|---|---|
| State | `useTransition` for async pending state |
| Form library | `react-hook-form` with `zodResolver` |
| Validation schema | `{ fullName: min(2), email: email(), password: min(6), confirmPassword }` + `.refine()` for password match |
| Auth method | `supabase.auth.signUp({ email, password, options: { data: { full_name } } })` |
| Success | `toast.success("Account created", { description: "Check your email..." })` → `router.push("/login")` |
| Error | `toast.error("Registration failed", { description: error.message })` |

**Fields:** Full Name, Email, Password, Confirm Password.

> **Note:** The `on_auth_user_created` DB trigger fires on `auth.signUp`, automatically creating a `profiles` row with `role = 'student'`. The `full_name` field in `options.data` is picked up by the trigger via `raw_user_meta_data->>'full_name'`.

---

## 6. Dashboard Group — `(dashboard)`

### 6.1 Dashboard Layout & Sidebar

**File:** `app/app/(dashboard)/layout.tsx`  
**Type:** React Server Component (async)

**Data fetched on every dashboard navigation:**
1. `supabase.auth.getUser()` — retrieves authenticated user.
2. `supabase.from("profiles").select("*").eq("id", user.id).single()` — fetches full profile for sidebar display.

**Rendered structure:**
```
<SidebarProvider>
  <AppSidebar profile={profile} />    ← Client Component
  <SidebarInset>
    <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
      {children}                       ← page content
    </main>
  </SidebarInset>
</SidebarProvider>
```

#### `AppSidebar` Component

**File:** `app/components/dashboard/app-sidebar.tsx`  
**Type:** Client Component (`"use client"`)

**Props:** `{ profile: Profile | null }`

The sidebar is role-aware. Navigation items are declared in three arrays and filtered at render time based on the current user's `profile.role`:

**`mainNav` — "Navigation" section:**

| Item | Path | Visible To |
|---|---|---|
| Dashboard | `/dashboard` | `admin`, `teacher` |
| Events | `/events` | `admin`, `teacher` |
| My Attendance | `/my-attendance` | `student` |

**`manageNav` — "Manage" section (only rendered if list is non-empty):**

| Item | Path | Visible To |
|---|---|---|
| Students | `/students` | `admin`, `teacher` |
| Tappers | `/tappers` | `admin` only |
| NFC Cards | `/cards` | `admin` only |
| Analytics | `/analytics` | `admin`, `teacher` |

**`bottomNav` — footer section:**

| Item | Path | Visible To |
|---|---|---|
| Settings | `/settings` | `admin` only |

**Active state detection:**
- `/dashboard` exact match only: `pathname === "/dashboard"`.
- All other items: `pathname.startsWith(href)` — highlights parent when on a detail page.

**User info display (sidebar footer):**
- Avatar: monogram initial (`profile.full_name.charAt(0)`) in a `bg-primary/15` rounded square.
- Name: `profile.full_name` (truncated).
- Role label: displayed in small muted text below name.

**Sign out:**
- Calls `supabase.auth.signOut()` via browser client inside `useTransition`.
- Redirects to `/login` + `router.refresh()`.
- Button shows "Signing out…" while pending.

**Logo link:** Clicking the `LogoWithText` in the sidebar header navigates to:
- `/my-attendance` for students.
- `/dashboard` for admin/teacher.

---

### 6.2 /dashboard

**File:** `app/app/(dashboard)/dashboard/page.tsx`  
**Type:** Server Component (static — no DB queries)  
**Metadata:** `title: "Dashboard"`  
**Access:** `admin`, `teacher` (middleware blocks `student` → redirect to `/my-attendance`)

**Status: ⚠️ Stub — no live data**

Renders a static grid of 4 stat cards (values hardcoded to `"—"`) and two placeholder content cards:

| Stat Card | Icon | Value |
|---|---|---|
| Active Events | `CalendarDays` | — |
| Students | `GraduationCap` | — |
| Tappers Online | `Radio` | — |
| Avg. Attendance | `TrendingUp` | — |

Each stat card has a decorative `bg-gradient-to-r from-primary/40` bottom accent line (2 px).

Two placeholder cards labelled "Recent Activity" and "Attendance Trends" display empty-state messages.

---

### 6.3 /events

**File:** `app/app/(dashboard)/events/page.tsx`  
**Type:** Server Component (no DB queries)  
**Metadata:** `title: "Events"`

**Status: ⚠️ Stub — no live data, empty state only**

Renders the `PageHeader` with a "New Event" button linking to `/events/new`, then displays a single empty-state card with a `CalendarDays` icon.

---

### 6.4 /events/new

**File:** `app/app/(dashboard)/events/new/page.tsx`  
**Type:** Server Component  
**Metadata:** `title: "New Event"`

**Status: ⚠️ Stub**

Placeholder card describing the planned fields: title, type, date/time range, tapper assignment, student enrollment.

---

### 6.5 /events/[eventId]

**File:** `app/app/(dashboard)/events/[eventId]/page.tsx`  
**Type:** Server Component (async — reads `params`)  
**Metadata:** `title: "Event Detail"` (static, not dynamic)

**Status: ⚠️ Stub — no DB queries**

Renders a 3-column grid:
- Left col (1 span): placeholder event details card.
- Right col (2 spans): "Live Attendance Feed" placeholder indicating Supabase Realtime integration is planned.

Shows a `Badge` with the first 8 chars of `eventId` as a shorthand identifier.

---

### 6.6 /events/[eventId]/edit

**File:** `app/app/(dashboard)/events/[eventId]/edit/page.tsx`  
**Type:** Server Component  
**Metadata:** `title: "Edit Event"`

**Status: ⚠️ Stub** — placeholder card only.

---

### 6.7 /students

**File:** `app/app/(dashboard)/students/page.tsx`  
**Type:** Server Component (async)  
**Metadata:** `title: "Students"`  
**Access:** `admin`, `teacher`

**Data fetched:**
```typescript
supabase
  .from("profiles")
  .select("id, full_name, email, student_id, created_at, nfc_cards(id, is_active)")
  .eq("role", "student")
  .order("full_name")
```

Fetches all student profiles with a nested count of their NFC cards. Data is typed as `StudentRow[]` and passed to `<StudentsPageClient initial={students} />`.

#### `StudentsPageClient` Component

**File:** `app/components/students/students-page-client.tsx`  
**Type:** Client Component

Manages three pieces of client state:
- `students: StudentRow[]` — initialised from server-fetched `initial` prop; optimistically prepended on creation.
- `query: string` — live search filter.
- `dialogOpen: boolean` — controls `AddStudentDialog` visibility.

**Client-side search:** Filters `students` against `query` across `full_name`, `email`, and `student_id` fields (case-insensitive). Filtered results are passed directly to `<StudentsTable>` — no debounce.

**Rendered structure:**
```
PageHeader ("Students" + "Add Student" button)
Search input (max-w-sm with Search icon)
StudentsTable (filtered students)
AddStudentDialog (controlled by dialogOpen)
```

#### `StudentsTable` Component

**File:** `app/components/students/students-table.tsx`  
**Type:** Client Component

Displays an empty state (`GraduationCap` icon, "No students yet") or a full `Table`.

**Table columns:**

| Column | Content |
|---|---|
| Name | Avatar monogram + full name (link to `/students/:id`) |
| Email | Email address (link) |
| Student ID | ID string or `—` (link) |
| NFC Card | `"Has card"` / `"No card"` badge based on `nfc_cards.length > 0` |
| Joined | `dd MMM yyyy` formatted `created_at` |

All cells are wrapped in `<Link href="/students/:id">` — the entire row is clickable.

#### `AddStudentDialog` Component

**File:** `app/components/students/add-student-dialog.tsx`  
**Type:** Client Component

| Aspect | Detail |
|---|---|
| Form library | `react-hook-form` + `zodResolver` |
| Validation | `{ full_name: min(2), email: email(), password: min(6), student_id: optional }` |
| API call | `POST /api/students` with JSON body |
| Success | `toast.success` → `onCreated(student)` callback → closes dialog → `router.refresh()` |
| Error | `toast.error` with server error description |
| Reset | Form resets on dialog close (`reset()` called in `handleOpenChange`) |

**Fields:** Full Name, Email, Password, Student ID (optional).

---

### 6.8 /students/[studentId]

**File:** `app/app/(dashboard)/students/[studentId]/page.tsx`  
**Type:** Server Component (async)  
**Dynamic metadata:** Fetches `profiles.full_name` for `<title>`

**Data fetched (parallel `Promise.all`):**
1. `profiles.*` for the student — `notFound()` if missing.
2. `nfc_cards.*` for the student, ordered `registered_at DESC`.
3. `attendance_logs` (last 20) — `id, scanned_at, tapper_id, card_uid` ordered `scanned_at DESC`.

**Layout:** 3-column grid (lg breakpoint):

**Left column (1 span) — Profile Card:**
- Avatar monogram (initial, `bg-primary/10`).
- Full name, email.
- Student ID badge (outline) or `—`.
- Role badge (secondary, capitalized).
- Joined date (`dd MMM yyyy`).
- NFC Cards section: lists each card as a row with `card_uid` in monospace and Active/Inactive badge. Link to `/cards` if no cards assigned.

**Right column (2 spans) — Attendance Log:**
- Header: Clock icon + "Recent attendance" + scan count badge.
- Empty state or Table with columns: Date & Time (`dd MMM yyyy · HH:mm`), Tapper (code element), Card UID (code element).
- Last 20 scans only.

---

### 6.9 /tappers

**File:** `app/app/(dashboard)/tappers/page.tsx`  
**Type:** Server Component (async)  
**Metadata:** `title: "Tappers"`  
**Access:** `admin` only

**Data fetched:**
```typescript
supabase.from("tappers").select("*").order("id")
```

Passes `tappers` to `<TappersPageClient initial={tappers} />`.

#### `TappersPageClient` Component

**File:** `app/components/tappers/tappers-page-client.tsx`  
**Type:** Client Component

**State:** `tappers: Tapper[]` — updated both via `handleRegistered` callback and Supabase Realtime.

**Realtime subscription** (mounted in `useEffect` on load):
```typescript
supabase
  .channel("tappers-status")
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tappers" }, handler)
  .subscribe()
```
On any `UPDATE` to the `tappers` table, the matching tapper row in local state is replaced with the new payload. This provides **live `is_online` and `last_seen_at` updates** without page refresh.

**Rendered structure:**
```
PageHeader ("Tappers" + "Register Tapper" button)
TappersTable (real-time updated tappers list)
RegisterTapperDialog
```

#### `TappersTable` Component

**File:** `app/components/tappers/tappers-table.tsx`  
**Type:** Client Component

Empty state or Table. All rows link to `/tappers/:id`.

**Table columns:**

| Column | Content |
|---|---|
| ID | Monospace `<code>` badge |
| Name | Tapper name (font-medium) |
| Location | Location string or `—` |
| Status | `<StatusIndicator>` (online pulse dot + label) |
| Last seen | `formatDistanceToNow` relative time or "Never" |

#### `RegisterTapperDialog` Component

**File:** `app/components/tappers/register-tapper-dialog.tsx`  
**Type:** Client Component

| Aspect | Detail |
|---|---|
| Validation | `{ id: regex /^[a-z0-9:.-]+$/, name: min(1), location: optional }` |
| API call | `POST /api/tappers` |
| Duplicate handling | `res.status === 409` → `toast.error("Tapper ID already exists")` |
| Success | `toast.success` → `onRegistered(tapper)` → closes dialog → `router.refresh()` |

**Fields:** Device ID (with MQTT note), Name, Location (optional).

---

### 6.10 /tappers/[tapperId]

**File:** `app/app/(dashboard)/tappers/[tapperId]/page.tsx`  
**Type:** Server Component (async)  
**Dynamic metadata:** Fetches `tappers.name` for `<title>`

**Data fetched (parallel `Promise.all`):**
1. `tappers.*` for the device — `notFound()` if missing.
2. `attendance_logs` (last 20): `id, scanned_at, card_uid, profile_id, profiles(full_name, student_id)` ordered `scanned_at DESC`.

**PageHeader:** Tapper name as title, tapper ID as description, `<StatusIndicator>` in the actions slot.

**Layout:** 2-column grid (lg):

**Left — Device Info Card:**
- ID (monospace code), Name, Location, Status (`StatusIndicator`), Last seen (`formatDistanceToNow` or "Never").

**Right — Recent Scans Card:**
- Empty state or Table: Time (`dd MMM · HH:mm`), Card UID (code), Person (profile name or "Unknown card" italic).

---

### 6.11 /cards

**File:** `app/app/(dashboard)/cards/page.tsx`  
**Type:** Server Component (async)  
**Metadata:** `title: "NFC Cards"`  
**Access:** `admin` only

**Data fetched (3 separate queries):**

1. **Paired cards:**
   ```typescript
   supabase.from("nfc_cards")
     .select("*, profiles(id, full_name, email, student_id, role)")
     .order("registered_at", { ascending: false })
   ```

2. **Pending (unregistered) scans — last 24 hours:**
   ```typescript
   supabase.from("attendance_logs")
     .select("id, card_uid, tapper_id, scanned_at")
     .is("profile_id", null)
     .gte("scanned_at", since)
     .order("scanned_at", { ascending: false })
     .limit(20)
   ```

3. **Assignable profiles (students + teachers, alphabetical):**
   ```typescript
   supabase.from("profiles")
     .select("id, full_name, email, student_id, role")
     .in("role", ["student", "teacher"])
     .order("full_name")
   ```

**Server-side data processing before render:**
- `pairedCardUids: Set<string>` — UIDs of already-paired cards (used to suppress duplicates in pending list).
- `pairedProfileIds: Set<string>` — profile IDs that already have a card (excluded from `assignableProfiles`).
- `assignableProfiles` — profiles with no existing card assignment.
- `uniquePending` — pending scans deduplicated by `card_uid`, excluding already-paired UIDs.

**Rendered structure:**
```
PageHeader ("NFC Cards")
UnregisteredScans (Realtime, initial=uniquePending, profiles=assignableProfiles)
CardsTable (initial=cards)
```

#### `UnregisteredScans` Component

**File:** `app/components/cards/unregistered-scans.tsx`  
**Type:** Client Component

**State:**
- `scans: Scan[]` — initialised from `initial` prop.
- `dialogCardUid: string | null` — the UID of the scan whose "Assign →" button was clicked.
- `pairedSet: RefObject<Set<string>>` — mutable set tracking paired UIDs without triggering re-renders.

**Realtime subscription** (mounted in `useEffect`):
```typescript
supabase
  .channel("unregistered-scans")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_logs" }, handler)
  .subscribe()
```

On INSERT:
- Ignores if `row.profile_id !== null` (known card scan).
- Ignores if `pairedSet.current.has(row.card_uid)` (recently paired).
- Prepends to `scans` state, truncating to 20 items.

**`handlePaired(cardUid)`:**
- Adds `cardUid` to `pairedSet.current`.
- Removes matching scans from state.
- Called by `AssignCardDialog` via `onPaired` prop after successful pairing.

**Empty state:** Shows `Radio` icon + "No unregistered scans yet" message.

**Non-empty state:** Each scan shows:
- Amber `Radio` icon in a `bg-amber-500/10` square.
- Card UID in monospace bold.
- "via `tapper_id` · `x minutes ago`" subtitle.
- "Assign →" outline button.

**Badge:** Amber "N unregistered" count badge in header when scans are present.

#### `AssignCardDialog` Component

**File:** `app/components/cards/assign-card-dialog.tsx`  
**Type:** Client Component

**Props:**
| Prop | Type | Description |
|---|---|---|
| `open` | `boolean` | Dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | Close handler |
| `cardUid` | `string` | Pre-populated card UID to pair |
| `profiles` | `Pick<Profile, ...>[]` | Assignable profiles list |
| `onPaired` | `(cardUid: string) => void` | Success callback |

**Internal state:** `query` (search string), `selectedId` (chosen profile UUID), `label` (optional card label string).

**Profile search:** Client-side filter across `full_name`, `email`, `student_id`. Results shown in a scrollable `max-h-48` list — each row shows avatar monogram, name/email, role badge, and highlights on selection (`bg-primary/10 font-medium`).

**API call:** `POST /api/cards` with `{ card_uid, profile_id, label? }`.

**Reset:** `query`, `selectedId`, `label` all reset to empty on dialog close.

#### `CardsTable` Component

**File:** `app/components/cards/cards-table.tsx`  
**Type:** Client Component

**State:** `cards: PairedCard[]` — initialised from `initial` prop; updated optimistically on toggle and delete.

**Operations:**

| Operation | API call | State update |
|---|---|---|
| Toggle active | `PATCH /api/cards/:id` `{ is_active: !current }` | Replace card in array with returned updated row |
| Delete | `DELETE /api/cards/:id` | Filter card out of array |

Both operations use `useTransition` and show `toast.error` on failure.

**Table columns:** Card UID (code), Owner (monogram + name + student_id/email + role badge), Label, Status (Active/Inactive badge), Registered date, Actions (toggle icon button + delete icon button).

**`PairedCard` type:**
```typescript
{
  id: string;
  card_uid: string;
  label: string | null;
  is_active: boolean;
  registered_at: string;
  profiles: Pick<Profile, "id" | "full_name" | "email" | "student_id" | "role"> | null;
}
```

---

### 6.12 /analytics

**File:** `app/app/(dashboard)/analytics/page.tsx`  
**Type:** Server Component  
**Metadata:** `title: "Analytics"`

**Status: ⚠️ Stub**

Renders `PageHeader` with a wired-up (but non-functional) "Export" button (`Download` icon, calls nothing), and two placeholder cards for "Attendance rate chart" and "Trend over time chart".

---

### 6.13 /my-attendance

**File:** `app/app/(dashboard)/my-attendance/page.tsx`  
**Type:** Server Component (no DB queries)  
**Metadata:** `title: "My Attendance"`  
**Access:** `student` role (middleware redirects admin/teacher to `/dashboard`)

**Status: ⚠️ Stub**

Shows three stat cards (Overall Rate `—%`, Events Attended `—`, Current Streak `—`) and one placeholder card for attendance history.

---

### 6.14 /settings

**File:** `app/app/(dashboard)/settings/page.tsx`  
**Type:** Server Component  
**Metadata:** `title: "Settings"`  
**Access:** `admin` only

**Status: ⚠️ Stub**

Three settings section headers with `Separator` dividers:
1. **Attendance Rules** — late threshold, grace period, academic terms.
2. **Webhook Configuration** — MQTT bridge secret and broker connection settings.
3. **Notifications** — email alerts for tamper events and device offline.

No forms or actual settings persistence implemented.

---

## 7. Component Catalogue

### 7.1 Shared Components

#### `Logo`

**File:** `app/components/shared/logo.tsx`

```typescript
<Logo size="sm" | "md" | "lg" className? />
```

A custom SVG icon rendered inside a `bg-primary` rounded square. The SVG depicts an abstract NFC tap symbol (card rectangle + two signal arc paths). The outer arc is at 60% opacity.

Sizes: `sm` = 24 × 24 px, `md` = 36 × 36 px (default), `lg` = 48 × 48 px.

#### `LogoWithText`

```typescript
<LogoWithText size? className? />
```

`Logo` + "Student**ID**" text where `ID` is `text-primary`. Uses `font-heading text-lg font-bold tracking-tight`.

#### `PageHeader`

**File:** `app/components/shared/page-header.tsx`

```typescript
<PageHeader title="..." description="..." className?>
  {/* optional actions slot */}
</PageHeader>
```

- `flex-col` on mobile, `flex-row items-center justify-between` on `sm+`.
- `h1` (`text-2xl font-bold tracking-tight`) + optional `p` (`text-sm text-muted-foreground`).
- `children` rendered in `flex items-center gap-2` on the right (action buttons, badges, etc.).

#### `StatusIndicator`

**File:** `app/components/shared/status-indicator.tsx`

```typescript
<StatusIndicator variant="online"|"offline"|"warning"|"error" label? pulse? className? />
```

A 2 × 2 (`h-2 w-2`) filled `rounded-full` dot with optional label.

| Variant | Dot colour |
|---|---|
| `online` | `bg-success` + `pulse-online` animation (default) |
| `offline` | `bg-muted-foreground` |
| `warning` | `bg-warning` |
| `error` | `bg-destructive` |

`pulse` defaults to `true` when `variant === "online"`. Can be overridden.

---

### 7.2 Auth Components

| Component | File | Type | Description |
|---|---|---|---|
| `LoginForm` | `components/auth/login-form.tsx` | Client | Email + password sign-in form with redirect support |
| `RegisterForm` | `components/auth/register-form.tsx` | Client | Self-registration form — creates student account |

Both forms share the same visual structure: Logo centred, heading + subtitle, bordered card containing the form, footer link to the other auth page.

---

### 7.3 Dashboard / Navigation

| Component | File | Type | Description |
|---|---|---|---|
| `AppSidebar` | `components/dashboard/app-sidebar.tsx` | Client | Full application sidebar — role-filtered nav, user info, sign out |

---

### 7.4 Students Components

| Component | File | Type | Description |
|---|---|---|---|
| `StudentsPageClient` | `components/students/students-page-client.tsx` | Client | Page-level state container — search filter + dialog orchestration |
| `StudentsTable` | `components/students/students-table.tsx` | Client | Table of student rows; all rows link to detail page |
| `AddStudentDialog` | `components/students/add-student-dialog.tsx` | Client | Modal form to create a new student via `/api/students` |

---

### 7.5 Tappers Components

| Component | File | Type | Description |
|---|---|---|---|
| `TappersPageClient` | `components/tappers/tappers-page-client.tsx` | Client | Page-level state + Realtime subscription for tapper status |
| `TappersTable` | `components/tappers/tappers-table.tsx` | Client | Table of tapper rows with StatusIndicator; all rows link to detail |
| `RegisterTapperDialog` | `components/tappers/register-tapper-dialog.tsx` | Client | Modal form to register a new tapper via `/api/tappers` |

---

### 7.6 Cards Components

| Component | File | Type | Description |
|---|---|---|---|
| `UnregisteredScans` | `components/cards/unregistered-scans.tsx` | Client | Live feed of unregistered scans via Realtime; triggers AssignCardDialog |
| `AssignCardDialog` | `components/cards/assign-card-dialog.tsx` | Client | Modal to pair a card UID to a profile via `/api/cards` |
| `CardsTable` | `components/cards/cards-table.tsx` | Client | Table of paired cards with inline toggle and delete actions |

---

### 7.7 UI Primitives (shadcn/ui)

All located in `app/components/ui/`. These are owned source files and are directly edited to match the theme. Key customisations:

- **`button.tsx`** — exposes a `render` prop (via `@base-ui/react`) to allow `<Button render={<Link href="..." />}>` polymorphic pattern (used in Events page for Link-wrapped buttons).
- **`sidebar.tsx`** — full shadcn sidebar system; `SidebarMenuButton` also has a `render` prop for the same polymorphic Link pattern.
- **`sonner.tsx`** — configures sonner's `Toaster` with `theme="dark"` and custom class names matching the card/border design tokens.

---

## 8. Rendering Strategy — RSC vs Client Components

The application follows the RSC (React Server Component) model of Next.js App Router.

```
Server Components (default — no "use client")
├── All layout.tsx files
├── All page.tsx files (including detail pages with DB queries)
└── Shared presentational components (PageHeader, StatusIndicator, Logo)

Client Components ("use client")
├── LoginForm, RegisterForm         — need useRouter, useSearchParams, form state
├── AppSidebar                      — needs usePathname, useTransition, auth.signOut()
├── StudentsPageClient              — local search filter + dialog state
├── StudentsTable                   — (client for future interactivity, currently read-only)
├── AddStudentDialog                — form state + fetch mutation
├── TappersPageClient               — Supabase Realtime subscription + dialog state
├── TappersTable                    — receives real-time updated props
├── RegisterTapperDialog            — form state + fetch mutation
├── UnregisteredScans               — Supabase Realtime + dialog trigger
├── AssignCardDialog                — search state + fetch mutation
└── CardsTable                      — optimistic state + fetch mutations
```

**Pattern:** Server Components fetch initial data from Supabase and pass it as props to Client Components. Client Components own their local state (pessimistic or optimistic) and interact with the API via `fetch()`.

**No context providers** are used for application state — state is colocated with the component that owns it and lifted only one level (e.g. `StudentsPageClient` owns the list and passes filtered subset to `StudentsTable`).

---

## 9. Data Fetching Patterns

### 9.1 Server-Side Fetching (RSC)

Used in all page-level components and the dashboard layout. The `createClient()` from `lib/supabase/server.ts` is used (anon key, RLS enforced, cookie-based session).

**Pattern:**
```typescript
// In a Server Component page
const supabase = await createClient();
const { data } = await supabase.from("table").select("...").filter(...);
```

**Parallel fetching:** Where multiple independent queries are needed (student detail, tapper detail), `Promise.all([...])` is used.

**Error handling:** 
- `notFound()` from `next/navigation` is called if a primary resource is missing.
- No error boundaries are explicitly defined; Next.js default error UI handles uncaught errors.

### 9.2 Client-Side Mutations (fetch)

Client Components interact with the backend exclusively via the Next.js API routes using native `fetch()`. No Supabase client is used directly in mutation components (except for auth and Realtime).

**Pattern:**
```typescript
const res = await fetch("/api/endpoint", {
  method: "POST" | "PATCH" | "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  toast.error("...", { description: err.error ?? "Unknown error" });
  return;
}

const data = await res.json();
// optimistic state update
router.refresh(); // invalidate RSC cache for the current route
```

All mutations are wrapped in `useTransition()` to track pending state without blocking the UI.

**`router.refresh()`** is called after every successful mutation to re-run the server-side data fetch for the current page (RSC cache invalidation).

### 9.3 Real-Time Subscriptions (Supabase Realtime)

Two components subscribe to Postgres Changes via the Supabase Realtime WebSocket:

#### `UnregisteredScans` — `attendance_logs` INSERT

```typescript
supabase
  .channel("unregistered-scans")
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "attendance_logs"
  }, (payload) => {
    const row = payload.new as Scan & { profile_id: string | null };
    if (row.profile_id !== null) return;       // resolved scan — skip
    if (pairedSet.current.has(row.card_uid)) return; // already paired — skip
    setScans(prev => [row, ...prev].slice(0, 20));
  })
  .subscribe();
```

This gives the `/cards` page a **live feed of unknown card taps** without polling.

#### `TappersPageClient` — `tappers` UPDATE

```typescript
supabase
  .channel("tappers-status")
  .on("postgres_changes", {
    event: "UPDATE",
    schema: "public",
    table: "tappers"
  }, (payload) => {
    const updated = payload.new as Tapper;
    setTappers(prev => prev.map(t => t.id === updated.id ? updated : t));
  })
  .subscribe();
```

This gives the `/tappers` page **live `is_online` / `last_seen_at` updates** as heartbeats arrive from broker.py.

**Cleanup:** Both subscriptions call `supabase.removeChannel(channel)` in the `useEffect` cleanup function to prevent memory leaks on unmount.

---

## 10. State Management

The application uses **React's built-in state only** — no Redux, Zustand, or Context API for application state.

| State Type | Mechanism | Where Used |
|---|---|---|
| Server-fetched data | RSC props passed to Client Components | All data-bearing pages |
| Local UI state (dialogs, filters) | `useState` | Page client components |
| Async pending state | `useTransition` | All form submissions, sign out |
| Realtime-updated lists | `useState` updated from Supabase channel | `TappersPageClient`, `UnregisteredScans` |
| Mutable non-reactive set | `useRef<Set<string>>` | `pairedSet` in `UnregisteredScans` |
| Form state | `react-hook-form` | All mutation dialogs, auth forms |
| Route cache | `router.refresh()` | After every successful mutation |

**Optimistic updates:**
- `CardsTable` immediately updates the cards array on toggle/delete before the server confirms.
- `StudentsPageClient` prepends the new student to the list immediately after `POST /api/students` resolves.
- `TappersPageClient` appends and re-sorts the new tapper after `POST /api/tappers` resolves.

---

## 11. Form Handling

All forms use `react-hook-form` with `@hookform/resolvers/zod` for schema-based validation.

**Standard form setup:**
```typescript
const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
  resolver: zodResolver(schema)
});
```

**Zod schemas used across forms:**

| Form | Schema fields |
|---|---|
| `LoginForm` | `email: z.string().email()`, `password: z.string().min(6)` |
| `RegisterForm` | `fullName: min(2)`, `email: email()`, `password: min(6)`, `confirmPassword` + `.refine()` match |
| `AddStudentDialog` | `full_name: min(2)`, `email: email()`, `password: min(6)`, `student_id: optional` |
| `RegisterTapperDialog` | `id: regex /^[a-z0-9:.-]+$/`, `name: min(1)`, `location: optional` |
| `AssignCardDialog` | No schema — manual `selectedId` guard (`if (!selectedId) return`) |

**Error display pattern:** Each field has an error paragraph below it:
```tsx
{errors.field && (
  <p className="text-xs text-destructive">{errors.field.message}</p>
)}
```

**Submit button spinner pattern** (used consistently across all forms):
```tsx
{isPending ? (
  <span className="flex items-center gap-2">
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
    Loading…
  </span>
) : "Submit"}
```

**Reset on close:** All dialogs call `reset()` (react-hook-form) in their `handleOpenChange` when closing.

---

## 12. Navigation & Routing Logic

### 12.1 Middleware Route Guard

**File:** `app/middleware.ts`

The Next.js middleware runs on every non-static request and enforces authentication and role-based access.

```
Incoming request
│
├── Static assets / API routes in PUBLIC_ROUTES → pass through (session refresh only)
│
├── Not authenticated?
│   └── Redirect to /login?redirect=<current_pathname>
│
├── Authenticated — fetch profile.role from DB
│
├── pathname === "/"?
│   ├── student → /my-attendance
│   └── admin/teacher → /dashboard
│
└── Student accessing an ADMIN_ROUTE?
    └── Redirect to /my-attendance
```

**Route classification:**
```typescript
const PUBLIC_ROUTES = ["/login", "/register", "/api/scan", "/api/tappers"];
const ADMIN_ROUTES  = ["/dashboard", "/students", "/tappers", "/cards",
                       "/analytics", "/settings", "/events"];
```

**Login redirect loop prevention:** The `?redirect=` parameter set by the middleware is consumed by `LoginForm` to redirect back to the originally requested page after successful sign-in.

### 12.2 Role-Based Sidebar Navigation

The sidebar performs a **second layer** of access control at the UI level by filtering nav items client-side:

```typescript
const filteredMainNav = mainNav.filter(
  (item) => !item.roles || item.roles.includes(role)
);
```

This ensures students never see admin navigation links even if the middleware is bypassed. The middleware is the authoritative gate; the sidebar filter is a UX enhancement only.

---

## 13. Type System

**File:** `app/lib/supabase/types.ts`

The `Database` type is generated from the Supabase schema and provides full type-safety for all table queries.

**Convenience type aliases exported:**

| Type Alias | Maps To |
|---|---|
| `UserRole` | `"admin" \| "teacher" \| "student"` |
| `EventType` | `"exam" \| "lecture" \| "lab" \| "other"` |
| `Profile` | `Database["public"]["Tables"]["profiles"]["Row"]` |
| `NfcCard` | `Database["public"]["Tables"]["nfc_cards"]["Row"]` |
| `Tapper` | `Database["public"]["Tables"]["tappers"]["Row"]` |
| `Event` | `Database["public"]["Tables"]["events"]["Row"]` |
| `EventEnrollment` | `Database["public"]["Tables"]["event_enrollments"]["Row"]` |
| `AttendanceLog` | `Database["public"]["Tables"]["attendance_logs"]["Row"]` |

**Component-local type aliases:**

| Type | Defined In | Description |
|---|---|---|
| `StudentRow` | `students-table.tsx` | `Pick<Profile, id/full_name/email/student_id/created_at> & { nfc_cards: Pick<NfcCard, id/is_active>[] }` |
| `PairedCard` | `cards-table.tsx` | `nfc_cards` row + nested `profiles` pick |
| `Scan` | `unregistered-scans.tsx` | `{ id, card_uid, tapper_id, scanned_at }` — partial `attendance_logs` |

**Generic helpers** (`Tables<T>`, `TablesInsert<T>`, `TablesUpdate<T>`, `Enums<T>`) are exported for use in API route files but are not heavily used in the frontend components (which prefer the named aliases).

---

## 14. Hooks

### `useIsMobile`

**File:** `app/hooks/use-mobile.ts`  
**Type:** Custom hook

```typescript
const isMobile = useIsMobile(); // → boolean
```

Listens to a `matchMedia("(max-width: 767px)")` query via `addEventListener("change", ...)` and returns `true` when the viewport is below 768 px. Used internally by the shadcn `Sidebar` component to switch between mobile sheet and desktop inline modes.

The initial value is `undefined` to avoid SSR hydration mismatch; `!!isMobile` coerces `undefined` to `false`.

---

## 15. Frontend Data Flow Diagrams

### 15.1 Login Flow

```
User fills LoginForm (email + password)
  │
  ├── react-hook-form validates (client-side Zod schema)
  │     └── Error? → show field error messages, stop
  │
  └── onSubmit → supabase.auth.signInWithPassword()
        │
        ├── Auth error → toast.error("Authentication failed")
        │
        └── Success → router.push(redirect ?? "/dashboard")
                   → router.refresh()
                   → Middleware runs, verifies session, sets cookies
                   → Dashboard layout loads, fetches profile
                   → AppSidebar renders with correct role
```

### 15.2 Card Pairing Flow

```
UnregisteredScans (Realtime channel: attendance_logs INSERT)
  │
  ├── New INSERT arrives with profile_id = null
  │     └── Not in pairedSet? → prepend to scans state
  │
  └── User clicks "Assign →" on a scan row
        │
        └── setDialogCardUid(scan.card_uid) → AssignCardDialog opens

AssignCardDialog
  │
  ├── User types in search → client-side filter of profiles array
  ├── User selects a profile → setSelectedId(p.id)
  ├── User optionally enters label
  │
  └── "Pair card" → POST /api/cards { card_uid, profile_id, label? }
        │
        ├── 409 → toast.error("Pairing failed", { description: err.error })
        │
        └── 201 → toast.success("Card paired")
               → onPaired(cardUid) → removes scan from UnregisteredScans state
               → dialog closes + form reset
               → router.refresh() → CardsTable re-fetches from server
```

### 15.3 Add Student Flow

```
StudentsPageClient
  └── "Add Student" button → setDialogOpen(true) → AddStudentDialog opens

AddStudentDialog
  │
  ├── User fills form (full_name, email, password, student_id?)
  ├── react-hook-form Zod validation
  │     └── Error? → show field errors, stop
  │
  └── onSubmit → POST /api/students { full_name, email, password, student_id? }
        │
        ├── Error → toast.error("Failed to create student", { description })
        │
        └── 201 → student: StudentRow returned
               → toast.success("Student created")
               → onCreated(student) → prepend to StudentsPageClient.students state
               → dialog closes + form reset
               → router.refresh()
```

### 15.4 Register Tapper Flow

```
TappersPageClient
  └── "Register Tapper" button → setDialogOpen(true) → RegisterTapperDialog opens

RegisterTapperDialog
  │
  ├── User fills form (id, name, location?)
  ├── Zod validates id format (/^[a-z0-9:.-]+$/)
  │
  └── onSubmit → POST /api/tappers { id, name, location? }
        │
        ├── 409 → toast.error("Tapper ID already exists")
        ├── Other error → toast.error("Failed to register tapper")
        │
        └── 201 → tapper: Tapper returned
               → toast.success("Tapper registered")
               → onRegistered(tapper) → append + sort TappersPageClient.tappers
               → dialog closes + form reset
               → router.refresh()
```

### 15.5 Realtime Tapper Status Update

```
broker.py receives MQTT event/boot or event/tag
  └── calls POST /api/tappers/:id/heartbeat

/api/tappers/:id/heartbeat handler
  └── UPDATE tappers SET is_online=true, last_seen_at=now() WHERE id=:id

Supabase Realtime (Postgres Changes)
  └── fires UPDATE event on tappers table

TappersPageClient (Realtime subscriber)
  └── handler receives { new: Tapper }
        └── setTappers(prev => prev.map(t => t.id === updated.id ? updated : t))

TappersTable re-renders
  └── StatusIndicator shows green pulse dot + "Online"
  └── Last seen shows "a few seconds ago"
```

---

## 16. Stub Pages & Incomplete Features

The following pages and features exist in the route tree but are not yet implemented with live data or full functionality:

| Page / Feature | File | Status | Notes |
|---|---|---|---|
| `/dashboard` | `dashboard/page.tsx` | ⚠️ Stub — static `—` values | Needs live DB queries for stat cards; real activity feed; attendance trend chart |
| `/events` | `events/page.tsx` | ⚠️ Stub — empty state only | No DB query; needs event list with CRUD, filtering, and pagination |
| `/events/new` | `events/new/page.tsx` | ⚠️ Stub — placeholder text | Needs full event creation form: title, type, date range, tapper assignment, enrollment |
| `/events/:id` | `events/[eventId]/page.tsx` | ⚠️ Stub — no DB query | Needs event detail, enrollment list, and live Realtime attendance feed |
| `/events/:id/edit` | `events/[eventId]/edit/page.tsx` | ⚠️ Stub | Needs edit form pre-populated with event data |
| `/analytics` | `analytics/page.tsx` | ⚠️ Stub — placeholder cards | Export button wired up but `GET /api/export` returns 501; chart components not yet built |
| `/my-attendance` | `my-attendance/page.tsx` | ⚠️ Stub — static `—` values | Needs authenticated student's attendance logs, overall rate, streak calculation |
| `/settings` | `settings/page.tsx` | ⚠️ Stub — section headers only | No forms, no persistence; three planned sections: Attendance Rules, Webhook Config, Notifications |
| Theme toggle | — | ℹ️ Not wired | `next-themes` is installed and `ThemeProvider` is not yet added to the root layout; the app is hardcoded to dark mode via the `dark` class |
| Password reset | — | ℹ️ Not wired | Supabase supports it; no frontend page exists |
| Event enrollment UI | — | ℹ️ Not built | `event_enrollments` table exists; no frontend to manage enrollments |
| Attendance log export | — | ⚠️ API stub | `GET /api/export` returns 501; no frontend download trigger implemented |

---

*Generated from source code analysis of `app/app/**`, `app/components/**`, `app/lib/**`, `app/hooks/**`, `app/middleware.ts`, and `app/app/globals.css`.*

