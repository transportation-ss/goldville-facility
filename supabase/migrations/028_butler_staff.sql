-- Migration 028: 小天使（承責管家）+ 管家清單
-- 1. 住戶新增 primary_butler_id（小天使，承責管家）
-- 2. 建立 butler_staff_profiles（管家人事資料：兼職/正職、性別、入職時間、特殊技能）

ALTER TABLE public.butler_residents
  ADD COLUMN IF NOT EXISTS primary_butler_id uuid REFERENCES public.user_profiles(id);

CREATE TABLE IF NOT EXISTS public.butler_staff_profiles (
  id              uuid PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  employment_type text CHECK (employment_type IN ('full_time', 'part_time')),
  gender          text CHECK (gender IN ('male', 'female', 'other')),
  hire_date       date,
  skills          text[] NOT NULL DEFAULT '{}',  -- 司機/帶運動/活動設計/其他
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.butler_staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取管家人事資料" ON public.butler_staff_profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "管家主管可管理管家人事資料" ON public.butler_staff_profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'butler_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'butler_manager')
    )
  );
