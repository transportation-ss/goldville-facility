-- Migration 030: 管家人員名冊（三個名字欄位 + 帳號連結）

DROP TABLE IF EXISTS public.butler_staff_roster;

CREATE TABLE public.butler_staff_roster (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        text NOT NULL,
  nickname         text,
  schedule_name    text,
  role_type        text NOT NULL CHECK (role_type IN ('butler_manager', 'butler')),
  employment_type  text NOT NULL CHECK (employment_type IN ('full_time', 'part_time')),
  hire_date        date,
  user_profile_id  uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.butler_staff_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取管家名冊" ON public.butler_staff_roster
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "管家主管可管理管家名冊" ON public.butler_staff_roster
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager')));

INSERT INTO public.butler_staff_roster (full_name, role_type, employment_type, hire_date) VALUES
  ('陳奕翰', 'butler_manager', 'full_time', '2022-09-12'),
  ('林翊涵', 'butler_manager', 'full_time', '2023-03-14'),
  ('王湘綾', 'butler',         'full_time', '2023-09-05'),
  ('曾日暘', 'butler',         'full_time', '2024-04-22'),
  ('李依宸', 'butler',         'full_time', '2025-11-03'),
  ('王靖雅', 'butler',         'part_time', '2023-12-05'),
  ('林怡秀', 'butler',         'part_time', '2023-11-21'),
  ('陳梓晴', 'butler',         'part_time', '2024-01-01'),
  ('楊詠真', 'butler',         'part_time', '2024-01-24'),
  ('洪敬翔', 'butler',         'part_time', '2025-03-13'),
  ('王心銀', 'butler',         'part_time', '2024-09-05'),
  ('巫政哲', 'butler',         'part_time', '2025-01-09'),
  ('李芊嬡', 'butler',         'part_time', '2025-04-21'),
  ('紀柳亘', 'butler',         'part_time', '2025-06-02'),
  ('洪玟玲', 'butler',         'part_time', '2025-09-09'),
  ('蔡瑀潔', 'butler',         'part_time', '2025-12-18'),
  ('陳滋瑀', 'butler',         'part_time', '2026-03-17'),
  ('張家熏', 'butler',         'part_time', '2026-05-04'),
  ('李姵庭', 'butler',         'part_time', '2026-05-05');

-- 自動連結涵涵帳號到林翊涵名冊
UPDATE public.butler_staff_roster
SET user_profile_id = (SELECT id FROM public.user_profiles WHERE display_name = '涵涵')
WHERE full_name = '林翊涵'
  AND (SELECT id FROM public.user_profiles WHERE display_name = '涵涵') IS NOT NULL;
