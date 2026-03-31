-- ============================================================
-- Migration: Initial Schema
-- StudentID — NFC Attendance System
-- ============================================================
-- Run order: this file creates all tables, types, indexes,
-- and triggers. RLS policies are in 20240002_rls.sql.
-- ============================================================

-- ─── ENUMS ────────────────────────────────────────────────────

create type public.user_role as enum ('admin', 'teacher', 'student');
create type public.event_type as enum ('exam', 'lecture', 'lab', 'other');

-- ─── PROFILES ─────────────────────────────────────────────────
-- One profile per auth.users row, created automatically via trigger.

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        public.user_role not null default 'student',
  student_id  text unique,                    -- institutional student number
  email       text not null unique,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'Extended user data. Mirrors auth.users; created via trigger on signup.';

-- Auto-create profile when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── NFC CARDS ────────────────────────────────────────────────
-- One physical NFC card linked to one student profile.

create table public.nfc_cards (
  id           uuid primary key default gen_random_uuid(),
  card_uid     text not null unique,          -- raw UID from NFC hardware
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  label        text,                          -- optional friendly name e.g. "Blue card"
  is_active    boolean not null default true,
  registered_at timestamptz not null default now()
);

comment on table public.nfc_cards is
  'NFC card registry. Each card is paired to exactly one student profile.';

create index nfc_cards_profile_id_idx on public.nfc_cards(profile_id);
create index nfc_cards_card_uid_idx   on public.nfc_cards(card_uid);

-- ─── TAPPERS ──────────────────────────────────────────────────
-- Physical NFC reader devices that communicate over MQTT.

create table public.tappers (
  id           text primary key,              -- matches MQTT tapper/{id} topic
  name         text not null,
  location     text,
  is_online    boolean not null default false,
  last_seen_at timestamptz
);

comment on table public.tappers is
  'NFC reader (tapper) device registry. ID matches the MQTT topic namespace.';

-- ─── EVENTS ───────────────────────────────────────────────────
-- A time-bounded session (lecture, exam, lab, …) on a specific tapper.

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  type        public.event_type not null default 'lecture',
  created_by  uuid not null references public.profiles(id),
  tapper_id   text not null references public.tappers(id),
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),

  constraint events_time_check check (ends_at > starts_at)
);

comment on table public.events is
  'Attendance event. Only scans during [starts_at, ends_at] are counted.';

create index events_tapper_id_idx  on public.events(tapper_id);
create index events_created_by_idx on public.events(created_by);
create index events_active_idx     on public.events(is_active, starts_at, ends_at);

-- ─── EVENT ENROLLMENTS ────────────────────────────────────────
-- Which students are expected to attend which event.

create table public.event_enrollments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,

  unique (event_id, profile_id)
);

comment on table public.event_enrollments is
  'Student enrollment in an event. Determines expected vs actual attendance.';

create index event_enrollments_event_id_idx   on public.event_enrollments(event_id);
create index event_enrollments_profile_id_idx on public.event_enrollments(profile_id);

-- ─── ATTENDANCE LOGS ──────────────────────────────────────────
-- Raw scan records written by the /api/scan webhook (broker.py bridge).

create table public.attendance_logs (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid references public.events(id) on delete set null,  -- null if no active event at scan time
  tapper_id  text not null,                                          -- denormalised for offline-resilient inserts
  card_uid   text not null,
  profile_id uuid references public.profiles(id) on delete set null, -- null if card not registered
  scanned_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.attendance_logs is
  'Immutable scan log. Written by the MQTT→webhook bridge. Never deleted.';

create index attendance_logs_event_id_idx   on public.attendance_logs(event_id);
create index attendance_logs_profile_id_idx on public.attendance_logs(profile_id);
create index attendance_logs_scanned_at_idx on public.attendance_logs(scanned_at desc);
create index attendance_logs_card_uid_idx   on public.attendance_logs(card_uid);

-- ─── ATTENDANCE SUMMARY VIEW ──────────────────────────────────
-- Convenience view: per-event attendance rate.

create or replace view public.event_attendance_summary as
select
  e.id          as event_id,
  e.title,
  e.type,
  e.starts_at,
  e.ends_at,
  e.tapper_id,
  count(distinct ee.profile_id)                          as enrolled_count,
  count(distinct al.profile_id)
    filter (where al.profile_id is not null)             as attended_count,
  round(
    count(distinct al.profile_id) filter (where al.profile_id is not null)
    * 100.0
    / nullif(count(distinct ee.profile_id), 0),
    1
  )                                                      as attendance_pct
from public.events e
left join public.event_enrollments ee on ee.event_id = e.id
left join public.attendance_logs   al on al.event_id = e.id
group by e.id;

comment on view public.event_attendance_summary is
  'Per-event attendance rate. Safe for dashboard use.';

