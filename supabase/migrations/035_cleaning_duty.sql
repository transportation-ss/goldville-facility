-- Migration 035: 管家清潔標籤 + 每週清潔值班自動排班

ALTER TABLE public.butler_staff_roster
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

UPDATE public.butler_staff_roster
SET tags = array_append(tags, '清潔')
WHERE schedule_name IN ('心銀','詠真','閔傑','依宸','之妤','芊嬡','敬翔','瑀潔')
  AND NOT ('清潔' = ANY(tags));

CREATE TABLE public.cleaning_duty_assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_date  date NOT NULL,
  period         text NOT NULL CHECK (period IN ('AM','PM')),
  staff_names    text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_date, period)
);

ALTER TABLE public.cleaning_duty_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取清潔值班" ON public.cleaning_duty_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "管家主管可管理清潔值班" ON public.cleaning_duty_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager')));
