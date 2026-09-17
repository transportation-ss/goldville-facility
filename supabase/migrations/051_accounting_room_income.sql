-- Migration 051: 會計模組 - 房間費率表（可編輯+留log）與房間收入逐房登錄

-- 費率表（單一生效版本，逐欄可編輯）
CREATE TABLE public.room_rate_config (
  id                 integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  weekly_low         numeric,          -- 週租-2F/6F/7F
  monthly_low        numeric NOT NULL DEFAULT 59800,  -- 月租-2F/6F/7F
  yearly_low         numeric NOT NULL DEFAULT 51000,  -- 年租-2F/6F/7F（月費）
  core_member_low    numeric,          -- 核心成員-2F/6F/7F（先留空）
  monthly_high       numeric NOT NULL DEFAULT 63000,  -- 月租-3F/5F（僅月租）
  care_light         numeric NOT NULL DEFAULT 5000,   -- 照顧包-輕度（參考）
  care_medium        numeric NOT NULL DEFAULT 10000,  -- 照顧包-中度（參考）
  care_medium_heavy  numeric NOT NULL DEFAULT 15000,  -- 照顧包-中重度（參考）
  care_heavy         numeric NOT NULL DEFAULT 20000,  -- 照顧包-重度（參考）
  second_family      numeric NOT NULL DEFAULT 33000,  -- 第二人-家屬
  second_caregiver   numeric NOT NULL DEFAULT 24000,  -- 第二人-看護
  year_utility       numeric NOT NULL DEFAULT 3000,   -- 年租另計水電費
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         uuid REFERENCES auth.users(id)
);

INSERT INTO public.room_rate_config (id, weekly_low) VALUES (1, 19800);

-- 費率表編輯紀錄
CREATE TABLE public.room_rate_config_log (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changed_by  uuid REFERENCES auth.users(id),
  old_values  jsonb NOT NULL,
  new_values  jsonb NOT NULL
);

-- 特殊房型固定月租（每層01房，家庭房，內含二人），依房號覆蓋上方一般費率
CREATE TABLE public.room_rate_overrides (
  room_name   text PRIMARY KEY,  -- 對應 rooms.name
  monthly_price numeric NOT NULL,
  note        text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id)
);

INSERT INTO public.room_rate_overrides (room_name, monthly_price, note) VALUES
  ('301', 120000, '01房-3F'),
  ('501', 120000, '01房-5F'),
  ('201', 112000, '01房-2F'),
  ('601', 112000, '01房-6F'),
  ('701', 112000, '01房-7F');

CREATE TABLE public.room_rate_override_log (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_name   text NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changed_by  uuid REFERENCES auth.users(id),
  old_price   numeric,
  new_price   numeric NOT NULL
);

-- 房間收入逐房登錄（每房每月一筆：房費 + 固定加值服務 + 附加加值服務）
CREATE TABLE public.room_income_entries (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id                uuid NOT NULL REFERENCES public.rooms(id),
  period_month           date NOT NULL,  -- 統一存當月 1 號
  billing_cycle          text NOT NULL CHECK (billing_cycle IN ('年租', '月租', '週租', '試住', '核心成員')),
  first_person_fee       numeric NOT NULL DEFAULT 0,
  second_person_fee      numeric NOT NULL DEFAULT 0,
  second_person_category text,     -- 家屬 / 看護 / 其他，可空
  caregiver_cohabiting   boolean NOT NULL DEFAULT false,  -- 照顧者同住加註
  utility_fee            numeric NOT NULL DEFAULT 0,
  fixed_services         jsonb NOT NULL DEFAULT '[]',  -- 固定加值服務 [{item, amount}]
  addon_services         jsonb NOT NULL DEFAULT '[]',  -- 附加加值服務 [{item, amount}]
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  created_by             uuid REFERENCES auth.users(id),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  updated_by             uuid REFERENCES auth.users(id),
  UNIQUE (room_id, period_month)
);

CREATE INDEX idx_room_income_entries_room ON public.room_income_entries(room_id);
CREATE INDEX idx_room_income_entries_period ON public.room_income_entries(period_month);

-- RLS
ALTER TABLE public.room_rate_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_rate_config_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_rate_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_rate_override_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_income_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accounting read rate config" ON public.room_rate_config
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')));

CREATE POLICY "accounting update rate config" ON public.room_rate_config
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')));

CREATE POLICY "accounting read rate config log" ON public.room_rate_config_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')));

CREATE POLICY "accounting insert rate config log" ON public.room_rate_config_log
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')));

CREATE POLICY "accounting read rate overrides" ON public.room_rate_overrides
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')));

CREATE POLICY "accounting manage rate overrides" ON public.room_rate_overrides
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')));

CREATE POLICY "accounting read rate override log" ON public.room_rate_override_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')));

CREATE POLICY "accounting insert rate override log" ON public.room_rate_override_log
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')));

CREATE POLICY "accounting manage room income entries" ON public.room_income_entries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accounting')));
