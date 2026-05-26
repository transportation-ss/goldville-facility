-- ============================================================
-- 直接建立 3 個大夜班帳號（Supabase SQL Editor 執行）
-- 密碼預設 000000，建立後可由本人至「修改密碼」頁面自行更改
-- ============================================================

DO $$
DECLARE
  uid1 uuid := gen_random_uuid();
  uid2 uuid := gen_random_uuid();
  uid3 uuid := gen_random_uuid();
BEGIN

  -- ── 元佑 ──────────────────────────────────────────────
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    uid1, 'authenticated', 'authenticated',
    'origin.yo830808@gmail.com',
    crypt('000000', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"元佑","role":"frontdesk_night","status":"active"}'::jsonb,
    now(), now(), '', '', false
  )
  ON CONFLICT (email) DO NOTHING;

  -- ── 則穎 ──────────────────────────────────────────────
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    uid2, 'authenticated', 'authenticated',
    'origin.redzeng@gmail.com',
    crypt('000000', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"則穎","role":"frontdesk_night","status":"active"}'::jsonb,
    now(), now(), '', '', false
  )
  ON CONFLICT (email) DO NOTHING;

  -- ── 慶龍 ──────────────────────────────────────────────
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    is_sso_user
  ) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    uid3, 'authenticated', 'authenticated',
    'origin.qljiang@gmail.com',
    crypt('000000', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"慶龍","role":"frontdesk_night","status":"active"}'::jsonb,
    now(), now(), '', '', false
  )
  ON CONFLICT (email) DO NOTHING;

END $$;
