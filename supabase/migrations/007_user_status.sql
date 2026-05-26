-- ============================================================
-- Migration 007: 帳號申請審核機制
-- ============================================================

-- 1. user_profiles 新增 status 欄位
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('pending', 'active', 'disabled'));

-- 2. 現有帳號全部設為 active
UPDATE public.user_profiles SET status = 'active';

-- 3. 擴充 role 允許值（加入 nightshift、frontdesk）
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('reporter', 'technician', 'manager', 'admin', 'nightshift', 'frontdesk'));

-- 4. 讓新註冊的 user 可以自行 insert profile（status='pending'）
-- RLS 原本可能不允許 insert，補上這條政策
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. admin / manager 可以 update 任何人的 profile（用於審核）
DROP POLICY IF EXISTS "Admins can update any profile" ON public.user_profiles;
CREATE POLICY "Admins can update any profile"
  ON public.user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
