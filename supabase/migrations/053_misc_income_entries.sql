-- Migration 053: 非房間收入（未入住/無對應房間的加值服務收入等）

CREATE TABLE public.misc_income_entries (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_month  date NOT NULL,  -- 統一存當月 1 號
  resident_name text NOT NULL,
  category      text NOT NULL DEFAULT '未入住的服務費用',
  amount        numeric NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_misc_income_entries_period ON public.misc_income_entries(period_month);

ALTER TABLE public.misc_income_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting manage misc income" ON public.misc_income_entries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')));
