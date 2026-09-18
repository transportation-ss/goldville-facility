-- Migration 057: 共用成本池（住房池／全館池，每月每池一筆，內含細項 items，計算毛利時依房數分攤）
CREATE TABLE public.shared_cost_entries (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_month  date NOT NULL,  -- 統一存當月 1 號
  pool_type     text NOT NULL CHECK (pool_type IN ('occupied', 'all')),
  items         jsonb NOT NULL DEFAULT '[]',  -- [{ item: string; amount: number }]
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id),
  UNIQUE (period_month, pool_type)
);

CREATE INDEX idx_shared_cost_entries_period ON public.shared_cost_entries(period_month);

ALTER TABLE public.shared_cost_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting manage shared cost entries" ON public.shared_cost_entries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')));
