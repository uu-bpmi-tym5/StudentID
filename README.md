# StudentID

NFC/RFID-based student identification and attendance tracking system. Physical tapper devices scan student cards at room entrances; scans are forwarded through an MQTT broker to a Next.js web application backed by Supabase.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PHYSICAL LAYER                           │
│                                                                 │
│   NFC Tapper (ESP32 + RC522)                                    │
│        │  MQTT (port 1883)                                      │
│        ▼                                                        │
│   firmware/broker.py  ──HTTP POST──▶  Next.js  /api/scan       │
│   (amqtt broker + listener)          (webhook endpoint)        │
└─────────────────────────────────────────────────────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│                                                                 │
│   Next.js 15 (App Router)                                       │
│   ├── Frontend  — React RSC + Client Components                │
│   ├── Backend   — API Routes + Server Actions                  │
│   └── Auth      — Supabase Auth (password / magic link)        │
│                                                                 │
│   Supabase (managed Postgres)                                   │
│   ├── PostgreSQL — all persistent data                         │
│   ├── Auth       — users, sessions, roles (RLS)               │
│   └── Realtime   — live attendance + card scan feed            │
└─────────────────────────────────────────────────────────────────┘
```

Data flows in one direction: **tapper → MQTT → broker.py → HTTP → Next.js API → Supabase**. The broker also sends feedback patterns back to each tapper over MQTT after receiving a response from the API.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database / Auth | Supabase (Postgres + Supabase Auth) |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui + Base UI primitives |
| MQTT Broker | Python `amqtt` (`firmware/broker.py`) |
| Firmware language | Python 3 (`asyncio`) |

---

## User Roles & Access Control

Every user account has one of three roles stored in `public.profiles.role`:

| Role | Default | Post-login destination | Access |
|---|---|---|---|
| `student` | ✅ Yes (all `/register` signups) | `/my-attendance` | Own attendance data only |
| `teacher` | — | `/dashboard` | Events + student data (read) |
| `admin` | — | `/dashboard` | Full access |

Role enforcement happens at two levels:
1. **`middleware.ts`** — server-side redirect based on the user's profile role fetched from Supabase on each request.  Students attempting to visit staff-only routes (`/dashboard`, `/events`, `/students`, `/tappers`, `/cards`, `/analytics`, `/settings`) are silently redirected to `/my-attendance`.
2. **`AppSidebar`** — navigation items are filtered by role; students see only **My Attendance**, staff see the full management sidebar.

The seed file (`supabase/seed.sql`) creates a single admin account for local development. All accounts created via `/register` receive the `student` role by default.

---

## MQTT Communication (Firmware ↔ Broker)

The broker listens on `0.0.0.0:1883`. All topics are namespaced by device ID.

### Device → Broker

| Topic | Payload |
|---|---|
| `tapper/{id}/event/tag` | `{ "id": "<card_uid>", "timestamp": <unix_int> }` |
| `tapper/{id}/event/boot` | *(empty)* |
| `tapper/{id}/event/tamper` | `{ "state": "<state_string>" }` |
| `tapper/{id}/control/response` | `{ "result": "<result_string>" }` |

### Broker → Device

| Topic | Payload |
|---|---|
| `tapper/{id}/control/request` | `{ "timestamp": <unix_int>, "id": <int>, "visual": { "pattern": "<pattern>" }, "acoustic": { "pattern": "<pattern>" } }` |

**Feedback patterns** returned by `/api/scan` and forwarded to the tapper:

| Situation | `visual.pattern` | `acoustic.pattern` |
|---|---|---|
| Known card + active event → attendance recorded | `p1/green` | `p1` |
| Known card, no active event at scan time | `p1/yellow` | `p1` |
| Unknown card (not registered in `nfc_cards`) | `p1/red` | `p1` |

The `tapper_id` is always extracted from position 1 of the topic string: `topic.split("/")[1]`.

---

## API Routes

### `POST /api/scan`
**Called by:** `firmware/broker.py` on every `event/tag` MQTT message.  
**Auth:** Shared secret in the `Authorization` header (`SCAN_WEBHOOK_SECRET` env var).  
**Public route:** yes — excluded from the session middleware auth check.

**Request body:**
```json
{
  "tapper_id": "tapper-001",
  "card_uid":  "A3F2091C",
  "timestamp": 1711900800
}
```

**Processing logic:**
1. Validate the `Authorization` secret.
2. Resolve `card_uid` → `nfc_cards` → `profiles` row.
3. Find the active `events` row for `tapper_id` where `now()` is within `[starts_at, ends_at]`.
4. Insert a row into `attendance_logs` (uses `service_role` key — bypasses RLS).
5. Return a feedback directive.

**Response body:**
```json
{ "status": "ok", "visual": "p1/green", "acoustic": "p1", "profile_id": "...", "event_id": "..." }
```

---

### `GET /api/cards`
**Called by:** Admin cards page on initial load.  
**Auth:** Requires authenticated admin session.  
Returns all paired NFC cards joined with their linked profile.

---

### `POST /api/cards`
**Called by:** Assign card dialog.  
**Auth:** Requires authenticated admin session.  
**Body:** `{ "card_uid": "AABBCCDD", "profile_id": "<uuid>", "label": "optional" }`  
Creates a new card pairing. Returns `409` if the card UID is already registered.

---

### `DELETE /api/cards/:id`
**Called by:** Cards table delete action.  
**Auth:** Requires authenticated admin session.  
Permanently removes a card pairing. Returns `204` on success.

---

### `PATCH /api/cards/:id`
**Called by:** Cards table toggle action.  
**Auth:** Requires authenticated admin session.  
**Body:** `{ "is_active": true | false }`  
Activates or deactivates a card without removing the pairing.

---

### `GET /api/export`
**Called by:** Admin/teacher from the analytics page.  
**Auth:** Requires authenticated session (Supabase Auth cookie).  
**Query params:** `event_id`, `format` (`csv` | `pdf`).  
Returns an attendance report for the requested event as a downloadable file.

---

## Frontend Page Routes

All dashboard pages live under the `(dashboard)` route group and require an authenticated session enforced by `middleware.ts`.

### Auth

| Route | Description | Access |
|---|---|---|
| `/login` | Email + password sign-in | Public |
| `/register` | Account creation — role defaults to `student` | Public |

### Dashboard

| Route | Description | Roles |
|---|---|---|
| `/dashboard` | Overview — attendance summary, today's events | Admin, Teacher |
| `/events` | List of all events | Admin, Teacher |
| `/events/new` | Create a new event | Admin, Teacher |
| `/events/[eventId]` | Event detail — live attendance feed | Admin, Teacher |
| `/events/[eventId]/edit` | Edit event metadata and enrollment | Admin, Teacher |
| `/students` | Student directory with search | Admin, Teacher |
| `/students/[studentId]` | Individual student record and attendance history | Admin, Teacher |
| `/tappers` | NFC device list with online/offline status | Admin |
| `/tappers/[tapperId]` | Device detail — assigned events, last seen, location | Admin |
| `/cards` | NFC card pairing — scan-to-assign flow with live pending feed | Admin |
| `/analytics` | Charts and trends — per-event and per-student attendance rates | Admin, Teacher |
| `/my-attendance` | Personal attendance view — events, status, percentage | Student |
| `/settings` | System configuration | Admin |

---

## NFC Card Pairing Flow

Cards are linked to user profiles via the `/cards` admin page:

1. A card is tapped on any tapper → `broker.py` calls `POST /api/scan` → scan is recorded in `attendance_logs` with `profile_id = NULL` (unknown card).
2. The `/cards` page shows a **Pending scans** panel that updates in real-time via Supabase Realtime (Postgres Changes subscription on `attendance_logs`).
3. Admin clicks **Assign →** on a pending scan → the **Assign Card** dialog opens, pre-populated with the card UID.
4. Admin searches for and selects the target student or teacher from a searchable list (only unassigned profiles are shown).
5. An optional label (e.g. `"Blue card"`) can be added.
6. On confirm, `POST /api/cards` is called → a row is inserted into `nfc_cards` → the card now resolves to a profile on all future scans.

Existing pairings are shown in the **Paired cards** table below, where cards can be activated/deactivated (temporarily blocks scans without removing the pairing) or deleted entirely.

---

## Data Model (Postgres)

```
profiles          — one row per auth user; role: admin | teacher | student
nfc_cards         — NFC card UID → profile mapping; supports activate/deactivate
tappers           — physical device registry; ID matches MQTT topic namespace
events            — time-bounded session (lecture, exam, lab, other)
event_enrollments — which students are expected at which event
attendance_logs   — immutable scan records written by /api/scan; single source of truth
```

**Key view:** `event_attendance_summary` — per-event enrolled count, attended count, and attendance percentage.

Row-Level Security (RLS) is enforced at the database level:

| Role | Profiles | NFC Cards | Events | Attendance Logs |
|---|---|---|---|---|
| Student | Read own | Read own | — | Read own |
| Teacher | Read all | Read all | Read all, write own | Read all |
| Admin | Full | Full | Full | Full |
| `/api/scan` webhook | — | Read all | Read all | Write (service role) |

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # server-side only

# MQTT Bridge
SCAN_WEBHOOK_SECRET=some-random-secret  # shared with firmware/broker.py

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Getting Started

### 1. Run the MQTT broker (firmware)
```bash
cd firmware
pip install amqtt
python broker.py
```
The broker starts on `0.0.0.0:1883`. The internal listener client connects to `127.0.0.1:1883` after a 2-second delay and subscribes to all topics (`#`).

### 2. Run the Next.js app
```bash
cd app
npm install
cp .env.local.example .env.local   # fill in Supabase + webhook secret
npm run dev
```
App runs on `http://localhost:3000`.

### 3. Apply database migrations
```bash
cd app
npx supabase db push
# or apply manually:
# psql $DATABASE_URL -f supabase/migrations/20240001_initial_schema.sql
# psql $DATABASE_URL -f supabase/migrations/20240002_rls.sql
```

### 4. Seed the admin account (local dev)
```bash
npx supabase db seed
```
Creates `admin@studentid.local` / `admin1234`. All accounts created via `/register` default to the `student` role.

---

## Repository Structure

```
StudentID/
├── firmware/
│   ├── broker.py        — MQTT broker + listener + HTTP webhook call
│   └── README.md
└── app/                 — Next.js full-stack application
    ├── app/
    │   ├── (auth)/      — /login, /register
    │   ├── (dashboard)/ — all authenticated pages (role-gated)
    │   └── api/
    │       ├── scan/    — POST: NFC tap webhook (called by broker.py)
    │       ├── cards/   — GET/POST: card pairing; DELETE/PATCH: card management
    │       └── export/  — GET: CSV/PDF attendance export
    ├── components/
    │   ├── auth/        — login-form, register-form
    │   ├── cards/       — assign-card-dialog, unregistered-scans, cards-table
    │   ├── dashboard/   — app-sidebar (role-filtered navigation)
    │   ├── shared/      — page-header, logo, status-indicator
    │   └── ui/          — base UI primitives (button, dialog, table, …)
    ├── lib/supabase/    — browser/server/admin clients + generated types
    ├── middleware.ts    — session auth + role-based route protection
    └── supabase/
        ├── migrations/  — 20240001_initial_schema.sql, 20240002_rls.sql
        └── seed.sql     — admin account for local development
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PHYSICAL LAYER                           │
│                                                                 │
│   NFC Tapper (ESP32 + RC522)                                    │
│        │  MQTT (port 1883)                                      │
│        ▼                                                        │
│   firmware/broker.py  ──HTTP POST──▶  Next.js  /api/scan       │
│   (amqtt broker + listener)          (webhook endpoint)        │
└─────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
│                                                                 │
│   Next.js 15 (App Router)                                       │
│   ├── Frontend  — React RSC + Client Components                │
│   ├── Backend   — API Routes + Server Actions                  │
│   └── Auth      — Supabase Auth (password / magic link)        │
│                                                                 │
│   Supabase (managed Postgres)                                   │
│   ├── PostgreSQL — all persistent data                         │
│   ├── Auth       — users, sessions, roles (RLS)               │
│   └── Realtime   — live attendance feed via WebSocket          │
└─────────────────────────────────────────────────────────────────┘
```

Data flows in one direction: **tapper → MQTT → broker.py → HTTP → Next.js API → Supabase**. The broker also sends feedback patterns back to each tapper over MQTT after receiving a response from the API.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database / Auth | Supabase (Postgres + Supabase Auth) |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui |
| MQTT Broker | Python `amqtt` (`firmware/broker.py`) |
| Firmware language | Python 3 (`asyncio`) |

---

## MQTT Communication (Firmware ↔ Broker)

The broker listens on `0.0.0.0:1883`. All topics are namespaced by device ID.

### Device → Broker

| Topic | Direction | Payload |
|---|---|---|
| `tapper/{id}/event/tag` | Device → Broker | `{ "id": "<card_uid>", "timestamp": <unix_int> }` |
| `tapper/{id}/event/boot` | Device → Broker | *(empty)* |
| `tapper/{id}/event/tamper` | Device → Broker | `{ "state": "<state_string>" }` |
| `tapper/{id}/control/response` | Device → Broker | `{ "result": "<result_string>" }` |

### Broker → Device

| Topic | Direction | Payload |
|---|---|---|
| `tapper/{id}/control/request` | Broker → Device | `{ "timestamp": <unix_int>, "id": <int>, "visual": { "pattern": "<pattern>" }, "acoustic": { "pattern": "<pattern>" } }` |

**Feedback patterns** — the broker resolves the card via the `/api/scan` webhook and sends back a visual + acoustic pattern:

| Situation | `visual.pattern` | `acoustic.pattern` |
|---|---|---|
| Attendance recorded (known student) | `p1/green` | `p1` |
| No active event at scan time | `p1/yellow` | `p1` |
| Unknown card (not registered) | `p1/red` | `p1` |

The `tapper_id` is always extracted from position 1 of the topic string: `topic.split("/")[1]`.

---

## API Routes (Broker ↔ Next.js)

These are the HTTP endpoints that bridge the firmware to the application layer.

### `POST /api/scan`
**Called by:** `firmware/broker.py` on every `event/tag` MQTT message.  
**Auth:** Shared secret in the `Authorization` header (`SCAN_WEBHOOK_SECRET` env var).  
**Public route:** yes — excluded from the session middleware auth check.

**Request body:**
```json
{
  "tapper_id": "tapper-001",
  "card_uid":  "A3F2091C",
  "timestamp": 1711900800
}
```

**Processing logic:**
1. Validate the `Authorization` secret.
2. Resolve `card_uid` → `nfc_cards` → `profiles` row.
3. Find the active `events` row for `tapper_id` where `now()` is within `[starts_at, ends_at]`.
4. Insert a row into `attendance_logs` (uses `service_role` key — bypasses RLS).
5. Return a feedback directive.

**Response body:**
```json
{
  "status": "recorded" | "no_event" | "unknown_card",
  "visual_pattern": "p1/green" | "p1/yellow" | "p1/red",
  "acoustic_pattern": "p1"
}
```

---

### `GET /api/export`
**Called by:** Admin/teacher from the analytics page.  
**Auth:** Requires authenticated session (Supabase Auth cookie).  
**Query params:** `event_id`, `format` (`csv` | `pdf`).

Returns an attendance report for the requested event as a downloadable file.

---

## Frontend Page Routes (Next.js App Router)

All dashboard pages live under the `(dashboard)` route group and require an authenticated session (enforced by `middleware.ts`). Auth pages are public.

### Auth

| Route | Description | Access |
|---|---|---|
| `/login` | Email + password sign-in | Public |
| `/register` | Account creation (invite-only or open) | Public |

### Dashboard

| Route | Description | Roles |
|---|---|---|
| `/dashboard` | Overview — attendance summary, today's events | All |
| `/events` | List of all events (filterable by type, date, tapper) | All |
| `/events/new` | Create a new event | Admin, Teacher |
| `/events/[eventId]` | Event detail — live attendance feed via Supabase Realtime | All |
| `/events/[eventId]/edit` | Edit event metadata and enrollment | Admin, Teacher |
| `/students` | Student directory with search | Admin, Teacher |
| `/students/[studentId]` | Individual student record and attendance history | Admin, Teacher |
| `/tappers` | NFC device list with online/offline status | Admin |
| `/tappers/[tapperId]` | Device detail — assigned events, last seen, location | Admin |
| `/cards` | NFC card registry — pair / unpair cards to students | Admin |
| `/analytics` | Charts and trends — per-event and per-student attendance rates | Admin, Teacher |
| `/my-attendance` | Personal attendance view — events, status, percentage | Student |
| `/settings` | System configuration — late threshold, grace period | Admin |

Route protection and role-based redirects are handled in `app/middleware.ts` using Supabase session cookies.

---

## Data Model (Postgres)

```
profiles          — one row per auth user; role: admin | teacher | student
nfc_cards         — NFC card UID → profile mapping (one student, many cards)
tappers           — physical device registry; ID matches MQTT topic namespace
events            — time-bounded session (lecture, exam, lab, other)
event_enrollments — which students are expected at which event
attendance_logs   — immutable scan records written by /api/scan; single source of truth
```

**Key view:** `event_attendance_summary` — per-event enrolled count, attended count, and attendance percentage.

Row-Level Security (RLS) is enforced at the database level:
- **Students** — read their own attendance logs and enrollments only.
- **Teachers** — read all student/event data; write events they created.
- **Admins** — full access.
- **`/api/scan`** — uses the `service_role` key and bypasses RLS entirely.

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # server-side only

# MQTT Bridge
SCAN_WEBHOOK_SECRET=some-random-secret  # shared with firmware/broker.py

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Getting Started

### 1. Run the MQTT broker (firmware)
```bash
cd firmware
pip install amqtt
python broker.py
```
The broker starts on `0.0.0.0:1883`. The internal listener client connects to `127.0.0.1:1883` after a 2-second delay and subscribes to all topics (`#`).

### 2. Run the Next.js app
```bash
cd app
npm install
cp .env.local.example .env.local   # fill in Supabase + webhook secret
npm run dev
```
App runs on `http://localhost:3000`.

### 3. Apply database migrations
```bash
cd app
npx supabase db push
# or apply manually:
# psql $DATABASE_URL -f supabase/migrations/20240001_initial_schema.sql
# psql $DATABASE_URL -f supabase/migrations/20240002_rls.sql
```

---

## Repository Structure

```
StudentID/
├── firmware/
│   ├── broker.py        — MQTT broker + listener + HTTP webhook call
│   └── README.md
└── app/                 — Next.js full-stack application
    ├── app/
    │   ├── (auth)/      — login, register
    │   ├── (dashboard)/ — all authenticated pages
    │   └── api/
    │       ├── scan/    — POST: NFC tap webhook (called by broker.py)
    │       └── export/  — GET: CSV/PDF attendance export
    ├── components/      — shared UI components
    ├── lib/supabase/    — Supabase client helpers + generated types
    └── supabase/
        └── migrations/  — Postgres schema + RLS policies
```
