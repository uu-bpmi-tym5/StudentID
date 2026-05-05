# StudentID — Missing Features Design

> **Status:** Approved
> **Date:** 2026-05-05
> **Scope:** All stub pages, missing API routes, and incomplete features identified in FRONTEND_DOCS.md and TECHNICAL_DOCS.md

---

## 1. Overview

StudentID is an NFC-based attendance tracking system. The core backend (scan webhook, cards, students, tappers) is implemented. The following areas are stubs or entirely missing:

- Events management (CRUD + enrollment) — the central feature of the app
- Dashboard live data — currently hardcoded `—` values
- My Attendance — student-facing view with static placeholders
- Analytics — placeholder chart cards, non-functional export
- Password reset — Supabase supports it but no pages exist
- Settings — section headers only, no content
- Student self-enrollment — students have no way to join events themselves

**Implementation order (3 layers + Layer 4):**
1. **Layer 1** — Events API + full Events UI (create, list, detail, edit, enrollment)
2. **Layer 2** — Dashboard live stats + My Attendance student view
3. **Layer 3** — Analytics charts + CSV export + Password reset + Settings read-only panel
4. **Layer 4** — Student self-enrollment (opt-in per event, student-facing events browse page)

**Chart library:** Recharts (installed via `npm install recharts`). shadcn `chart.tsx` primitive wraps Recharts with the project's `--chart-*` CSS tokens.

---

## 2. New API Routes

### Auth helper addition

A `requireStaff()` helper is added to `lib/supabase/auth.ts` alongside the existing `requireAdmin()`. It accepts `role IN ('admin', 'teacher')` and is used for all events and enrollment routes.

### Events

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/events` | GET | `requireStaff()` | List all events joined with `event_attendance_summary` view, ordered `starts_at DESC` |
| `/api/events` | POST | `requireStaff()` | Create event `{ title, type, tapper_id, starts_at, ends_at, description? }` |
| `/api/events/[id]` | GET | `requireStaff()` | Single event with enrollments array and last 50 attendance logs |
| `/api/events/[id]` | PATCH | `requireStaff()` (own or admin) | Update event fields (partial) |
| `/api/events/[id]` | DELETE | `requireStaff()` (own or admin) | Delete event |

**POST /api/events validation (Zod):**
- `title`: non-empty string
- `type`: enum `exam | lecture | lab | other`
- `tapper_id`: non-empty string
- `starts_at`: ISO datetime string
- `ends_at`: ISO datetime string, must be after `starts_at`
- `description`: optional string
- `allow_self_enrollment`: optional boolean (default `false`) — when `true`, students may enroll/unenroll themselves

**Error codes:** `400` (validation), `403` (not staff or not owner), `404` (not found), `409` (tapper conflict if needed), `500` (DB)

### Enrollments

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/events/[id]/enrollments` | GET | `requireStaff()` | List enrolled profiles for event |
| `/api/events/[id]/enrollments` | POST | `requireStaff()` OR student (if `allow_self_enrollment=true`) | Enroll student `{ profile_id }` — students may only enroll themselves — 409 if already enrolled |
| `/api/events/[id]/enrollments/[profileId]` | DELETE | `requireStaff()` OR student (own enrollment, if `allow_self_enrollment=true`) | Unenroll student — 204 No Content |

### Export

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/export` | GET | `requireStaff()` | CSV download of attendance logs |

**Query parameters:**
- `event_id` (optional) — filter to single event
- `from` (optional) — ISO date lower bound on `scanned_at`
- `to` (optional) — ISO date upper bound on `scanned_at`
- `format` (optional, default `csv`) — only `csv` supported

**CSV columns:** `scanned_at`, `student_name`, `student_id`, `card_uid`, `tapper_id`, `event_title`

**Response headers:**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="attendance-export.csv"
```


---

## 3. Layer 1 — Events UI

### 3.1 `/events` — Event List Page

**File:** `app/app/(dashboard)/events/page.tsx` (converts from stub to async RSC)

**Data fetched:**
```typescript
supabase
  .from("event_attendance_summary")
  .select("*")
  .order("starts_at", { ascending: false })
```

Passes data to `<EventsPageClient initial={events} />`.

**`EventsPageClient`** (`components/events/events-page-client.tsx` — Client Component):
- State: `events`, `typeFilter` (all/exam/lecture/lab/other), `query` (text search)
- Type filter: tab-style toggle row
- Text search: filters on `title` (case-insensitive), no debounce
- Passes filtered list to `<EventsTable>`

**`EventsTable`** (`components/events/events-table.tsx` — Client Component):

| Column | Content |
|---|---|
| Title | Link to `/events/:id`, font-medium |
| Type | `Badge` variant per type (exam=destructive, lecture=default, lab=secondary, other=outline) |
| Tapper | `<code>` monospace |
| Date range | `dd MMM yyyy · HH:mm` start + `→` + end time |
| Enrolled | Count number |
| Attendance | `attendance_pct`% or `—` if null |
| Status | Active (green pulse dot) / Past (muted) based on `ends_at < now()` |

Empty state: `CalendarDays` icon + "No events yet" message + "Create Event" button.

### 3.2 `/events/new` — Create Event Form

**File:** `app/app/(dashboard)/events/new/page.tsx` (async RSC)

**Server-side data:** Fetches all tappers via `supabase.from("tappers").select("id, name").order("id")` and passes to `<CreateEventForm tappers={tappers} />`.

**`CreateEventForm`** (`components/events/create-event-form.tsx` — Client Component):

Fields:
- **Title** — text input, required
- **Type** — `<select>`: exam / lecture / lab / other
- **Tapper** — `<select>` populated from `tappers` prop; shows `name (id)` as option label
- **Starts at** — `<input type="datetime-local">`, required
- **Ends at** — `<input type="datetime-local">`, required; client-side validation: must be after `starts_at`
- **Description** — `<textarea>`, optional

On submit: `POST /api/events` → `router.push("/events/" + event.id)` on 201.

Error handling: `toast.error` on failure. Submit button shows spinner while `isPending`.

Form wrapped in a `Card` with a `PageHeader` back link to `/events`.

### 3.3 `/events/[eventId]` — Event Detail Page

**File:** `app/app/(dashboard)/events/[eventId]/page.tsx` (async RSC)

**Data fetched (parallel `Promise.all`):**
1. Event row + tapper — `notFound()` if missing
2. Enrolled profiles: `event_enrollments` joined with `profiles(id, full_name, email, student_id)`
3. Last 50 `attendance_logs` for this `event_id`, joined with `profiles(full_name, student_id)`

**Dynamic metadata:** `title: event.title`

**Layout:** 3-column grid (lg):

**Left col (1 span) — Event Info Card:**
- Title (h2), type badge, description (if set)
- Tapper: `<code>` ID + name
- Date range: formatted starts/ends
- Status: `<StatusIndicator>` active/past
- Created by: profile name
- Actions: Edit button (link to `/events/:id/edit`), Delete button (opens `DeleteEventDialog`)

**`DeleteEventDialog`** (`components/events/delete-event-dialog.tsx` — Client Component):
- Confirmation dialog: "Delete this event? This cannot be undone."
- On confirm: `DELETE /api/events/:id` → `router.push("/events")`

**Right col (2 spans) — two stacked cards:**

**Card 1: Live Attendance Feed**

`EventAttendanceFeed` (`components/events/event-attendance-feed.tsx` — Client Component):
- Props: `eventId`, `initial: AttendanceLog[]`
- Realtime subscription on `attendance_logs` INSERT filtered by `event_id`
- Each log row: coloured dot (green=known+event, yellow=known+no event, red=unknown), time (`HH:mm:ss`), card UID (code), student name or "Unknown card" italic
- Header: "Live Feed" + scan count badge
- Auto-scrolls to newest scan

**Card 2: Enrollment Manager**

`EnrollmentManager` (`components/events/enrollment-manager.tsx` — Client Component):
- Props: `eventId`, `initial: EnrolledProfile[]`, `allStudents: Profile[]`
- State: `enrolled`, `query`, `adding`
- Enrolled list: each student row with name, email, student_id badge, remove button (DELETE → removes from state)
- Add panel: searchable profile list (same pattern as `AssignCardDialog`), filtered to students not already enrolled; "Enroll" button per result → POST → prepends to enrolled state
- Header: "Enrollment" + `enrolled.length / allStudents.length` badge

### 3.4 `/events/[eventId]/edit` — Edit Event Form

**File:** `app/app/(dashboard)/events/[eventId]/edit/page.tsx` (async RSC)

Server fetches event + tappers in parallel. Passes to `<EditEventForm event={event} tappers={tappers} />`.

**`EditEventForm`** (`components/events/edit-event-form.tsx` — Client Component):
- Same fields as `CreateEventForm`, pre-populated via `defaultValues` in `useForm`
- On submit: `PATCH /api/events/:id` → `router.push("/events/" + id)` on success

---

## 4. Layer 2 — Dashboard & My Attendance

### 4.1 `/dashboard` — Live Stats

**File:** `app/app/(dashboard)/dashboard/page.tsx` (async RSC)

**Data fetched (parallel `Promise.all`):**
```typescript
[
  supabase.from("events").select("id", { count: "exact" })
    .eq("is_active", true).gte("ends_at", now),          // activeEventsCount
  supabase.from("profiles").select("id", { count: "exact" })
    .eq("role", "student"),                               // studentCount
  supabase.from("tappers").select("id", { count: "exact" })
    .eq("is_online", true),                               // tappersOnlineCount
  supabase.from("event_attendance_summary")
    .select("attendance_pct")
    .not("attendance_pct", "is", null),                   // for avg calculation
  supabase.from("attendance_logs")
    .select("id, scanned_at, tapper_id, card_uid, profiles(full_name)")
    .order("scanned_at", { ascending: false })
    .limit(10),                                           // recentActivity
  supabase.from("attendance_logs")
    .select("scanned_at")
    .gte("scanned_at", sevenDaysAgo)
    .order("scanned_at"),                                 // trendData (for chart)
]
```

**Stat cards** replace `"—"` with real values:
- Active Events: `activeEventsCount`
- Students: `studentCount`
- Tappers Online: `tappersOnlineCount`
- Avg. Attendance: mean of `attendance_pct` values, formatted as `XX.X%` or `—`

**Recent Activity card:** Feed of last 10 scans — avatar initial (or `?`), name or "Unknown card", tapper code, relative time (`formatDistanceToNow`).

**Attendance Trends card:** `<DashboardTrendChart data={trendData} />` — Client Component. Groups logs by day, renders a Recharts `BarChart` (7 bars, amber `--chart-1` fill, responsive container).

### 4.2 `/my-attendance` — Student Attendance View

**File:** `app/app/(dashboard)/my-attendance/page.tsx` (async RSC)

**Data fetched:**
1. Current user profile (from session)
2. All `attendance_logs` for `profile_id`, joined with `events(id, title, type, starts_at)`, ordered `scanned_at DESC`
3. All `event_enrollments` for `profile_id` (to compute denominator for rate)

**Computed values:**
- `enrolledCount` — total `event_enrollments` rows
- `attendedCount` — distinct `event_id` values in logs where `event_id IS NOT NULL`
- `overallRate` — `attendedCount / enrolledCount * 100` (or `—` if no enrollments)
- `currentStreak` — walk backwards through enrollments joined with events (to get `starts_at`), ordered by `events.starts_at DESC`; count consecutive events where a matching `attendance_logs` row exists for `profile_id + event_id`; stop on first miss. Query shape: `supabase.from("event_enrollments").select("event_id, events(id, starts_at)").eq("profile_id", profileId).order("events(starts_at)", { ascending: false })`

**Stat cards:** Overall Rate (`XX.X%`), Events Attended (number), Current Streak (number + "events" label).

**Attendance history table:**

| Column | Content |
|---|---|
| Event | Title linked to `/events/:id`, type badge |
| Date | `dd MMM yyyy · HH:mm` from `scanned_at` |
| Tapper | `<code>` tapper_id |
| Status | `Present` (green badge) always — these are scan records |

Empty state: "No attendance records yet" with prompt to check NFC card setup.

---

## 5. Layer 3 — Analytics, Export, Auth & Settings

### 5.1 `/analytics` — Charts + Export

**File:** `app/app/(dashboard)/analytics/page.tsx` (async RSC)

**Data fetched (parallel):**
1. All rows from `event_attendance_summary` — for attendance rate chart
2. Daily scan counts for last 30 days — group `attendance_logs` by date

**`AttendanceRateChart`** (`components/analytics/attendance-rate-chart.tsx` — Client Component):
- Recharts `BarChart` (horizontal layout)
- Y-axis: event titles (truncated to 24 chars)
- X-axis: 0–100%
- Two-segment bar: `attended_count` (green `--chart-3`) + gap to 100% (muted)
- Tooltip: "X% attendance (Y/Z enrolled)"
- Limit: 20 most recent events

**`AttendanceTrendChart`** (`components/analytics/attendance-trend-chart.tsx` — Client Component):
- Recharts `LineChart`
- X-axis: dates (last 30 days, `dd MMM` format)
- Y-axis: scan count
- Single amber `--chart-1` line with dots
- Tooltip: "N scans on dd MMM"

**`ExportDialog`** (`components/analytics/export-dialog.tsx` — Client Component):
- Triggered by "Export" button in `PageHeader`
- Fields: Event selector (optional, "All events" default), From date, To date
- "Download CSV" → constructs `/api/export?event_id=...&from=...&to=...` → `window.open(url)` to trigger browser download
- Event list for selector fetched server-side, passed as prop

### 5.2 Password Reset Flow

**New files:**

**`/reset-password`** (`app/app/(auth)/reset-password/page.tsx` + `components/auth/forgot-password-form.tsx`):
- Single email field
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/update-password" })`
- Always shows success message regardless of email existence (security)
- Link back to `/login`

**`/update-password`** (`app/app/(auth)/update-password/page.tsx` + `components/auth/update-password-form.tsx`):
- Wrapped in `<Suspense>` (Supabase sets session from URL hash client-side)
- Fields: New password (min 6), Confirm password (must match)
- Calls `supabase.auth.updateUser({ password })`
- On success: redirects to `/dashboard` (admin/teacher) or `/my-attendance` (student) based on `profile.role`
- Route added to `PUBLIC_ROUTES` in `middleware.ts`

**`/login` change:** Add "Forgot your password?" link below submit button in `LoginForm` → `/reset-password`.

### 5.3 `/settings` — Read-Only Panel

**File:** `app/app/(dashboard)/settings/page.tsx` (async RSC)

Server reads env vars and calls `GET /api/settings/webhook-info` internally. Renders three `Card` sections:

**Attendance Rules card:**
- Informational text only: explains what late threshold and grace period mean
- Values shown as `—` with note: "Configurable in a future release"

**Webhook Configuration card:**
- Webhook secret: server-rendered as `••••••••` + last 4 chars of `SCAN_WEBHOOK_SECRET` (read from env in the RSC, never sent to browser in full). No copy button — admins retrieve the full secret from their `.env` file.
- App URL: server-rendered value of `APP_URL` env var
- MQTT port: `1883` (static)
- Broker listener: `0.0.0.0:1883`

**Notifications card:**
- Tamper alerts: "Not configured" badge
- Offline detection: "Not configured" badge + note about planned cron/TTL implementation

---

## 5.4 Student Self-Enrollment

### Schema change

```sql
ALTER TABLE public.events
  ADD COLUMN allow_self_enrollment boolean NOT NULL DEFAULT false;
```

The `event_attendance_summary` view is recreated to include this column.

RLS update: an additional `event_enrollments` INSERT/DELETE policy allows students to manage their own enrollment row when the linked event has `allow_self_enrollment = true`.

### `allow_self_enrollment` toggle on forms

`CreateEventForm` and `EditEventForm` both gain a labelled toggle (checkbox/switch):

> **Allow self-enrollment** — When enabled, students can enroll and unenroll themselves from this event.

Stored as `allow_self_enrollment: boolean` on the events row.

### API changes

**`POST /api/events`** — `allow_self_enrollment` added to Zod schema (optional, default `false`).

**`PATCH /api/events/[id]`** — `allow_self_enrollment` added to update schema.

**`POST /api/events/[id]/enrollments`** — extended auth logic:
- If caller is staff (`requireStaff()`): enroll any student (unchanged).
- If caller is a student: allow only if `event.allow_self_enrollment = true` AND `profile_id === auth user id`.

**`DELETE /api/events/[id]/enrollments/[profileId]`** — extended auth logic:
- If caller is staff: unenroll any student (unchanged).
- If caller is a student: allow only if `event.allow_self_enrollment = true` AND `profileId === auth user id`.

### Student Events Page (`/events` — student role view)

**File:** `app/app/(dashboard)/events/page.tsx` — made role-aware. Staff see the existing management view. Students see `<StudentEventsClient>`.

`/events` is removed from `ADMIN_ROUTES` in `middleware.ts`. Access control is role-based inside the page.

**`StudentEventsClient`** (`components/events/student-events-client.tsx` — Client Component):

- State: `typeFilter` (all/exam/lecture/lab/other), `query`, `showEnrolledOnly`
- Data: all events with `allow_self_enrollment = true`, plus all events the student is already enrolled in regardless of flag
- Shows a searchable, filterable card/table list
- Each event row:
  - Title, type badge, date range, tapper code
  - **Enrolled chip** (green) if already enrolled, otherwise an **Enroll** button
  - **Unenroll** button if enrolled (and `allow_self_enrollment = true`)
  - Events where `allow_self_enrollment = false` and the student is enrolled: shown as "Enrolled by staff" (no unenroll button)
- Filter toggle: "Show enrolled only"

**Sidebar:** Students gain an "Events" nav item pointing to `/events`.

---

## 6. Component Summary

### New components

| Component | File | Type | Layer |
|---|---|---|---|
| `EventsPageClient` | `components/events/events-page-client.tsx` | Client | 1 |
| `EventsTable` | `components/events/events-table.tsx` | Client | 1 |
| `CreateEventForm` | `components/events/create-event-form.tsx` | Client | 1 |
| `EditEventForm` | `components/events/edit-event-form.tsx` | Client | 1 |
| `DeleteEventDialog` | `components/events/delete-event-dialog.tsx` | Client | 1 |
| `EventAttendanceFeed` | `components/events/event-attendance-feed.tsx` | Client | 1 |
| `EnrollmentManager` | `components/events/enrollment-manager.tsx` | Client | 1 |
| `DashboardTrendChart` | `components/dashboard/dashboard-trend-chart.tsx` | Client | 2 |
| `AttendanceRateChart` | `components/analytics/attendance-rate-chart.tsx` | Client | 3 |
| `AttendanceTrendChart` | `components/analytics/attendance-trend-chart.tsx` | Client | 3 |
| `ExportDialog` | `components/analytics/export-dialog.tsx` | Client | 3 |
| `ForgotPasswordForm` | `components/auth/forgot-password-form.tsx` | Client | 3 |
| `UpdatePasswordForm` | `components/auth/update-password-form.tsx` | Client | 3 |

### Modified files

| File | Change |
|---|---|
| `app/(dashboard)/dashboard/page.tsx` | Stub → async RSC with live queries |
| `app/(dashboard)/events/page.tsx` | Stub → async RSC passing to EventsPageClient |
| `app/(dashboard)/events/new/page.tsx` | Stub → async RSC with CreateEventForm |
| `app/(dashboard)/events/[eventId]/page.tsx` | Stub → async RSC with full detail layout |
| `app/(dashboard)/events/[eventId]/edit/page.tsx` | Stub → async RSC with EditEventForm |
| `app/(dashboard)/my-attendance/page.tsx` | Stub → async RSC with live queries |
| `app/(dashboard)/analytics/page.tsx` | Stub → async RSC with chart data |
| `app/(dashboard)/settings/page.tsx` | Stub → async RSC with read-only cards |
| `app/api/export/route.ts` | 501 stub → full CSV implementation |
| `app/middleware.ts` | Add `/update-password` to PUBLIC_ROUTES |
| `components/auth/login-form.tsx` | Add "Forgot password?" link |
| `lib/supabase/auth.ts` | Add `requireStaff()` helper |

### New API files

| File | Routes |
|---|---|
| `app/api/events/route.ts` | GET, POST |
| `app/api/events/[id]/route.ts` | GET, PATCH, DELETE |
| `app/api/events/[id]/enrollments/route.ts` | GET, POST |
| `app/api/events/[id]/enrollments/[profileId]/route.ts` | DELETE |

### New page files

| File | Route |
|---|---|
| `app/app/(auth)/reset-password/page.tsx` | `/reset-password` |
| `app/app/(auth)/update-password/page.tsx` | `/update-password` |

---

## 7. Data Flow Notes

### Events Realtime (attendance feed on event detail page)

```
Tapper scans card → broker.py → POST /api/scan → attendance_logs INSERT
Supabase Realtime fires INSERT event on attendance_logs
EventAttendanceFeed subscriber receives payload
  → checks payload.new.event_id === this eventId
  → prepends to feed state
  → colour indicator: profile_id + event_id = green, profile_id only = yellow, neither = red
```

### CSV Export

```
Admin clicks "Download CSV" in ExportDialog
  → window.open("/api/export?event_id=...&from=...&to=...")
  → Browser triggers download directly
  → /api/export: requireStaff() → query attendance_logs with joins → stream CSV rows
  → Content-Disposition header causes browser save dialog
```

### Streak Calculation

```
1. Fetch all event_enrollments for profile, order by events.starts_at DESC
2. For each enrollment (most recent first):
   a. Check if attendance_logs has a row with this event_id AND profile_id
   b. If yes: streak++
   c. If no: STOP (streak broken)
3. Return streak count
```

---

## 8. Dependencies to Install

```bash
npm install recharts
```

shadcn chart component (`components/ui/chart.tsx`) added via:
```bash
npx shadcn add chart
```

No other new dependencies.
