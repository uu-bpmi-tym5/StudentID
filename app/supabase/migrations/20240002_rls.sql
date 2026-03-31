-- ============================================================
-- Migration: Row Level Security Policies
-- StudentID — NFC Attendance System
-- ============================================================
-- Principle of least privilege:
--   • Students can only read/write their own data
--   • Teachers can read student + event data, write events
--   • Admins have full access
--   • The /api/scan webhook uses the service_role key (bypasses RLS)
-- ============================================================

-- ─── ENABLE RLS ON ALL TABLES ─────────────────────────────────

alter table public.profiles           enable row level security;
alter table public.nfc_cards          enable row level security;
alter table public.tappers            enable row level security;
alter table public.events             enable row level security;
alter table public.event_enrollments  enable row level security;
alter table public.attendance_logs    enable row level security;

-- ─── HELPER: current user role ────────────────────────────────

create or replace function public.current_user_role()
returns public.user_role
language sql stable
security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ─── PROFILES ─────────────────────────────────────────────────

-- Everyone can read all profiles (needed for name lookups)
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- Users can update only their own profile (admins: any)
create policy "profiles_update_own"
  on public.profiles for update
  using (
    auth.uid() = id
    or public.current_user_role() = 'admin'
  );

-- Only admins can insert or delete profiles directly
create policy "profiles_insert_admin"
  on public.profiles for insert
  with check (public.current_user_role() = 'admin');

create policy "profiles_delete_admin"
  on public.profiles for delete
  using (public.current_user_role() = 'admin');

-- ─── NFC CARDS ────────────────────────────────────────────────

-- Students see only their own cards; admins/teachers see all
create policy "nfc_cards_select"
  on public.nfc_cards for select
  using (
    profile_id = auth.uid()
    or public.current_user_role() in ('admin', 'teacher')
  );

-- Only admins can manage cards
create policy "nfc_cards_admin"
  on public.nfc_cards for all
  using (public.current_user_role() = 'admin');

-- ─── TAPPERS ──────────────────────────────────────────────────

-- Everyone authenticated can read tappers (needed for event creation)
create policy "tappers_select_authenticated"
  on public.tappers for select
  using (auth.role() = 'authenticated');

-- Only admins can manage tappers
create policy "tappers_admin"
  on public.tappers for all
  using (public.current_user_role() = 'admin');

-- ─── EVENTS ───────────────────────────────────────────────────

-- All authenticated users can read events
create policy "events_select_authenticated"
  on public.events for select
  using (auth.role() = 'authenticated');

-- Admins and teachers can create events
create policy "events_insert_staff"
  on public.events for insert
  with check (public.current_user_role() in ('admin', 'teacher'));

-- Event creator or admin can update/delete
create policy "events_update_own_or_admin"
  on public.events for update
  using (
    created_by = auth.uid()
    or public.current_user_role() = 'admin'
  );

create policy "events_delete_own_or_admin"
  on public.events for delete
  using (
    created_by = auth.uid()
    or public.current_user_role() = 'admin'
  );

-- ─── EVENT ENROLLMENTS ────────────────────────────────────────

-- Students see their own enrollments; staff see all
create policy "enrollments_select"
  on public.event_enrollments for select
  using (
    profile_id = auth.uid()
    or public.current_user_role() in ('admin', 'teacher')
  );

-- Staff manage enrollments
create policy "enrollments_manage_staff"
  on public.event_enrollments for all
  using (public.current_user_role() in ('admin', 'teacher'));

-- ─── ATTENDANCE LOGS ──────────────────────────────────────────

-- Students see only their own logs; staff see all
create policy "attendance_logs_select"
  on public.attendance_logs for select
  using (
    profile_id = auth.uid()
    or public.current_user_role() in ('admin', 'teacher')
  );

-- INSERT is done via service_role (webhook) — no anon/user inserts
-- No insert/update/delete policies needed for regular users

