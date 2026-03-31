-- ============================================================
-- Seed: Admin User
-- StudentID — NFC Attendance System
-- ============================================================
-- Creates a single admin account for local development.
-- All other users created via /register default to 'student'.
--
-- Credentials:
--   Email:    admin@studentid.local
--   Password: admin1234
-- ============================================================

DO $$
DECLARE
  admin_uid uuid := '00000000-0000-0000-0000-000000000001';
BEGIN

  -- ─── AUTH USER ──────────────────────────────────────────────
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_uid,
    'authenticated',
    'authenticated',
    'admin@studentid.local',
    crypt('admin1234', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Admin User"}'::jsonb,
    now(),
    now(),
    false,
    '', '', '', ''
  );

  -- ─── EMAIL IDENTITY ─────────────────────────────────────────
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    admin_uid,
    'admin@studentid.local',
    format('{"sub": "%s", "email": "%s"}', admin_uid::text, 'admin@studentid.local')::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  -- ─── PROMOTE TO ADMIN ───────────────────────────────────────
  -- The handle_new_user() trigger has already created the profile
  -- row with role = 'student' (the column default). Promote it.
  UPDATE public.profiles
  SET
    role      = 'admin',
    full_name = 'Admin User'
  WHERE id = admin_uid;

END $$;

