# StudentID — Comprehensive Application Documentation

> **Last updated:** May 2026  
> **Scope:** Full system — firmware, MQTT broker, database, backend API, authentication, frontend UI, data flows, and operations.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Repository Structure](#3-repository-structure)
4. [Firmware Layer — `broker.py`](#4-firmware-layer--brokerpy)
   - 4.1 [Responsibilities](#41-responsibilities)
   - 4.2 [MQTT Broker Configuration](#42-mqtt-broker-configuration)
   - 4.3 [MQTT Topic Schema](#43-mqtt-topic-schema)
   - 4.4 [Message Dispatch Loop](#44-message-dispatch-loop)
   - 4.5 [HTTP Bridge Functions](#45-http-bridge-functions)
   - 4.6 [Feedback Pattern System](#46-feedback-pattern-system)
   - 4.7 [Reconnect & Resilience](#47-reconnect--resilience)
   - 4.8 [Environment Variables](#48-environment-variables-firmware)
5. [Database Layer — Supabase / PostgreSQL](#5-database-layer--supabase--postgresql)
   - 5.1 [Enumerations](#51-enumerations)
   - 5.2 [Tables](#52-tables)
   - 5.3 [Indexes](#53-indexes)
   - 5.4 [Views](#54-views)
   - 5.5 [Database Functions](#55-database-functions)
   - 5.6 [Triggers](#56-triggers)
   - 5.7 [Row Level Security (RLS)](#57-row-level-security-rls)
   - 5.8 [Realtime Publication](#58-realtime-publication)
6. [Backend — Supabase Client Layers](#6-backend--supabase-client-layers)
7. [Backend — Authentication Helpers](#7-backend--authentication-helpers)
8. [Backend — API Routes](#8-backend--api-routes)
   - 8.1 [POST /api/scan](#81-post-apiscan)
   - 8.2 [GET /api/cards](#82-get-apicards)
   - 8.3 [POST /api/cards](#83-post-apicards)
   - 8.4 [DELETE /api/cards/[id]](#84-delete-apicardsid)
   - 8.5 [PATCH /api/cards/[id]](#85-patch-apicardsid)
   - 8.6 [GET /api/students](#86-get-apistudents)
   - 8.7 [POST /api/students](#87-post-apistudents)
   - 8.8 [GET /api/tappers](#88-get-apitappers)
   - 8.9 [POST /api/tappers](#89-post-apitappers)
   - 8.10 [POST /api/tappers/[id]/heartbeat](#810-post-apitappersidheartbeat)
   - 8.11 [GET /api/events](#811-get-apievents)
   - 8.12 [POST /api/events](#812-post-apievents)
   - 8.13 [GET /api/events/[id]](#813-get-apieventsid)
   - 8.14 [PATCH /api/events/[id]](#814-patch-apieventsid)
   - 8.15 [DELETE /api/events/[id]](#815-delete-apieventsid)
   - 8.16 [GET /api/events/[id]/enrollments](#816-get-apieventsid-enrollments)
   - 8.17 [POST /api/events/[id]/enrollments](#817-post-apieventsid-enrollments)
   - 8.18 [DELETE /api/events/[id]/enrollments/[profileId]](#818-delete-apieventsid-enrollmentsprofileid)
   - 8.19 [GET /api/export](#819-get-apiexport)
9. [Authentication & Middleware](#9-authentication--middleware)
   - 9.1 [Supabase Auth Configuration](#91-supabase-auth-configuration)
   - 9.2 [Next.js Middleware](#92-nextjs-middleware)
   - 9.3 [Role-Based Access Control Matrix](#93-role-based-access-control-matrix)
10. [Frontend — Application Shell](#10-frontend--application-shell)
    - 10.1 [Root Layout](#101-root-layout)
    - 10.2 [Auth Layout & Pages](#102-auth-layout--pages)
    - 10.3 [Dashboard Layout & Sidebar](#103-dashboard-layout--sidebar)
11. [Frontend — Page Reference](#11-frontend--page-reference)
    - 11.1 [/dashboard](#111-dashboard)
    - 11.2 [/events](#112-events)
    - 11.3 [/events/new and /events/[id]/edit](#113-eventsnew-and-eventsiidedit)
    - 11.4 [/events/[id]](#114-eventsid)
    - 11.5 [/students and /students/[id]](#115-students-and-studentsid)
    - 11.6 [/tappers and /tappers/[id]](#116-tappers-and-tappersid)
    - 11.7 [/cards](#117-cards)
    - 11.8 [/analytics](#118-analytics)
    - 11.9 [/my-attendance](#119-my-attendance)
    - 11.10 [/settings](#1110-settings)
12. [Frontend — Component Library](#12-frontend--component-library)
13. [End-to-End Data Flows](#13-end-to-end-data-flows)
    - 13.1 [NFC Tap → Attendance Recorded](#131-nfc-tap--attendance-recorded)
    - 13.2 [Admin Pairs a New Card](#132-admin-pairs-a-new-card)
    - 13.3 [New Student Account Creation](#133-new-student-account-creation)
    - 13.4 [Tapper Boot / Heartbeat](#134-tapper-boot--heartbeat)
    - 13.5 [Student Self-Enrollment](#135-student-self-enrollment)
14. [Environment Variables](#14-environment-variables)
15. [Getting Started (Local Development)](#15-getting-started-local-development)
16. [Known Limitations & Future Work](#16-known-limitations--future-work)

---

## 1. System Overview

StudentID is an **NFC/RFID-based attendance tracking system** composed of three tightly coupled layers:

```
┌──────────────────────────────────────────────────────────────────────┐
│                          PHYSICAL LAYER                              │
│                                                                      │
│   NFC Tapper Device (ESP32 + RC522 reader)                           │
│        │  publishes MQTT on port 1883                                │
│        ▼                                                             │
│   firmware/broker.py                                                 │
│   ├── Embedded MQTT broker  (amqtt, 0.0.0.0:1883)                   │
│   ├── Subscriber listener   (subscribes to all topics "#")          │
│   └── HTTP bridge           (calls Next.js API over HTTP/HTTPS)     │
└──────────────────────────────────────────────────────────────────────┘
                                    │ HTTP POST (JSON + Bearer secret)
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                             │
│                                                                      │
│   Next.js 16 (App Router, TypeScript)                                │
│   ├── API Routes  — scan / cards / students / tappers / export      │
│   ├── Middleware  — session refresh + role-based route guard         │
│   └── Frontend   — React Server Components + Client Components      │
│                                                                      │
│   Supabase (hosted Postgres)                                         │
│   ├── PostgreSQL 17  — all persistent state                         │
│   ├── Auth           — JWT-based sessions, email/password           │
│   └── Realtime       — Postgres Changes WebSocket feed              │
└──────────────────────────────────────────────────────────────────────┘
```

**Data flow direction (physical scan):**

```
Tapper  →  MQTT  →  broker.py  →  POST /api/scan  →  Supabase (attendance_logs)
                                                   ←  feedback { visual, acoustic }
        ←  MQTT  ←  broker.py  ←─────────────────
```

---

## 2. Technology Stack

| Component | Technology | Version |
|---|---|---|
| Web framework | Next.js (App Router) | 16.2.1 |
| Language (frontend + backend) | TypeScript | ^5 |
| UI framework | React | 19.2.4 |
| Database | PostgreSQL (via Supabase) | 17 |
| Auth provider | Supabase Auth (`@supabase/ssr`) | ^0.10.0 |
| Supabase JS client | `@supabase/supabase-js` | ^2.101.0 |
| Styling | Tailwind CSS | ^4 |
| Component primitives | shadcn/ui + `@base-ui/react` | ^1.3.0 |
| Form handling | `react-hook-form` + `@hookform/resolvers` | ^7.72.0 |
| Schema validation | Zod | ^4.3.6 |
| Charts | Recharts | ^3.8.0 |
| Date utilities | date-fns | ^4.1.0 |
| Icons | lucide-react | ^1.7.0 |
| Toast notifications | sonner | ^2.0.7 |
| MQTT broker/client | Python `amqtt` | via pip |
| HTTP client (firmware) | Python `aiohttp` | via pip |
| Async runtime (firmware) | Python `asyncio` | stdlib |
| Fonts | Outfit, Bricolage Grotesque, JetBrains Mono | Google Fonts |

---

## 3. Repository Structure

```
StudentID/
├── firmware/
│   └── broker.py              — MQTT broker + listener + HTTP bridge
├── docs/
│   ├── COMPREHENSIVE_DOCS.md  — this file
│   ├── data-model.puml        — PlantUML ERD
│   └── presentation-prompt.md
└── app/                       — Next.js full-stack application
    ├── app/
    │   ├── layout.tsx          — root HTML shell, fonts, Toaster
    │   ├── globals.css
    │   ├── (auth)/             — public auth pages
    │   │   ├── layout.tsx
    │   │   ├── login/
    │   │   ├── register/
    │   │   ├── reset-password/
    │   │   └── update-password/
    │   ├── (dashboard)/        — authenticated pages (role-gated)
    │   │   ├── layout.tsx      — sidebar layout, fetches profile
    │   │   ├── dashboard/
    │   │   ├── events/
    │   │   ├── students/
    │   │   ├── tappers/
    │   │   ├── cards/
    │   │   ├── analytics/
    │   │   ├── my-attendance/
    │   │   └── settings/
    │   └── api/
    │       ├── scan/           — POST (webhook, public)
    │       ├── cards/          — GET/POST; [id]: DELETE/PATCH
    │       ├── events/         — GET/POST; [id]: GET/PATCH/DELETE
    │       │   └── [id]/enrollments/  — GET/POST; [profileId]: DELETE
    │       ├── students/       — GET/POST
    │       ├── tappers/        — GET/POST; [id]/heartbeat: POST
    │       └── export/         — GET (CSV)
    ├── components/
    │   ├── analytics/          — charts, export button/dialog
    │   ├── auth/               — login, register, reset, update-password forms
    │   ├── cards/              — assign-card-dialog, cards-table, unregistered-scans
    │   ├── dashboard/          — app-sidebar, trend-chart, recent-activity-feed
    │   ├── events/             — create/edit forms, events-table, attendance-feed,
    │   │                         enrollment-manager, student-events-client, delete dialog
    │   ├── shared/             — page-header, logo, status-indicator, local-date-time
    │   ├── students/           — add-student-dialog, students-table, page-client
    │   ├── tappers/            — register-tapper-dialog, tappers-table, page-client
    │   └── ui/                 — shadcn/ui primitives
    ├── hooks/
    │   └── use-mobile.ts
    ├── lib/
    │   ├── utils.ts
    │   └── supabase/
    │       ├── admin.ts        — service-role client
    │       ├── server.ts       — SSR cookie-based client
    │       ├── client.ts       — browser client
    │       ├── middleware.ts   — session refresh helper
    │       ├── auth.ts         — requireAdmin / requireStaff helpers
    │       └── types.ts        — generated DB types + convenience aliases
    ├── middleware.ts           — route guard + role redirect
    └── supabase/
        ├── migrations/
        │   ├── 20240001_initial_schema.sql
        │   ├── 20240002_rls.sql
        │   ├── 20240003_self_enrollment.sql
        │   └── 20240004_realtime.sql
        └── seed.sql            — admin account for local dev
```

---

## 4. Firmware Layer — `broker.py`

**File:** `firmware/broker.py`  
**Runtime:** Python 3, `asyncio`  
**Dependencies:** `amqtt`, `aiohttp`

### 4.1 Responsibilities

`broker.py` bridges physical NFC hardware to the web application. It runs two concurrent async tasks within a single process:

1. **MQTT Broker** — accepts TCP connections from tapper devices on port `1883`.
2. **MQTT Listener** (`run_listener`) — subscribes to all topics (`#`) on the loopback interface and routes messages to the HTTP API.

### 4.2 MQTT Broker Configuration

```python
BROKER_CONFIG = {
    "listeners": {
        "default": {
            "type": "tcp",
            "bind": "0.0.0.0:1883",
        }
    },
}
```

- Plain MQTT over TCP (no TLS in current configuration).
- Accepts connections from all network interfaces.
- The internal listener connects to `127.0.0.1:1883` after a 2-second startup delay to avoid race conditions.
- Two persistent client IDs used by the broker process: `"mac-listener"` (subscribe), `"mac-feedback"` (publish).

### 4.3 MQTT Topic Schema

All topics are namespaced by device ID: `tapper/{id}/...`

**Device → Broker:**

| Topic | Payload | Description |
|---|---|---|
| `tapper/{id}/event/tag` | `{ "id": "<card_uid>", "timestamp": <unix_int> }` | NFC card scan |
| `tapper/{id}/event/boot` | *(empty)* | Device power-on |
| `tapper/{id}/event/tamper` | `{ "state": "<string>" }` | Physical tamper detection |
| `tapper/{id}/control/response` | `{ "result": "<string>" }` | Acknowledgement of a feedback command |

**Broker → Device:**

| Topic | Payload | Description |
|---|---|---|
| `tapper/{id}/control/request` | `{ "timestamp": <unix_int>, "id": 1, "visual": { "pattern": "<p>" }, "acoustic": { "pattern": "<p>" } }` | LED/buzzer feedback command |

> `tapper_id` is always extracted from position `[1]` of the topic split: `topic.split("/")[1]`.

### 4.4 Message Dispatch Loop

The listener's `while True` loop dispatches on topic substring:

```
"event/tag"        → call_scan_api()       then call_heartbeat_api(), then send_feedback()
"event/boot"       → call_heartbeat_api()
"event/tamper"     → log tamper state
"control/request"
"control/response" → silently ignored (own echo)
(other)            → log raw data
```

### 4.5 HTTP Bridge Functions

#### `call_scan_api(tapper_id, card_uid, timestamp) → (visual, acoustic)`

```
POST {APP_URL}/api/scan
Authorization: Bearer {SCAN_WEBHOOK_SECRET}
Content-Type: application/json

{ "tapper_id": "...", "card_uid": "...", "timestamp": <unix_int> }
```

- Timeout: 5 seconds.
- Returns a `(visual_pattern, acoustic_pattern)` tuple.
- **Fallback on any error:** `("p1/red", "p1")` — the tapper always receives a response.

#### `call_heartbeat_api(tapper_id) → None`

```
POST {APP_URL}/api/tappers/{tapper_id}/heartbeat
Authorization: Bearer {SCAN_WEBHOOK_SECRET}
```

- Sets `is_online = true` and updates `last_seen_at` in the database.
- Called on every `event/boot` and after every `event/tag`.
- Returns silently on HTTP errors (non-blocking).
- Timeout: 5 seconds.

#### `send_feedback(tapper_id, visual, acoustic) → None`

- Uses a persistent `MQTTClient` (`"mac-feedback"`) stored in the module-level `_feedback_client` variable.
- Publishes to `tapper/{id}/control/request` at QoS 0 (fire-and-forget).
- On publish error: disconnects, resets `_feedback_client = None`, and re-raises — the next call will reconnect.

### 4.6 Feedback Pattern System

The visual/acoustic response is determined by `/api/scan` and forwarded verbatim by `send_feedback`.

| Condition | `visual` | `acoustic` | Meaning |
|---|---|---|---|
| Registered card + active event → scan logged | `p1/green` | `p1` | Attendance recorded ✅ |
| Registered card + no active event at scan time | `p1/yellow` | `p1` | Card known, outside window ⚠️ |
| Unregistered card (not in `nfc_cards`) | `p1/red` | `p1` | Unknown card ❌ |

### 4.7 Reconnect & Resilience

The listener implements a timeout-based reconnect strategy:

- `TIMEOUT_SECONDS = 30` — maximum wait for a single message before counting a timeout.
- `RECONNECT_AFTER_TIMEOUTS = 10` — after 10 consecutive timeouts (~5 minutes of silence), the listener disconnects and reconnects from scratch.
- On any connection error, the listener waits 3 seconds and reconnects.

### 4.8 Environment Variables (Firmware)

| Variable | Default | Description |
|---|---|---|
| `APP_URL` | `http://localhost:3000` | Base URL of the Next.js application |
| `SCAN_WEBHOOK_SECRET` | `some-random-secret` | Shared secret for `Authorization: Bearer` |

---

## 5. Database Layer — Supabase / PostgreSQL

**Migration files (run in order):**

| File | Contents |
|---|---|
| `20240001_initial_schema.sql` | Enums, tables, indexes, views, trigger |
| `20240002_rls.sql` | RLS enable + all policies + `current_user_role()` function |
| `20240003_self_enrollment.sql` | `allow_self_enrollment` column on `events`; recreates view; adds student self-enroll/unenroll RLS policies |
| `20240004_realtime.sql` | Adds `attendance_logs` to the `supabase_realtime` publication |

### 5.1 Enumerations

```sql
CREATE TYPE public.user_role  AS ENUM ('admin', 'teacher', 'student');
CREATE TYPE public.event_type AS ENUM ('exam', 'lecture', 'lab', 'other');
```

### 5.2 Tables

#### `public.profiles`

One row per `auth.users`. Auto-created by the `on_auth_user_created` trigger.

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| `full_name` | `text` | NOT NULL |
| `role` | `user_role` | NOT NULL, DEFAULT `'student'` |
| `student_id` | `text` | UNIQUE, nullable |
| `email` | `text` | NOT NULL, UNIQUE |
| `avatar_url` | `text` | nullable |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |

#### `public.nfc_cards`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` |
| `card_uid` | `text` | NOT NULL, UNIQUE |
| `profile_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE |
| `label` | `text` | nullable |
| `is_active` | `boolean` | NOT NULL, DEFAULT `true` |
| `registered_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |

> `is_active = false` blocks profile resolution during scanning without removing historical log data.

#### `public.tappers`

| Column | Type | Constraints |
|---|---|---|
| `id` | `text` | PK — must match the MQTT topic segment (e.g. `"tapper-001"`) |
| `name` | `text` | NOT NULL |
| `location` | `text` | nullable |
| `is_online` | `boolean` | NOT NULL, DEFAULT `false` |
| `last_seen_at` | `timestamptz` | nullable |

#### `public.events`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` |
| `title` | `text` | NOT NULL |
| `description` | `text` | nullable |
| `type` | `event_type` | NOT NULL, DEFAULT `'lecture'` |
| `created_by` | `uuid` | NOT NULL, FK → `profiles(id)` |
| `tapper_id` | `text` | NOT NULL, FK → `tappers(id)` |
| `starts_at` | `timestamptz` | NOT NULL |
| `ends_at` | `timestamptz` | NOT NULL, CHECK `ends_at > starts_at` |
| `is_active` | `boolean` | NOT NULL, DEFAULT `true` |
| `allow_self_enrollment` | `boolean` | NOT NULL, DEFAULT `false` |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |

> The API prevents overlapping `is_active = true` events on the same tapper (enforced in `POST`/`PATCH /api/events` with a `409` response).

#### `public.event_enrollments`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` |
| `event_id` | `uuid` | NOT NULL, FK → `events(id)` ON DELETE CASCADE |
| `profile_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE |

**Unique constraint:** `(event_id, profile_id)`

#### `public.attendance_logs`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` |
| `event_id` | `uuid` | FK → `events(id)` ON DELETE SET NULL, **nullable** |
| `tapper_id` | `text` | NOT NULL — **denormalised plain text, not a FK** |
| `card_uid` | `text` | NOT NULL — **denormalised plain text, not a FK** |
| `profile_id` | `uuid` | FK → `profiles(id)` ON DELETE SET NULL, **nullable** |
| `scanned_at` | `timestamptz` | NOT NULL (device clock) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |

> **Immutable.** Written exclusively by `POST /api/scan` via the service-role key (bypasses RLS). `tapper_id` and `card_uid` are plain text so the log survives device/card deletion. `event_id` and `profile_id` go `NULL` on parent deletion (`ON DELETE SET NULL`).

### 5.3 Indexes

| Table | Columns | Purpose |
|---|---|---|
| `nfc_cards` | `profile_id` | Fast card lookup by owner |
| `nfc_cards` | `card_uid` | Fast UID resolution at scan time |
| `events` | `tapper_id` | Active event lookup by tapper |
| `events` | `created_by` | Event listing by creator |
| `events` | `(is_active, starts_at, ends_at)` | Composite time-window queries |
| `event_enrollments` | `event_id` | Lookup by event |
| `event_enrollments` | `profile_id` | Lookup by student |
| `attendance_logs` | `event_id` | Logs by event |
| `attendance_logs` | `profile_id` | Logs by student |
| `attendance_logs` | `scanned_at DESC` | Chronological feed |
| `attendance_logs` | `card_uid` | Unregistered scan lookup |

### 5.4 Views

#### `public.event_attendance_summary`

Aggregation over `events` LEFT JOIN `event_enrollments` LEFT JOIN `attendance_logs`.

| Column | Type | Description |
|---|---|---|
| `event_id` | `uuid` | |
| `title` | `text` | |
| `type` | `event_type` | |
| `starts_at` | `timestamptz` | |
| `ends_at` | `timestamptz` | |
| `tapper_id` | `text` | |
| `allow_self_enrollment` | `boolean` | |
| `enrolled_count` | `bigint` | COUNT DISTINCT enrolled profiles |
| `attended_count` | `bigint` | COUNT DISTINCT profiles with a resolved scan |
| `attendance_pct` | `numeric(5,1)` | `attended / enrolled × 100`; NULL if enrolled = 0 |

Only scans with a resolved `profile_id` count towards `attended_count`.

### 5.5 Database Functions

#### `public.current_user_role() → user_role`

```sql
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE
SECURITY DEFINER SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;
```

Stable security-definer helper used across all RLS policy expressions to avoid repeated subqueries.

### 5.6 Triggers

#### `on_auth_user_created`

Fires `AFTER INSERT ON auth.users FOR EACH ROW`, calling `public.handle_new_user()`:

```sql
INSERT INTO public.profiles (id, full_name, email)
VALUES (
  new.id,
  COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
  new.email
);
```

`role` defaults to `'student'`. Admin promotion must be done manually in the database or via the seed script.

### 5.7 Row Level Security (RLS)

RLS is enabled on all six tables. The `/api/scan` webhook uses the `service_role` key and bypasses RLS entirely.

| Table | Policy | Operation | Rule |
|---|---|---|---|
| `profiles` | `profiles_select_all` | SELECT | `true` (all authenticated) |
| `profiles` | `profiles_update_own` | UPDATE | `auth.uid() = id OR role = 'admin'` |
| `profiles` | `profiles_insert_admin` | INSERT | `current_user_role() = 'admin'` |
| `profiles` | `profiles_delete_admin` | DELETE | `current_user_role() = 'admin'` |
| `nfc_cards` | `nfc_cards_select` | SELECT | `profile_id = auth.uid() OR role IN ('admin', 'teacher')` |
| `nfc_cards` | `nfc_cards_admin` | ALL | `current_user_role() = 'admin'` |
| `tappers` | `tappers_select_authenticated` | SELECT | `auth.role() = 'authenticated'` |
| `tappers` | `tappers_admin` | ALL | `current_user_role() = 'admin'` |
| `events` | `events_select_authenticated` | SELECT | `auth.role() = 'authenticated'` |
| `events` | `events_insert_staff` | INSERT | `current_user_role() IN ('admin', 'teacher')` |
| `events` | `events_update_own_or_admin` | UPDATE | `created_by = auth.uid() OR role = 'admin'` |
| `events` | `events_delete_own_or_admin` | DELETE | `created_by = auth.uid() OR role = 'admin'` |
| `event_enrollments` | `enrollments_select` | SELECT | `profile_id = auth.uid() OR role IN ('admin', 'teacher')` |
| `event_enrollments` | `enrollments_manage_staff` | ALL | `current_user_role() IN ('admin', 'teacher')` |
| `event_enrollments` | `enrollments_self_enroll` | INSERT | `profile_id = auth.uid() AND role = 'student' AND event.allow_self_enrollment = true` |
| `event_enrollments` | `enrollments_self_unenroll` | DELETE | `profile_id = auth.uid() AND role = 'student' AND event.allow_self_enrollment = true` |
| `attendance_logs` | `attendance_logs_select` | SELECT | `profile_id = auth.uid() OR role IN ('admin', 'teacher')` |
| `attendance_logs` | INSERT/UPDATE/DELETE | — | Only via `service_role` — no user policies |

### 5.8 Realtime Publication

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
```

The `attendance_logs` table is added to the Supabase Realtime publication so that `postgres_changes` WebSocket subscriptions work. Used by the dashboard recent-activity feed and the NFC cards page pending-scan panel.

---

## 6. Backend — Supabase Client Layers

Three distinct clients are used depending on execution context:

### `createAdminClient()` — `lib/supabase/admin.ts`

```typescript
createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})
```

- Uses the **service role key** — bypasses all RLS.
- Used by: `/api/scan`, `/api/tappers/[id]/heartbeat`, `/api/cards`, `/api/students`, `/api/tappers`.
- **Never expose to the browser.**

### `createClient()` (server) — `lib/supabase/server.ts`

```typescript
createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  cookies: { getAll, setAll }
})
```

- Uses the **anon key** — RLS fully enforced.
- Reads/writes Next.js cookie store for session management.
- Used by: all event routes, export route, `requireStaff()` / `requireAdmin()` helpers, `middleware.ts`.

### `createClient()` (browser) — `lib/supabase/client.ts`

```typescript
createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
```

- Uses the **anon key** — RLS fully enforced.
- Used by: Client Components that need Supabase Realtime subscriptions (dashboard feed, cards page), auth forms (`ForgotPasswordForm`, `UpdatePasswordForm`), and the `AppSidebar` sign-out handler.

---

## 7. Backend — Authentication Helpers

**File:** `lib/supabase/auth.ts`

#### `requireAdmin() → User | null`

Validates the session cookie and returns the user only if `profiles.role = 'admin'`. Returns `null` otherwise. Used by `/api/cards`, `/api/students`, `/api/tappers`.

#### `requireStaff() → { user, role } | null`

Validates the session cookie and returns the user + role only if `profiles.role IN ('admin', 'teacher')`. Returns `null` otherwise. Used by `/api/events` and `/api/export`.

---

## 8. Backend — API Routes

### 8.1 `POST /api/scan`

**Auth:** Webhook shared secret (`Authorization: Bearer <SCAN_WEBHOOK_SECRET>`)  
**Called by:** `firmware/broker.py` on every `event/tag` MQTT message  
**Supabase client:** Admin (service role)  
**Public route:** excluded from session middleware check

**Request body:**
```json
{ "tapper_id": "tapper-001", "card_uid": "A3F2091C", "timestamp": 1711900800 }
```

**Processing steps:**
1. Compare `Authorization` header against `SCAN_WEBHOOK_SECRET` → `401` on mismatch.
2. Parse + Zod validate body → `400` on failure.
3. Query `nfc_cards` for `card_uid` where `is_active = true` → resolves `profile_id` (or `null`).
4. Query `events` for active event on `tapper_id` where `starts_at ≤ scanned_at ≤ ends_at` → resolves `event_id` (or `null`).
5. Insert row into `attendance_logs`.
6. Determine feedback: `p1/green` (profile + event) / `p1/yellow` (profile only) / `p1/red` (no profile).

**Response:**
```json
{ "status": "ok", "visual": "p1/green", "acoustic": "p1", "profile_id": "...", "event_id": "..." }
```

---

### 8.2 `GET /api/cards`

**Auth:** `requireAdmin()`  
Returns all `nfc_cards` rows joined with `profiles(id, full_name, email, student_id, role)`, ordered by `registered_at DESC`.

---

### 8.3 `POST /api/cards`

**Auth:** `requireAdmin()`  
**Body:** `{ "card_uid": "AABBCCDD", "profile_id": "<uuid>", "label": "optional" }`

Checks for duplicate `card_uid` → `409` if exists. Inserts into `nfc_cards`. Returns `201` with the new row + profile.

---

### 8.4 `DELETE /api/cards/[id]`

**Auth:** `requireAdmin()`  
Permanently removes a card pairing by internal UUID. Historical `attendance_logs` rows retain the raw `card_uid`; their `profile_id` is set to `NULL` (FK ON DELETE SET NULL). Returns `204`.

---

### 8.5 `PATCH /api/cards/[id]`

**Auth:** `requireAdmin()`  
**Body:** `{ "is_active": true | false }`  
Toggles the card activation flag without removing the pairing. When `false`, the card no longer resolves to a profile during scanning.

---

### 8.6 `GET /api/students`

**Auth:** `requireAdmin()`  
Returns all profiles where `role = 'student'` ordered alphabetically by `full_name`, with a nested count of `nfc_cards(id, is_active)`.

---

### 8.7 `POST /api/students`

**Auth:** `requireAdmin()`  
**Body:** `{ "full_name", "email", "password", "student_id?" }`

1. Calls `supabase.auth.admin.createUser()` with `email_confirm: true` (bypasses email verification).
2. `on_auth_user_created` trigger auto-creates the profile row with `role = 'student'`.
3. If `student_id` is provided, updates the newly created profile.

Returns `409` if email already exists.

---

### 8.8 `GET /api/tappers`

**Auth:** `requireAdmin()`  
Returns all `tappers` rows ordered by `id`.

---

### 8.9 `POST /api/tappers`

**Auth:** `requireAdmin()`  
**Body:** `{ "id": "tapper-001", "name": "Main Entrance", "location": "optional" }`

`id` must match `/^[a-z0-9:.-]+$/` (MQTT topic segment constraint). Returns `409` if `id` already exists. Inserted with `is_online = false`.

---

### 8.10 `POST /api/tappers/[id]/heartbeat`

**Auth:** Webhook shared secret  
**Called by:** `firmware/broker.py` on `event/boot` and after every `event/tag`

Sets `is_online = true` and `last_seen_at = now()` for the specified tapper. Returns `{ "status": "ok", "tapper": {...} }` or `{ "status": "unknown_tapper" }` if the device is not registered (non-blocking — device is never rejected).

---

### 8.11 `GET /api/events`

**Auth:** `requireStaff()`  
Returns all rows from `event_attendance_summary` ordered by `starts_at DESC`.

---

### 8.12 `POST /api/events`

**Auth:** `requireStaff()`  
**Body:** `{ "title", "type", "tapper_id", "starts_at", "ends_at", "description?", "allow_self_enrollment?" }`

Validates `ends_at > starts_at` and checks for tapper time-window overlap on existing `is_active = true` events → `409` on conflict. Sets `created_by` to the authenticated user's ID. Returns `201`.

---

### 8.13 `GET /api/events/[id]`

**Auth:** `requireStaff()`  
Returns the event row (with joined tapper and creator profile), all enrollments (with profile details), and the last 50 attendance logs (with profile names).

```json
{
  "event": { "...fields...", "tappers": {...}, "profiles": {...} },
  "enrollments": [...],
  "logs": [...]
}
```

---

### 8.14 `PATCH /api/events/[id]`

**Auth:** `requireStaff()` — only the event's `created_by` or an admin may update.  
Partial update. Re-validates time ordering and tapper conflicts. Returns `409` on overlap, `403` if not owner/admin.

---

### 8.15 `DELETE /api/events/[id]`

**Auth:** `requireStaff()` — only the event's `created_by` or an admin may delete.  
Cascades to `event_enrollments`. `attendance_logs.event_id` becomes `NULL`. Returns `204`.

---

### 8.16 `GET /api/events/[id]/enrollments`

**Auth:** `requireStaff()`  
Returns all enrolled profiles for the event with `profiles(id, full_name, email, student_id)`.

---

### 8.17 `POST /api/events/[id]/enrollments`

**Auth:** Any authenticated user.  
**Body:** `{ "profile_id": "<uuid>" }`

- **Staff:** may enroll any student.
- **Students:** may only enroll themselves (`profile_id === user.id`) and only if `event.allow_self_enrollment = true`.

Returns `409` if already enrolled, `201` on success.

---

### 8.18 `DELETE /api/events/[id]/enrollments/[profileId]`

**Auth:** Any authenticated user.

- **Staff:** may remove any student.
- **Students:** may only remove themselves from `allow_self_enrollment = true` events.

Returns `204`.

---

### 8.19 `GET /api/export`

**Auth:** `requireStaff()`  
**Query params:** `event_id?` (UUID), `from?` (ISO date), `to?` (ISO date) — all optional.

Returns a CSV file with `Content-Disposition: attachment; filename="attendance-export.csv"`.  
**Columns:** `scanned_at`, `student_name`, `student_id`, `card_uid`, `tapper_id`, `event_title`.

---

## 9. Authentication & Middleware

### 9.1 Supabase Auth Configuration

- **Provider:** Email + password only (no social OAuth).
- **Email confirmation:** Disabled in local dev (`enable_confirmations = false` in `supabase/config.toml`).
- **JWT expiry:** 3600 seconds with refresh token rotation.
- **Minimum password length:** 6 characters.
- Sessions are stored as HTTP cookies managed by `@supabase/ssr`. The middleware refreshes the session on every non-static request.

### 9.2 Next.js Middleware

**File:** `app/middleware.ts`

```
Matcher: all routes except _next/static, _next/image, favicon.ico, sitemap.xml, robots.txt
```

```
PUBLIC_ROUTES = ["/login", "/register", "/reset-password", "/update-password",
                 "/api/scan", "/api/tappers"]

ADMIN_ROUTES  = ["/dashboard", "/students", "/tappers", "/cards",
                 "/analytics", "/settings"]
```

**Logic per request:**

```
Is public route or static asset?
  → Yes: refresh session only, pass through

Is user authenticated?
  → No: redirect to /login?redirect=<pathname>

Fetch profile.role from DB

pathname === "/"?
  → student:       redirect /my-attendance
  → admin/teacher: redirect /dashboard

Student accessing ADMIN_ROUTE?
  → redirect /my-attendance
```

> `/events` is deliberately **not** in `ADMIN_ROUTES` — students can access it to browse self-enrollable events.  
> `/api/tappers` is in `PUBLIC_ROUTES` but individual route handlers call `requireAdmin()` for write access.

### 9.3 Role-Based Access Control Matrix

| Resource | `student` | `teacher` | `admin` | `service_role` |
|---|---|---|---|---|
| Read all profiles | ✅ (RLS allows) | ✅ | ✅ | ✅ |
| Update own profile | ✅ | ✅ | ✅ | ✅ |
| Create/delete profiles | ❌ | ❌ | ✅ | ✅ |
| Read own NFC cards | ✅ | ✅ | ✅ | ✅ |
| Read all NFC cards | ❌ | ✅ | ✅ | ✅ |
| Manage NFC cards | ❌ | ❌ | ✅ | ✅ |
| Read events | ✅ | ✅ | ✅ | ✅ |
| Create events | ❌ | ✅ | ✅ | ✅ |
| Update/delete own events | ❌ | ✅ | ✅ | ✅ |
| Update/delete any event | ❌ | ❌ | ✅ | ✅ |
| Read tappers | ✅ | ✅ | ✅ | ✅ |
| Manage tappers | ❌ | ❌ | ✅ | ✅ |
| Read own enrollments | ✅ | ✅ | ✅ | ✅ |
| Read all enrollments | ❌ | ✅ | ✅ | ✅ |
| Manage enrollments | ❌ | ✅ | ✅ | ✅ |
| Self-enroll (if allowed) | ✅ | — | — | — |
| Read own attendance logs | ✅ | ✅ | ✅ | ✅ |
| Read all attendance logs | ❌ | ✅ | ✅ | ✅ |
| Insert attendance logs | ❌ | ❌ | ❌ | ✅ (only) |
| Access admin UI routes | ❌ | ❌ | ✅ | N/A |
| Access analytics/export | ❌ | ✅ | ✅ | N/A |

---

## 10. Frontend — Application Shell

### 10.1 Root Layout

**File:** `app/app/layout.tsx`

- Sets HTML `lang="en"` with `dark` class and `antialiased`.
- Loads three Google Fonts via `next/font`:
  - **Outfit** (`--font-outfit`) — primary sans-serif
  - **Bricolage Grotesque** (`--font-bricolage-grotesque`) — display headings
  - **JetBrains Mono** (`--font-jetbrains-mono`) — monospace code/numbers
- Wraps children in `<TooltipProvider delay={300}>`.
- Renders a `<Toaster>` (sonner) at `bottom-right` with custom card styling.
- App metadata: title template `"%s · StudentID"`, description `"NFC-based student identification & attendance tracking system"`.

### 10.2 Auth Layout & Pages

**Route group:** `(auth)/`

Provides a centred, unauthenticated layout. Four public pages:

| Route | Component | Description |
|---|---|---|
| `/login` | `LoginForm` | Email + password sign-in; supports `?redirect=` param |
| `/register` | `RegisterForm` | Creates a student-role account |
| `/reset-password` | `ForgotPasswordForm` | Sends a password reset email |
| `/update-password` | `UpdatePasswordForm` | Sets new password after clicking the reset link (requires reset token in URL) |

### 10.3 Dashboard Layout & Sidebar

**File:** `app/app/(dashboard)/layout.tsx`

- Fetches the current user's full `Profile` row server-side.
- Renders `<SidebarProvider>` → `<AppSidebar profile={profile}>` + `<SidebarInset>`.

**File:** `components/dashboard/app-sidebar.tsx` (Client Component)

- Filters navigation items by role on the client:
  - **Navigation group:** Dashboard (admin/teacher), Events (all), My Attendance (student only).
  - **Manage group:** Students (admin/teacher), Tappers (admin), NFC Cards (admin), Analytics (admin/teacher).
  - **Footer:** Settings (admin), user avatar + name + role badge, Sign Out button.
- Active route highlighted with `bg-primary/10 text-primary font-medium`.
- Sign-out uses `supabase.auth.signOut()` wrapped in `useTransition`.

---

## 11. Frontend — Page Reference

### 11.1 /dashboard

**Access:** Admin, Teacher  
**Rendering:** Server Component (`force-dynamic`)

Runs 6 parallel Supabase queries:
1. Count of active events (ends in the future).
2. Count of student profiles.
3. Count of online tappers.
4. `event_attendance_summary.attendance_pct` — for average calculation.
5. Last 10 `attendance_logs` with joined profile name — feeds `RecentActivityFeed`.
6. All `attendance_logs.scanned_at` in the last 7 days — feeds `DashboardTrendChart`.

Renders 4 stat cards (Active Events, Students, Tappers Online, Avg. Attendance) + a real-time recent-activity feed + a 7-day scan trend area chart.

### 11.2 /events

**Access:** All roles (different UI per role)  
**Rendering:** Server Component (`force-dynamic`)

- **Student view:** Fetches all events + the student's enrollments. Shows only events where `allow_self_enrollment = true` or the student is already enrolled. Renders `<StudentEventsClient>` (card grid with enroll/unenroll controls).
- **Staff view:** Fetches all events from `event_attendance_summary`. Renders `<EventsPageClient>` (searchable, filterable table) + "New Event" button.

### 11.3 /events/new and /events/[id]/edit

**Access:** Admin, Teacher  
Forms use `react-hook-form` + Zod validation. Fields: title, type (select), tapper (select), starts_at, ends_at, description, allow_self_enrollment toggle. Both forms call the events API and redirect on success.

### 11.4 /events/[id]

**Access:** Admin, Teacher  
Event detail page showing:
- Event metadata (title, type, tapper, time window, description).
- Live `EventAttendanceFeed` — subscribes to Supabase Realtime `postgres_changes` on `attendance_logs` for this event.
- `EnrollmentManager` — staff can add/remove enrolled students.
- Edit and Delete action buttons (`DeleteEventDialog` for confirmation).

### 11.5 /students and /students/[id]

**Access:** Admin, Teacher

- `/students` — `StudentsPageClient` with search filter. `AddStudentDialog` for admin-created accounts.
- `/students/[id]` — Individual student record: profile info, NFC cards assigned, attendance history.

### 11.6 /tappers and /tappers/[id]

**Access:** Admin only

- `/tappers` — `TappersPageClient` with live online/offline status indicators. `RegisterTapperDialog` to add new devices.
- `/tappers/[id]` — Device detail: assigned events, last seen timestamp, location.

### 11.7 /cards

**Access:** Admin only  
**Rendering:** Server Component

Two panels:

1. **Unregistered Scans** (`UnregisteredScans`) — subscribes to Supabase Realtime on `attendance_logs WHERE profile_id IS NULL`. Shows deduped pending scans from the last 24 hours. Each row has an **Assign →** button that opens `AssignCardDialog` pre-populated with the `card_uid`.
2. **Paired Cards** (`CardsTable`) — full list of `nfc_cards` joined with profiles. Each row supports activate/deactivate toggle and delete.

The page also pre-fetches all assignable profiles (students and teachers without an existing card).

### 11.8 /analytics

**Access:** Admin, Teacher  
**Rendering:** Server Component (`force-dynamic`)

Two charts + CSV export:

1. **Attendance Rate by Event** (`AttendanceRateChart`) — bar chart of `attendance_pct` for the most recent 10 events (Recharts).
2. **Scan Trend (Last 30 Days)** (`AttendanceTrendChart`) — area chart of daily scan counts (Recharts).
3. **Export** (`ExportButton` → `ExportDialog`) — lets staff filter by event and/or date range, then calls `GET /api/export` and triggers a CSV download.

### 11.9 /my-attendance

**Access:** Student only  
**Rendering:** Server Component (`force-dynamic`)

Fetches the student's `attendance_logs` (with joined event titles) and `event_enrollments` (for streak/rate calculation).

Displays:
- 3 stat cards: **Overall Rate**, **Events Attended**, **Current Streak** (consecutive attended events starting from most recent).
- Full attendance history table: event name + type badge, scan date/time, tapper ID, "Present" badge.

### 11.10 /settings

**Access:** Admin only  
**Rendering:** Server Component

Read-only system information:
- **Attendance Rules** — late threshold / grace period (stubs, planned for future release).
- **Webhook Configuration** — masked `SCAN_WEBHOOK_SECRET` (last 4 chars visible), `APP_URL`, MQTT port `1883`, broker listener `0.0.0.0:1883`.
- **Notifications** — tamper alerts and offline detection (both marked "Not configured").

---

## 12. Frontend — Component Library

All base UI primitives are shadcn/ui components (stored in `components/ui/`). Custom domain components are organised by feature:

| Directory | Components |
|---|---|
| `components/analytics/` | `AttendanceRateChart`, `AttendanceTrendChart`, `ExportButton`, `ExportDialog` |
| `components/auth/` | `LoginForm`, `RegisterForm`, `ForgotPasswordForm`, `UpdatePasswordForm` |
| `components/cards/` | `AssignCardDialog`, `CardsTable`, `UnregisteredScans` |
| `components/dashboard/` | `AppSidebar`, `DashboardTrendChart`, `RecentActivityFeed` |
| `components/events/` | `CreateEventForm`, `EditEventForm`, `EventsPageClient`, `EventsTable`, `EventAttendanceFeed`, `EnrollmentManager`, `StudentEventsClient`, `DeleteEventDialog`, `DeleteEventDetailsActions` |
| `components/shared/` | `PageHeader`, `Logo`, `LogoWithText`, `StatusIndicator`, `LocalDateTime` |
| `components/students/` | `AddStudentDialog`, `StudentsPageClient`, `StudentsTable` |
| `components/tappers/` | `RegisterTapperDialog`, `TappersPageClient`, `TappersTable` |
| `components/ui/` | `Avatar`, `Badge`, `Button`, `Card`, `Chart`, `Dialog`, `DropdownMenu`, `Input`, `Label`, `Separator`, `Sheet`, `Sidebar`, `Skeleton`, `Sonner`, `Table`, `Tabs`, `Tooltip`, … |

**Rendering patterns:**

- Server Components are used for all initial data fetching (pages and layouts).
- Client Components (`"use client"`) are used for interactivity: forms, real-time subscriptions, table filters, dialogs.
- Realtime subscriptions use the browser Supabase client (`lib/supabase/client.ts`) with `supabase.channel().on("postgres_changes", ...)`.

---

## 13. End-to-End Data Flows

### 13.1 NFC Tap → Attendance Recorded

```
1.  Student taps NFC card on tapper device (ESP32 + RC522)

2.  Tapper publishes MQTT:
      Topic:   tapper/tapper-001/event/tag
      Payload: { "id": "A3F2091C", "timestamp": 1711900800 }

3.  broker.py listener receives message
      → tapper_id = topic.split("/")[1] = "tapper-001"
      → card_uid  = payload["id"]       = "A3F2091C"
      → timestamp = payload["timestamp"]

4.  broker.py → POST /api/scan
      Headers: Authorization: Bearer <secret>
      Body: { tapper_id, card_uid, timestamp }

5.  /api/scan handler:
      a. Validates shared secret → 401 on mismatch
      b. Zod validates body      → 400 on failure
      c. scanned_at = new Date(timestamp * 1000).toISOString()
      d. Query nfc_cards WHERE card_uid = ... AND is_active = true
         → profile_id (or null for unknown card)
      e. Query events WHERE tapper_id = ... AND is_active = true
           AND starts_at <= scanned_at AND ends_at >= scanned_at
         → event_id (or null if outside any event window)
      f. INSERT INTO attendance_logs { tapper_id, card_uid, scanned_at,
                                        profile_id, event_id }
      g. Determine visual pattern:
           profile_id + event_id → "p1/green"
           profile_id only       → "p1/yellow"
           neither               → "p1/red"

6.  broker.py receives { visual, acoustic }
      → call_heartbeat_api("tapper-001")
      → send_feedback("tapper-001", visual, acoustic)

7.  send_feedback publishes MQTT:
      Topic:   tapper/tapper-001/control/request
      Payload: { timestamp, id: 1,
                 visual: { pattern: "p1/green" },
                 acoustic: { pattern: "p1" } }

8.  Tapper activates green LED + buzzer pattern

9.  Supabase Realtime broadcasts the new attendance_logs row
      → Dashboard RecentActivityFeed updates in real time
      → Event detail EventAttendanceFeed updates in real time
```

### 13.2 Admin Pairs a New Card

```
1.  Unknown card is tapped → attendance_logs row inserted with profile_id = NULL
2.  Admin visits /cards page
3.  Page subscribes to Supabase Realtime:
      postgres_changes on attendance_logs WHERE profile_id IS NULL
4.  Pending scan appears in "Unregistered Scans" panel
5.  Admin clicks "Assign →" on a scan
6.  AssignCardDialog opens, pre-populated with card_uid
7.  Admin searches and selects target student profile
8.  Admin optionally enters a label, clicks Confirm
9.  Frontend → POST /api/cards { card_uid, profile_id, label }
10. /api/cards handler:
      a. requireAdmin() validates session + role
      b. Checks nfc_cards for duplicate card_uid → 409 if exists
      c. Inserts into nfc_cards
      d. Returns new card row + nested profile (201)
11. All future scans of this card_uid resolve to the student's profile_id
```

### 13.3 New Student Account Creation

```
1.  Admin visits /students, clicks "Add Student"
2.  Fills in: full_name, email, password, student_id
3.  Frontend → POST /api/students
4.  Handler:
      a. requireAdmin() validates session + role
      b. supabase.auth.admin.createUser({ email_confirm: true })
      c. Supabase inserts row into auth.users
      d. on_auth_user_created trigger fires:
           → INSERT INTO profiles (id, full_name, email) with role = 'student'
      e. If student_id provided → UPDATE profiles SET student_id = ...
      f. Fetch + return full profile with card data
5.  Student can immediately log in with the given credentials
```

### 13.4 Tapper Boot / Heartbeat

```
1.  Tapper powers on
2.  Tapper publishes MQTT: tapper/tapper-001/event/boot
3.  broker.py listener receives "event/boot"
      → call_heartbeat_api("tapper-001")
4.  Heartbeat handler:
      a. Validates shared secret
      b. UPDATE tappers SET is_online = true, last_seen_at = now()
         WHERE id = "tapper-001"
      c. Returns { status: "ok", tapper: {...} }
         or { status: "unknown_tapper" } if not registered
5.  Dashboard shows tapper as online with updated last_seen_at
```

### 13.5 Student Self-Enrollment

```
1.  Student visits /events
2.  Page queries event_attendance_summary for events where
    allow_self_enrollment = true OR student is already enrolled
3.  Student clicks "Enroll" on an event card
4.  Frontend → POST /api/events/{id}/enrollments { profile_id: user.id }
5.  Handler checks:
      a. Event exists and allow_self_enrollment = true
      b. profile_id === authenticated user's id
      c. Not already enrolled → 409 if duplicate
      d. Inserts into event_enrollments → 201
6.  RLS enforced at DB level via enrollments_self_enroll policy
7.  Student's enrollment now visible to staff in EnrollmentManager
```

---

## 14. Environment Variables

| Variable | Scope | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | ✅ | Supabase project REST API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + Server | ✅ | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | ✅ | Service role key — bypasses RLS. **Never expose to browser.** |
| `SCAN_WEBHOOK_SECRET` | Server + Firmware | ✅ | Shared secret for `/api/scan` and `/api/tappers/[id]/heartbeat` |
| `APP_URL` | Firmware only | ✅ | Base URL of the Next.js app (firmware default: `http://localhost:3000`) |

---

## 15. Getting Started (Local Development)

### Prerequisites

- Node.js 20+
- Python 3.11+
- Supabase CLI (`npm install -g supabase`)

### 1. Run the MQTT broker

```bash
cd firmware
pip install amqtt aiohttp
python3 broker.py
```

The broker starts on `0.0.0.0:1883`. The listener client connects to `127.0.0.1:1883` after a 2-second delay.

### 2. Configure the web application

```bash
cd app
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, SCAN_WEBHOOK_SECRET
```

### 3. Apply database migrations

```bash
cd app
npx supabase db push
# or manually:
# psql $DATABASE_URL -f supabase/migrations/20240001_initial_schema.sql
# psql $DATABASE_URL -f supabase/migrations/20240002_rls.sql
# psql $DATABASE_URL -f supabase/migrations/20240003_self_enrollment.sql
# psql $DATABASE_URL -f supabase/migrations/20240004_realtime.sql
```

### 4. Seed the admin account

```bash
npx supabase db seed
```

Creates `admin@studentid.local` / `admin1234`. All accounts via `/register` default to the `student` role.

### 5. Start the development server

```bash
npm install
npm run dev
```

App runs on `http://localhost:3000`.

---

## 16. Known Limitations & Future Work

| Area | Status | Notes |
|---|---|---|
| Tapper offline detection | ⚠️ No auto-offline | `is_online` is set `true` on heartbeat but never auto-reset to `false`. A scheduled cron job or Supabase Edge Function with a TTL is needed. |
| MQTT authentication | ⚠️ No broker auth | The MQTT broker accepts unauthenticated connections. Production deployments should add username/password or TLS client certificates. |
| MQTT TLS | ⚠️ Plain TCP | No TLS on port 1883. Production should use port 8883 with TLS or an internal VPN. |
| Multiple concurrent events per tapper | ⚠️ Guarded at API level | If two overlapping `is_active = true` events somehow exist for the same tapper, `/api/scan` uses `.single()` which throws — the scan would fail to resolve an event. The `POST`/`PATCH` API now prevents this, but existing data could still trigger it. |
| Student self-registration | ℹ️ Open signup | `/register` creates a student account with no invite required. For production, disable `enable_signup` in `supabase/config.toml` or implement an invite flow. |
| Attendance rules (late/grace) | ⚠️ Stub | The `/settings` page shows placeholders for late threshold and grace period. Not yet implemented. |
| Settings persistence | ⚠️ Read-only | The `/settings` page shows masked env var values but does not allow editing them through the UI. |
| Notification integrations | ⚠️ Not implemented | Tamper alerts and offline detection notifications are displayed in `/settings` but not wired to any email or push provider. |
| CSV export scope | ℹ️ Functional | Export returns all columns but has no pagination — very large datasets may be slow. |

