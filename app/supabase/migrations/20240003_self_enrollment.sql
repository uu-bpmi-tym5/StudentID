-- ============================================================
-- Migration: Student Self-Enrollment
-- StudentID — NFC Attendance System
-- ============================================================
-- Adds allow_self_enrollment column to events.
-- Recreates event_attendance_summary view to include the new column.
-- Adds RLS policy so students can manage their own enrollments
-- when the event permits it.
-- ============================================================

-- ─── EVENTS: add self-enrollment flag ─────────────────────

alter table public.events
  add column if not exists allow_self_enrollment boolean not null default false;

comment on column public.events.allow_self_enrollment is
  'When true, students may enroll and unenroll themselves via the student events page.';

-- ─── RECREATE ATTENDANCE SUMMARY VIEW ─────────────────────
-- Include allow_self_enrollment so the student browse page can
-- filter to only enrollable events without an extra join.

drop view if exists public.event_attendance_summary;

create view public.event_attendance_summary as
select
  e.id                      as event_id,
  e.title,
  e.type,
  e.starts_at,
  e.ends_at,
  e.tapper_id,
  e.allow_self_enrollment,
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

-- ─── RLS: student self-enrollment ─────────────────────────

-- Students can insert their OWN enrollment when the event allows it
create policy "enrollments_self_enroll"
  on public.event_enrollments for insert
  with check (
    profile_id = auth.uid()
    and public.current_user_role() = 'student'
    and exists (
      select 1 from public.events
      where id = event_id
        and allow_self_enrollment = true
    )
  );

-- Students can delete their OWN enrollment when the event allows it
create policy "enrollments_self_unenroll"
  on public.event_enrollments for delete
  using (
    profile_id = auth.uid()
    and public.current_user_role() = 'student'
    and exists (
      select 1 from public.events
      where id = event_id
        and allow_self_enrollment = true
    )
  );

