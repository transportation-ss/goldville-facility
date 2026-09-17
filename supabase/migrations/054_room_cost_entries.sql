-- Migration 054: 房間成本（每房每月一筆總成本，預設01房28000/其他15000）

CREATE TABLE public.room_cost_entries (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id       uuid NOT NULL REFERENCES public.rooms(id),
  period_month  date NOT NULL,  -- 統一存當月 1 號
  amount        numeric NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES auth.users(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id),
  UNIQUE (room_id, period_month)
);

CREATE INDEX idx_room_cost_entries_period ON public.room_cost_entries(period_month);

ALTER TABLE public.room_cost_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting manage room cost entries" ON public.room_cost_entries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')));
