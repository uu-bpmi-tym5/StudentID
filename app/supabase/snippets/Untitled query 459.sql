-- Enable realtime broadcasts for attendance_logs.
-- Without this the supabase_realtime publication does not include the table
-- and postgres_changes subscriptions silently receive nothing.
alter publication supabase_realtime add table public.attendance_logs;
