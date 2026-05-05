# StudentID — Technical Documentation

> **Scope:** Backend (Next.js API routes, Supabase database, authentication, middleware) and Firmware (`firmware/broker.py`).  
> **Last updated:** April 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Firmware Layer — `broker.py`](#3-firmware-layer--brokerpy)
   - 3.1 [Responsibilities](#31-responsibilities)
   - 3.2 [MQTT Broker Configuration](#32-mqtt-broker-configuration)
   - 3.3 [MQTT Topic Schema](#33-mqtt-topic-schema)
   - 3.4 [Message Handlers](#34-message-handlers)
   - 3.5 [HTTP Bridge Functions](#35-http-bridge-functions)
   - 3.6 [Feedback Pattern System](#36-feedback-pattern-system)
   - 3.7 [Environment Variables (Firmware)](#37-environment-variables-firmware)
4. [Database Layer — Supabase / PostgreSQL](#4-database-layer--supabase--postgresql)
   - 4.1 [Enumerations](#41-enumerations)
   - 4.2 [Tables](#42-tables)
   - 4.3 [Indexes](#43-indexes)
   - 4.4 [Views](#44-views)
   - 4.5 [Database Functions](#45-database-functions)
   - 4.6 [Triggers](#46-triggers)
   - 4.7 [Row Level Security (RLS)](#47-row-level-security-rls)
   - 4.8 [Entity Relationship Diagram](#48-entity-relationship-diagram)
5. [Backend — Supabase Client Layers](#5-backend--supabase-client-layers)
6. [Backend — API Routes](#6-backend--api-routes)
   - 6.1 [POST /api/scan](#61-post-apiscan)
   - 6.2 [GET /api/cards](#62-get-apicards)
   - 6.3 [POST /api/cards](#63-post-apicards)
   - 6.4 [DELETE /api/cards/\[id\]](#64-delete-apicardsid)
   - 6.5 [PATCH /api/cards/\[id\]](#65-patch-apicardsid)
   - 6.6 [GET /api/students](#66-get-apistudents)
   - 6.7 [POST /api/students](#67-post-apistudents)
   - 6.8 [GET /api/tappers](#68-get-apitappers)
   - 6.9 [POST /api/tappers](#69-post-apitappers)
   - 6.10 [POST /api/tappers/\[id\]/heartbeat](#610-post-apitappersidheartbeat)
   - 6.11 [GET /api/export *(stub)*](#611-get-apiexport-stub)
7. [Authentication & Session Management](#7-authentication--session-management)
   - 7.1 [Supabase Auth](#71-supabase-auth)
   - 7.2 [Next.js Middleware](#72-nextjs-middleware)
   - 7.3 [Role-Based Access Control Matrix](#73-role-based-access-control-matrix)
8. [Environment Variables](#8-environment-variables)
9. [End-to-End Data Flows](#9-end-to-end-data-flows)
   - 9.1 [NFC Tap → Attendance Recorded](#91-nfc-tap--attendance-recorded)
   - 9.2 [Admin Pairs a Card](#92-admin-pairs-a-card)
   - 9.3 [New Student Account Creation](#93-new-student-account-creation)
   - 9.4 [Tapper Boot / Heartbeat](#94-tapper-boot--heartbeat)
10. [Known Limitations & Stubs](#10-known-limitations--stubs)

---

## 1. System Overview

StudentID is an **NFC/RFID-based attendance tracking system** composed of three tightly coupled layers:

```
┌──────────────────────────────────────────────────────────────────────┐
│                          PHYSICAL LAYER                              │
│                                                                      │
│   NFC Tapper Device (ESP32 + RC522 reader)                           │
│        │  publishes MQTT messages on port 1883                       │
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
│   ├── API Routes  ─── scan / cards / students / tappers / export    │
│   ├── Middleware  ─── session refresh + role-based route guard       │
│   └── Frontend   ─── React Server Components + Client Components    │
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
        ←  MQTT ← broker.py ←────────────────────
```

---

## 2. Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Web framework | Next.js (App Router) | 16.2.1 |
| Language (backend) | TypeScript | ^5 |
| Database | PostgreSQL (via Supabase) | 17 |
| Auth provider | Supabase Auth | @supabase/ssr ^0.10.0 |
| Supabase JS client | @supabase/supabase-js | ^2.101.0 |
| Payload validation | Zod | ^4.3.6 |
| MQTT broker/client | Python `amqtt` | via pip |
| HTTP client (firmware) | Python `aiohttp` | via pip |
| Async runtime (firmware) | Python `asyncio` | stdlib |

---

## 3. Firmware Layer — `broker.py`

**File:** `firmware/broker.py`  
**Runtime:** Python 3, `asyncio`  
**Dependencies:** `amqtt`, `aiohttp`

### 3.1 Responsibilities

`broker.py` is the **bridge between the physical NFC hardware and the Next.js application**. It runs two concurrent async tasks:

1. **MQTT Broker** — accepts connections from tapper devices on TCP port `1883`.
2. **MQTT Listener** — subscribes to all topics (`#`) and routes relevant messages to the HTTP API.

### 3.2 MQTT Broker Configuration

```python
BROKER_CONFIG = {
    "listeners": {
        "default": {
            "type": "tcp",
            "bind": "0.0.0.0:1883",   # Accepts connections from all interfaces
        }
    },
}
```

- Protocol: plain MQTT over TCP (no TLS in current configuration).
- The listener connects to `127.0.0.1:1883` (loopback) 2 seconds after broker start to avoid race conditions.
- Client IDs used by the broker process itself: `"mac-listener"` (subscribe), `"mac-feedback"` (publish responses).

### 3.3 MQTT Topic Schema

All topics are namespaced by device ID using the prefix `tapper/{id}/`.

#### Device → Broker

| Topic | Payload Format | Description |
|-------|---------------|-------------|
| `tapper/{id}/event/tag` | `{ "id": "<card_uid>", "timestamp": <unix_int> }` | NFC card scan event |
| `tapper/{id}/event/boot` | *(empty or any)* | Device power-on / restart signal |
| `tapper/{id}/event/tamper` | `{ "state": "<string>" }` | Physical tamper detection |
| `tapper/{id}/control/response` | `{ "result": "<string>" }` | Acknowledgement of a control request |

#### Broker → Device

| Topic | Payload Format | Description |
|-------|---------------|-------------|
| `tapper/{id}/control/request` | `{ "timestamp": <unix_int>, "id": <int>, "visual": { "pattern": "<p>" }, "acoustic": { "pattern": "<p>" } }` | LED/buzzer feedback command |

> **`tapper_id` extraction:** always `topic.split("/")[1]` — the second segment of the topic string.

### 3.4 Message Handlers

The listener's `while True` loop dispatches on topic substring:

```
"event/tag"       → call_scan_api()    then send_feedback()
"event/boot"      → call_heartbeat_api()
"event/tamper"    → log tamper state
"control/response"→ log result string
(other)           → log raw data
```

After processing an `event/tag` message, the listener additionally calls `call_heartbeat_api()` to update the tapper's `last_seen_at` timestamp even during active scanning sessions.

### 3.5 HTTP Bridge Functions

#### `call_heartbeat_api(tapper_id: str) → None`

```
POST {APP_URL}/api/tappers/{tapper_id}/heartbeat
Authorization: Bearer {SCAN_WEBHOOK_SECRET}
```

- Marks the tapper as `is_online = true` in the database.
- Called on every `event/boot` and after every `event/tag`.
- Returns silently on HTTP errors (non-blocking).
- Timeout: 5 seconds.

#### `call_scan_api(tapper_id, card_uid, timestamp) → (visual, acoustic)`

```
POST {APP_URL}/api/scan
Authorization: Bearer {SCAN_WEBHOOK_SECRET}
Content-Type: application/json

{ "tapper_id": "...", "card_uid": "...", "timestamp": <unix_int> }
```

- Returns a `(visual_pattern, acoustic_pattern)` tuple.
- Fallback on any network or HTTP error: `("p1/red", "p1")` — ensures tapper always receives a response.
- Timeout: 5 seconds.

#### `send_feedback(tapper_id, visual, acoustic) → None`

Creates a short-lived `MQTTClient` connection, publishes to `tapper/{id}/control/request`, then disconnects. QoS level: 0 (fire-and-forget).

```json
{
  "timestamp": 1711900800,
  "id": 1,
  "visual":   { "pattern": "p1/green" },
  "acoustic": { "pattern": "p1" }
}
```

### 3.6 Feedback Pattern System

The visual and acoustic patterns are determined by the Next.js API and forwarded verbatim to the tapper device.

| Condition | `visual` | `acoustic` | Meaning |
|-----------|----------|------------|---------|
| Registered card + active event → scan logged | `p1/green` | `p1` | Attendance recorded |
| Registered card + **no** active event at scan time | `p1/yellow` | `p1` | Card known, outside event window |
| Unregistered card (not in `nfc_cards`) | `p1/red` | `p1` | Unknown card |

### 3.7 Environment Variables (Firmware)

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_URL` | `http://localhost:3000` | Base URL of the Next.js application |
| `SCAN_WEBHOOK_SECRET` | `some-random-secret` | Shared secret for `Authorization: Bearer` header |

---

## 4. Database Layer — Supabase / PostgreSQL

**Migration files:**  
- `app/supabase/migrations/20240001_initial_schema.sql` — tables, types, indexes, triggers  
- `app/supabase/migrations/20240002_rls.sql` — Row Level Security policies  
**Seed file:** `app/supabase/seed.sql` — creates a single admin account for local development

### 4.1 Enumerations

#### `public.user_role`

```sql
CREATE TYPE public.user_role AS ENUM ('admin', 'teacher', 'student');
```

| Value | Description |
|-------|-------------|
| `admin` | Full system access |
| `teacher` | Can create/manage events and read all student data |
| `student` | Default; can only read own attendance records |

#### `public.event_type`

```sql
CREATE TYPE public.event_type AS ENUM ('exam', 'lecture', 'lab', 'other');
```

Classifies the nature of a scheduled attendance event.

---

### 4.2 Tables

#### `public.profiles`

One row per Supabase Auth user. Auto-created by the `on_auth_user_created` trigger on every `auth.users` insert.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE | Matches the auth user UUID |
| `full_name` | `text` | NOT NULL | Display name |
| `role` | `user_role` | NOT NULL, DEFAULT `'student'` | Access level |
| `student_id` | `text` | UNIQUE, nullable | Institutional student number |
| `email` | `text` | NOT NULL, UNIQUE | Mirrors `auth.users.email` |
| `avatar_url` | `text` | nullable | Profile picture URL |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Row creation timestamp |

> All accounts created via `/register` receive `role = 'student'` by default. Admin promotion must be done directly in the database or via the seed script.

---

#### `public.nfc_cards`

Registry of physical NFC cards paired to user profiles. A profile can hold multiple cards; each card UID is globally unique.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Internal row ID |
| `card_uid` | `text` | NOT NULL, UNIQUE | Raw UID read from NFC hardware (e.g. `"A3F2091C"`) |
| `profile_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | Owner profile |
| `label` | `text` | nullable | Friendly name (e.g. `"Blue card"`) |
| `is_active` | `boolean` | NOT NULL, DEFAULT `true` | When `false`, scans are still logged but flagged with no profile resolution |
| `registered_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Pairing timestamp |

> **Deactivation vs. deletion:** Setting `is_active = false` blocks the card from resolving a `profile_id` during scanning, without losing historical scan data.

---

#### `public.tappers`

Registry of physical NFC reader devices. The `id` column intentionally matches the MQTT topic namespace (e.g. `"tapper-001"` maps to `tapper/tapper-001/...`).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `text` | PK | Device identifier — must match MQTT topic segment |
| `name` | `text` | NOT NULL | Human-readable label |
| `location` | `text` | nullable | Physical placement description |
| `is_online` | `boolean` | NOT NULL, DEFAULT `false` | Live online status |
| `last_seen_at` | `timestamptz` | nullable | Timestamp of most recent heartbeat |

> `is_online` is set to `true` on every heartbeat call from `broker.py`. There is no automatic offline detection (no TTL/cron); it must be managed externally or via a future scheduled job.

---

#### `public.events`

A time-bounded attendance session assigned to a specific tapper device. Only scans arriving within `[starts_at, ends_at]` are associated with the event.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Internal ID |
| `title` | `text` | NOT NULL | Event name |
| `description` | `text` | nullable | Optional notes |
| `type` | `event_type` | NOT NULL, DEFAULT `'lecture'` | Event classification |
| `created_by` | `uuid` | NOT NULL, FK → `profiles(id)` | Admin or teacher who created the event |
| `tapper_id` | `text` | NOT NULL, FK → `tappers(id)` | The tapper device assigned to this event |
| `starts_at` | `timestamptz` | NOT NULL | Event start time |
| `ends_at` | `timestamptz` | NOT NULL | Event end time |
| `is_active` | `boolean` | NOT NULL, DEFAULT `true` | Can be used to manually disable without deleting |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Row creation timestamp |

**Constraint:** `ends_at > starts_at` (checked at DB level).

> A tapper can have multiple overlapping events. The `/api/scan` route matches the **first** `is_active = true` event for the tapper whose time window contains the scan timestamp (using `.single()` — returns one row or null).

---

#### `public.event_enrollments`

Junction table representing which students are **expected** to attend a given event. Used to calculate attendance rates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Internal ID |
| `event_id` | `uuid` | NOT NULL, FK → `events(id)` ON DELETE CASCADE | Target event |
| `profile_id` | `uuid` | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE | Enrolled student |

**Unique constraint:** `(event_id, profile_id)` — a student can only be enrolled once per event.

---

#### `public.attendance_logs`

**Immutable** write-once scan record. Written exclusively by the `/api/scan` webhook using the `service_role` key (bypassing RLS). Never updated or deleted by the application.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | Internal ID |
| `event_id` | `uuid` | FK → `events(id)` ON DELETE SET NULL, nullable | Resolved event at scan time; `NULL` if no active event |
| `tapper_id` | `text` | NOT NULL | Denormalised device ID — retained even if tapper row is deleted |
| `card_uid` | `text` | NOT NULL | Raw card UID — retained even if card pairing is removed |
| `profile_id` | `uuid` | FK → `profiles(id)` ON DELETE SET NULL, nullable | Resolved profile; `NULL` if card was not registered at scan time |
| `scanned_at` | `timestamptz` | NOT NULL | Timestamp from the tapper's payload (device clock) |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Server-side insertion timestamp |

> Both `tapper_id` and `card_uid` are denormalised strings, not foreign keys to their respective tables. This ensures the scan log survives device and card deletions and provides an accurate historical record.

---

### 4.3 Indexes

| Table | Index Name | Columns | Purpose |
|-------|-----------|---------|---------|
| `nfc_cards` | `nfc_cards_profile_id_idx` | `profile_id` | Fast card lookup by owner |
| `nfc_cards` | `nfc_cards_card_uid_idx` | `card_uid` | Fast card UID resolution at scan time |
| `events` | `events_tapper_id_idx` | `tapper_id` | Active event lookup by tapper |
| `events` | `events_created_by_idx` | `created_by` | Event listing by creator |
| `events` | `events_active_idx` | `(is_active, starts_at, ends_at)` | Composite index for time-window queries |
| `event_enrollments` | `event_enrollments_event_id_idx` | `event_id` | Enrollment lookup by event |
| `event_enrollments` | `event_enrollments_profile_id_idx` | `profile_id` | Enrollment lookup by student |
| `attendance_logs` | `attendance_logs_event_id_idx` | `event_id` | Logs by event |
| `attendance_logs` | `attendance_logs_profile_id_idx` | `profile_id` | Logs by student |
| `attendance_logs` | `attendance_logs_scanned_at_idx` | `scanned_at DESC` | Chronological scan feed |
| `attendance_logs` | `attendance_logs_card_uid_idx` | `card_uid` | Unregistered scan lookup |

---

### 4.4 Views

#### `public.event_attendance_summary`

A convenience aggregation view for dashboard and analytics consumption.

| Column | Type | Description |
|--------|------|-------------|
| `event_id` | `uuid` | Event primary key |
| `title` | `text` | Event title |
| `type` | `event_type` | Event classification |
| `starts_at` | `timestamptz` | Event start |
| `ends_at` | `timestamptz` | Event end |
| `tapper_id` | `text` | Assigned tapper |
| `enrolled_count` | `bigint` | Number of students enrolled |
| `attended_count` | `bigint` | Number of distinct known students who scanned |
| `attendance_pct` | `numeric(5,1)` | `attended_count / enrolled_count * 100`, rounded to 1 decimal; `NULL` if no enrolments |

**Calculation:**
```sql
round(
  count(distinct al.profile_id) FILTER (WHERE al.profile_id IS NOT NULL)
  * 100.0
  / nullif(count(distinct ee.profile_id), 0),
  1
) AS attendance_pct
```

Only scans with a resolved `profile_id` count towards `attended_count`. Unknown-card scans are captured in the raw `attendance_logs` table but are excluded from the percentage calculation.

---

### 4.5 Database Functions

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

A stable, security-definer helper function used across all RLS policies to avoid repeated subqueries. Returns the `user_role` enum for the currently authenticated user.

---

### 4.6 Triggers

#### `on_auth_user_created`

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

**Function `handle_new_user()`:**

```sql
INSERT INTO public.profiles (id, full_name, email)
VALUES (
  new.id,
  COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
  new.email
);
```

- Fires after every `auth.users` INSERT (i.e., every registration or admin-created account).
- Auto-populates `profiles.full_name` from `raw_user_meta_data` or falls back to the email prefix.
- `role` defaults to `'student'` via the column default; the `POST /api/students` route or seed SQL must set `student_id` and promote the role separately.

---

### 4.7 Row Level Security (RLS)

RLS is enabled on all six tables. The `/api/scan` webhook uses the `service_role` key which bypasses RLS entirely.

#### `public.profiles`

| Policy | Operation | Rule |
|--------|-----------|------|
| `profiles_select_all` | SELECT | `true` (all authenticated users can read all profiles) |
| `profiles_update_own` | UPDATE | `auth.uid() = id OR role = 'admin'` |
| `profiles_insert_admin` | INSERT | `current_user_role() = 'admin'` |
| `profiles_delete_admin` | DELETE | `current_user_role() = 'admin'` |

#### `public.nfc_cards`

| Policy | Operation | Rule |
|--------|-----------|------|
| `nfc_cards_select` | SELECT | `profile_id = auth.uid() OR role IN ('admin', 'teacher')` |
| `nfc_cards_admin` | ALL | `current_user_role() = 'admin'` |

#### `public.tappers`

| Policy | Operation | Rule |
|--------|-----------|------|
| `tappers_select_authenticated` | SELECT | `auth.role() = 'authenticated'` |
| `tappers_admin` | ALL | `current_user_role() = 'admin'` |

#### `public.events`

| Policy | Operation | Rule |
|--------|-----------|------|
| `events_select_authenticated` | SELECT | `auth.role() = 'authenticated'` |
| `events_insert_staff` | INSERT | `current_user_role() IN ('admin', 'teacher')` |
| `events_update_own_or_admin` | UPDATE | `created_by = auth.uid() OR role = 'admin'` |
| `events_delete_own_or_admin` | DELETE | `created_by = auth.uid() OR role = 'admin'` |

#### `public.event_enrollments`

| Policy | Operation | Rule |
|--------|-----------|------|
| `enrollments_select` | SELECT | `profile_id = auth.uid() OR role IN ('admin', 'teacher')` |
| `enrollments_manage_staff` | ALL | `current_user_role() IN ('admin', 'teacher')` |

#### `public.attendance_logs`

| Policy | Operation | Rule |
|--------|-----------|------|
| `attendance_logs_select` | SELECT | `profile_id = auth.uid() OR role IN ('admin', 'teacher')` |
| *(no INSERT/UPDATE/DELETE policies)* | — | INSERT performed exclusively via `service_role` (webhook) |

---

### 4.8 Entity Relationship Diagram

```
auth.users (Supabase managed)
     │ 1:1 (trigger)
     ▼
┌──────────────┐          ┌────────────────┐
│   profiles   │◄─────────│   nfc_cards    │
│─────────────-│  1:many  │────────────────│
│ id (PK/FK)   │          │ id             │
│ full_name    │          │ card_uid       │ ← scanned by tapper
│ role         │          │ profile_id(FK) │
│ student_id   │          │ label          │
│ email        │          │ is_active      │
│ avatar_url   │          │ registered_at  │
└──────┬───────┘          └────────────────┘
       │ 1:many (created_by)
       │
       ▼
┌──────────────┐          ┌────────────────┐
│    events    │          │    tappers     │
│──────────────│          │────────────────│
│ id           │◄────────-│ id (PK)        │ ← MQTT topic namespace
│ title        │  1:many  │ name           │
│ type         │(tapper_id)│ location      │
│ created_by   │          │ is_online      │
│ tapper_id(FK)│          │ last_seen_at   │
│ starts_at    │          └────────────────┘
│ ends_at      │
│ is_active    │
└──────┬───────┘
       │ 1:many              1:many
       ├─────────────────────────────────┐
       ▼                                 ▼
┌─────────────────────┐    ┌──────────────────────┐
│  event_enrollments  │    │   attendance_logs    │
│─────────────────────│    │──────────────────────│
│ id                  │    │ id                   │
│ event_id (FK)       │    │ event_id (FK, null)  │
│ profile_id (FK)     │    │ tapper_id (text)     │ ← denormalised
└─────────────────────┘    │ card_uid (text)      │ ← denormalised
                            │ profile_id (FK, null)│
                            │ scanned_at           │
                            │ created_at           │
                            └──────────────────────┘
```

---

## 5. Backend — Supabase Client Layers

Three distinct Supabase clients are used depending on the execution context:

### `createAdminClient()` — `lib/supabase/admin.ts`

```typescript
createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})
```

- Uses the **service role key** — bypasses all RLS policies.
- Used by: `/api/scan` (attendance insert), `/api/tappers/[id]/heartbeat`, all admin CRUD routes (`/api/cards`, `/api/students`, `/api/tappers`).
- **Never expose the service role key to the browser.**

### `createClient()` (server) — `lib/supabase/server.ts`

```typescript
createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  cookies: { getAll, setAll }   // reads/writes Next.js cookie store
})
```

- Uses the **anon key** — RLS fully enforced.
- Used by: `requireAdmin()` helper inside API routes (verifies session and role before granting access), and `middleware.ts` (session refresh + role check).
- Calls `supabase.auth.getUser()` on every request to validate the JWT.

### `createClient()` (browser) — `lib/supabase/client.ts`

```typescript
createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
```

- Uses the **anon key** — RLS fully enforced.
- Used by: Client Components that need direct Supabase access (e.g., Realtime subscriptions on attendance pages).

---

## 6. Backend — API Routes

### 6.1 `POST /api/scan`

**File:** `app/app/api/scan/route.ts`  
**Auth:** Webhook shared secret (`Authorization: Bearer <SCAN_WEBHOOK_SECRET>`)  
**Caller:** `firmware/broker.py` on every `event/tag` MQTT message  
**Middleware:** Excluded from session auth (`PUBLIC_ROUTES` in `middleware.ts`)  
**Supabase client:** Admin (service role — bypasses RLS)

#### Request

```json
{
  "tapper_id": "tapper-001",
  "card_uid":  "A3F2091C",
  "timestamp": 1711900800
}
```

**Validation (Zod):**
- `tapper_id`: non-empty string
- `card_uid`: non-empty string
- `timestamp`: positive integer (Unix seconds)

#### Processing Steps

1. **Authenticate** — compares `Authorization` header against `SCAN_WEBHOOK_SECRET`. Returns `401` on mismatch.
2. **Parse & validate** — Zod schema check on request body. Returns `400` with flatten details on failure.
3. **Resolve card** — queries `nfc_cards` for `card_uid` where `is_active = true`; retrieves `profile_id` (or `null`).
4. **Find active event** — queries `events` for the tapper where `is_active = true`, `starts_at ≤ scanned_at`, and `ends_at ≥ scanned_at`.
5. **Insert attendance log** — inserts into `attendance_logs` with resolved `profile_id` and `event_id` (either or both may be `null`).
6. **Determine feedback** — logic table:

| `card?.profile_id` | `activeEvent?.id` | `visual` |
|--------------------|-------------------|---------|
| present | present | `p1/green` |
| present | absent | `p1/yellow` |
| absent | any | `p1/red` |

#### Response

```json
{
  "status": "ok",
  "visual": "p1/green",
  "acoustic": "p1",
  "profile_id": "<uuid or null>",
  "event_id": "<uuid or null>"
}
```

**Error codes:** `400` (bad JSON / validation), `401` (wrong secret), `500` (DB error)

---

### 6.2 `GET /api/cards`

**File:** `app/app/api/cards/route.ts`  
**Auth:** Authenticated admin session (`requireAdmin()`)  
**Supabase client:** Admin

Returns all rows from `nfc_cards` joined with related `profiles` fields, ordered by `registered_at DESC`.

**Response:** Array of `nfc_cards` rows with nested `profiles(id, full_name, email, student_id, role)`.

---

### 6.3 `POST /api/cards`

**File:** `app/app/api/cards/route.ts`  
**Auth:** Authenticated admin session  
**Supabase client:** Admin

Pairs a new NFC card UID to an existing profile.

#### Request

```json
{
  "card_uid":   "AABBCCDD",
  "profile_id": "uuid-of-student",
  "label":      "Blue card"
}
```

**Validation (Zod):**
- `card_uid`: non-empty string
- `profile_id`: valid UUID
- `label`: optional string

**Duplicate detection:** Checks `nfc_cards` for an existing row with the same `card_uid`. Returns `409` if found.

**Response:** The newly created `nfc_cards` row with nested profile. HTTP `201`.

---

### 6.4 `DELETE /api/cards/[id]`

**File:** `app/app/api/cards/[id]/route.ts`  
**Auth:** Authenticated admin session  
**Supabase client:** Admin

Permanently removes an NFC card pairing by internal UUID (`id` column, not `card_uid`). Historical `attendance_logs` rows referencing this card retain the raw `card_uid` text but their `profile_id` is set to `NULL` (FK ON DELETE SET NULL).

**Response:** `204 No Content`

---

### 6.5 `PATCH /api/cards/[id]`

**File:** `app/app/api/cards/[id]/route.ts`  
**Auth:** Authenticated admin session  
**Supabase client:** Admin

Toggles a card's `is_active` flag without removing the pairing.

#### Request

```json
{ "is_active": false }
```

**Response:** Updated `nfc_cards` row with nested profile.

> When `is_active = false`, the card still appears in `attendance_logs` queries but the `/api/scan` route ignores it during profile resolution (the `eq("is_active", true)` filter means the card resolves to `null` and the scan logs as an unknown card).

---

### 6.6 `GET /api/students`

**File:** `app/app/api/students/route.ts`  
**Auth:** Authenticated admin session  
**Supabase client:** Admin

Returns all profiles where `role = 'student'`, ordered alphabetically by `full_name`, with a nested count of `nfc_cards(id, is_active)` per student.

---

### 6.7 `POST /api/students`

**File:** `app/app/api/students/route.ts`  
**Auth:** Authenticated admin session  
**Supabase client:** Admin

Creates a new student account without requiring email verification.

#### Request

```json
{
  "full_name":  "Jane Smith",
  "email":      "jane@example.com",
  "password":   "secure123",
  "student_id": "S20240042"
}
```

**Validation (Zod):**
- `full_name`: min 2 chars
- `email`: valid email format
- `password`: min 6 chars
- `student_id`: optional string

**Steps:**
1. Calls `supabase.auth.admin.createUser()` with `email_confirm: true` — bypasses email verification.
2. The `on_auth_user_created` trigger auto-creates the `profiles` row with `role = 'student'`.
3. If `student_id` is provided, updates the newly created profile row.
4. Fetches and returns the full profile with card data.

**Error codes:** `409` if email already exists, `500` on DB error.

---

### 6.8 `GET /api/tappers`

**File:** `app/app/api/tappers/route.ts`  
**Auth:** Authenticated admin session  
**Supabase client:** Admin

Returns all rows from `tappers` ordered by `id`.

---

### 6.9 `POST /api/tappers`

**File:** `app/app/api/tappers/route.ts`  
**Auth:** Authenticated admin session  
**Supabase client:** Admin

Registers a new tapper device in the database.

#### Request

```json
{
  "id":       "tapper-001",
  "name":     "Main Entrance",
  "location": "Building A, Room 101"
}
```

**Validation (Zod):**
- `id`: non-empty string matching `/^[a-z0-9:.-]+$/` — must match the MQTT topic segment
- `name`: non-empty string
- `location`: optional string

**Duplicate detection:** Returns `409` if `id` already exists.

**Initial state:** Inserted with `is_online: false` — goes online only after the first heartbeat.

---

### 6.10 `POST /api/tappers/[id]/heartbeat`

**File:** `app/app/api/tappers/[id]/heartbeat/route.ts`  
**Auth:** Webhook shared secret (`Authorization: Bearer <SCAN_WEBHOOK_SECRET>`)  
**Caller:** `firmware/broker.py` on `event/boot` and after every `event/tag`  
**Supabase client:** Admin

Updates `is_online = true` and `last_seen_at = now()` for the specified tapper.

**Graceful unknown handling:** If the tapper `id` does not exist in the database, returns `200 { "status": "unknown_tapper" }` rather than an error — the device is not blocked.

**Response:** `{ "status": "ok", "tapper": <tapper row> }` or `{ "status": "unknown_tapper" }`

---

### 6.11 `GET /api/export` *(stub)*

**File:** `app/app/api/export/route.ts`  
**Status:** ⚠️ Not implemented — returns `501`

Planned to export attendance data as CSV or PDF. See [Section 10](#10-known-limitations--stubs) for planned query parameters.

---

## 7. Authentication & Session Management

### 7.1 Supabase Auth

- **Provider:** Email + password only (no social OAuth configured).
- **Email confirmation:** Disabled in local dev (`enable_confirmations = false`). Admin-created accounts use `email_confirm: true` API flag.
- **JWT expiry:** 3600 seconds (1 hour) with refresh token rotation enabled.
- **Refresh token reuse interval:** 10 seconds.
- **Minimum password length:** 6 characters.

Sessions are stored in HTTP cookies managed by `@supabase/ssr`. The middleware calls `supabase.auth.getUser()` on every non-static request to refresh the session and validate the JWT.

### 7.2 Next.js Middleware

**File:** `app/middleware.ts`

The middleware runs on all routes except `_next/static`, `_next/image`, `favicon.ico`, `sitemap.xml`, and `robots.txt` (configured via the `matcher` export).

#### Route Classification

```typescript
const PUBLIC_ROUTES = ["/login", "/register", "/api/scan", "/api/tappers"];
const ADMIN_ROUTES  = ["/dashboard", "/students", "/tappers", "/cards",
                       "/analytics", "/settings", "/events"];
```

> Note: `/api/tappers` (GET and POST) is in `PUBLIC_ROUTES` — it relies on the `requireAdmin()` function inside the route handler itself for access control.

#### Middleware Logic

```
Request
  │
  ├── Is public route or static asset?
  │   └── Yes → refresh session only, pass through
  │
  ├── Is user authenticated?
  │   └── No → redirect to /login?redirect=<pathname>
  │
  ├── Fetch profile.role from DB
  │
  ├── pathname === "/"?
  │   ├── student → redirect /my-attendance
  │   └── admin/teacher → redirect /dashboard
  │
  └── Student accessing ADMIN_ROUTE?
      └── Yes → redirect /my-attendance
```

### 7.3 Role-Based Access Control Matrix

| Resource | `student` | `teacher` | `admin` | webhook (`service_role`) |
|----------|-----------|-----------|---------|--------------------------|
| Own profile (read) | ✅ | ✅ | ✅ | ✅ |
| All profiles (read) | ✅ (RLS allows) | ✅ | ✅ | ✅ |
| Own NFC cards (read) | ✅ | ✅ | ✅ | ✅ |
| All NFC cards (read) | ❌ | ✅ | ✅ | ✅ |
| Manage NFC cards | ❌ | ❌ | ✅ | ✅ |
| Read events | ✅ | ✅ | ✅ | ✅ |
| Create events | ❌ | ✅ | ✅ | ✅ |
| Update/delete own events | ❌ | ✅ | ✅ | ✅ |
| Update/delete any event | ❌ | ❌ | ✅ | ✅ |
| Read tappers | ✅ | ✅ | ✅ | ✅ |
| Manage tappers | ❌ | ❌ | ✅ | ✅ |
| Own enrollments (read) | ✅ | ✅ | ✅ | ✅ |
| All enrollments | ❌ | ✅ | ✅ | ✅ |
| Manage enrollments | ❌ | ✅ | ✅ | ✅ |
| Own attendance logs (read) | ✅ | ✅ | ✅ | ✅ |
| All attendance logs (read) | ❌ | ✅ | ✅ | ✅ |
| Insert attendance logs | ❌ | ❌ | ❌ | ✅ (only) |
| Access admin API routes | ❌ | ❌ | ✅ | N/A |

---

## 8. Environment Variables

| Variable | Scope | Required | Description |
|----------|-------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + Server | ✅ | Supabase project REST API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + Server | ✅ | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | ✅ | Supabase service role key — bypasses RLS |
| `SCAN_WEBHOOK_SECRET` | Server + Firmware | ✅ | Shared secret for `/api/scan` and `/api/tappers/[id]/heartbeat` |
| `APP_URL` | Firmware only | ✅ | Base URL of the Next.js app (default: `http://localhost:3000`) |

> **Security note:** `SUPABASE_SERVICE_ROLE_KEY` must **never** be exposed to the browser. It is only used in server-side API route handlers via `createAdminClient()`.

---

## 9. End-to-End Data Flows

### 9.1 NFC Tap → Attendance Recorded

```
1.  Student taps NFC card on tapper device (ESP32 + RC522)
2.  Tapper publishes MQTT:
      Topic:   tapper/tapper-001/event/tag
      Payload: { "id": "A3F2091C", "timestamp": 1711900800 }

3.  broker.py listener receives message
      → Extracts tapper_id = "tapper-001"
      → Extracts card_uid  = "A3F2091C"
      → Extracts timestamp = 1711900800

4.  broker.py calls POST /api/scan
      Body: { tapper_id, card_uid, timestamp }
      Auth: Bearer <SCAN_WEBHOOK_SECRET>

5.  /api/scan handler:
      a. Validates secret
      b. Converts timestamp → ISO string (scanned_at)
      c. Queries nfc_cards WHERE card_uid = "A3F2091C" AND is_active = true
         → Returns profile_id (or null if unknown card)
      d. Queries events WHERE tapper_id = "tapper-001"
           AND is_active = true
           AND starts_at <= scanned_at
           AND ends_at   >= scanned_at
         → Returns event_id (or null if no active event)
      e. Inserts into attendance_logs:
           { tapper_id, card_uid, scanned_at, profile_id, event_id }
      f. Determines visual pattern:
           profile_id + event_id → p1/green
           profile_id only       → p1/yellow
           neither               → p1/red
      g. Returns { status, visual, acoustic, profile_id, event_id }

6.  broker.py receives response
      → Calls call_heartbeat_api("tapper-001") [updates last_seen_at]
      → Calls send_feedback("tapper-001", "p1/green", "p1")

7.  send_feedback publishes MQTT:
      Topic:   tapper/tapper-001/control/request
      Payload: { timestamp, id: 1,
                 visual: { pattern: "p1/green" },
                 acoustic: { pattern: "p1" } }

8.  Tapper device receives control/request
      → Activates green LED and buzzer pattern
```

---

### 9.2 Admin Pairs a Card

```
1.  Unknown card is tapped → attendance_logs row inserted with profile_id = NULL
2.  Admin visits /cards page
3.  Frontend subscribes to Supabase Realtime:
      Postgres Changes on attendance_logs WHERE profile_id IS NULL
4.  Pending scan appears in "Unregistered scans" panel
5.  Admin clicks "Assign →" on a scan
6.  Assign Card dialog opens, pre-populated with card_uid
7.  Admin searches for and selects target student profile
8.  Admin (optionally) enters a label, clicks Confirm
9.  Frontend calls POST /api/cards:
      { card_uid, profile_id, label }
10. /api/cards handler:
      a. requireAdmin() validates session + role
      b. Checks nfc_cards for duplicate card_uid → 409 if exists
      c. Inserts into nfc_cards
      d. Returns new card row + nested profile
11. All future scans of this card_uid will resolve to the student's profile_id
```

---

### 9.3 New Student Account Creation

```
1.  Admin visits /students, clicks "Add Student"
2.  Fills in: full_name, email, password, student_id
3.  Frontend calls POST /api/students
4.  Handler:
      a. requireAdmin() validates session + role
      b. Calls supabase.auth.admin.createUser() with email_confirm: true
      c. Supabase creates auth.users row
      d. on_auth_user_created trigger fires:
           → Inserts profiles row (role = 'student', full_name from metadata)
      e. If student_id provided → UPDATE profiles SET student_id = ...
      f. Fetches + returns full profile with card data
5.  Student can immediately log in with given credentials
```

---

### 9.4 Tapper Boot / Heartbeat

```
1.  Tapper device powers on
2.  Device publishes MQTT:
      Topic:   tapper/tapper-001/event/boot

3.  broker.py listener receives "event/boot"
      → Calls POST /api/tappers/tapper-001/heartbeat
      Auth: Bearer <SCAN_WEBHOOK_SECRET>

4.  Heartbeat handler:
      a. Validates secret
      b. Calls supabase.from("tappers").update({
           is_online: true,
           last_seen_at: new Date().toISOString()
         }).eq("id", "tapper-001")
      c. Returns { status: "ok", tapper: {...} }
         or { status: "unknown_tapper" } if not registered

5.  Dashboard shows tapper as online with updated last_seen_at
```

---

## 10. Known Limitations & Stubs

| Area | Status | Notes |
|------|--------|-------|
| `GET /api/export` | ⚠️ Stub — returns `501` | Planned: CSV/PDF export with `event_id`, date range, format query params |
| Tapper offline detection | ⚠️ No auto-offline | `is_online` is set to `true` on heartbeat but never automatically set to `false`. Requires a scheduled cron job or Supabase Edge Function to mark tappers offline after a TTL. |
| MQTT authentication | ⚠️ No broker auth | The MQTT broker accepts unauthenticated connections. Production deployment should add username/password or TLS client certificates to `BROKER_CONFIG`. |
| MQTT TLS | ⚠️ Plain TCP | No TLS on port 1883. In production, use TLS (port 8883) or a VPN. |
| Multiple concurrent events per tapper | ⚠️ Undefined behaviour | If a tapper has two overlapping `is_active = true` events, `/api/scan` uses `.single()` which throws on multiple rows — the scan would fail to log an event. |
| Student self-registration | ℹ️ Open signup | `/register` creates a `student`-role account with no invite required. This should be restricted for production (disable `enable_signup` in `supabase/config.toml` or add invite flow). |
| Realtime feed | ℹ️ Frontend only | Supabase Realtime is consumed only in frontend Client Components (card pairing feed, live attendance). The backend API does not use Realtime. |
| Export route auth | ⚠️ TODO comment in code | `GET /api/export` has a TODO to enforce authentication and accept query parameters before implementation. |
| Password reset / magic link | ℹ️ Not wired | Supabase Auth supports magic links and password reset emails, but no pages/endpoints handle these flows in the current frontend. |

---

*Generated from source code analysis of `firmware/broker.py`, `app/app/api/**`, `app/lib/supabase/**`, `app/middleware.ts`, `app/supabase/migrations/**`, and `app/supabase/seed.sql`.*

