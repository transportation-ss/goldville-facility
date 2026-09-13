-- Migration 048: 加值服務 / 照顧包

-- ── 服務項目目錄（後台維護：固定照顧包 + 單項加值服務）──────
CREATE TABLE public.service_catalog (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  type        text NOT NULL DEFAULT 'addon'
              CHECK (type IN ('package', 'addon')),  -- package: 固定月費照顧包／addon: 單項加值服務
  price       numeric NOT NULL DEFAULT 0,
  unit        text,                                  -- 選填，純顯示用，例如「次」「小時」
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES public.user_profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取服務目錄" ON public.service_catalog
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "管家主管可管理服務目錄" ON public.service_catalog
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'butler_manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'butler_manager'))
  );

-- ── 住戶掛勾的加值服務（購買/訂閱紀錄）────────────────────
CREATE TABLE public.resident_services (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id        uuid NOT NULL REFERENCES public.butler_residents(id) ON DELETE CASCADE,
  service_catalog_id uuid NOT NULL REFERENCES public.service_catalog(id),
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  start_date         date,
  end_date           date,
  notes              text,
  created_by         uuid REFERENCES public.user_profiles(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rs_resident ON public.resident_services(resident_id);
CREATE INDEX idx_rs_catalog  ON public.resident_services(service_catalog_id);

ALTER TABLE public.resident_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取住戶加值服務" ON public.resident_services
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "管家主管可管理住戶加值服務" ON public.resident_services
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'butler_manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'butler_manager'))
  );

-- ── 派工任務：掛勾加值服務 + 費用欄位 ──────────────────────
-- resident_service_id 掛了哪個住戶的哪個加值服務／照顧包，該筆派工就會算在該住戶的服務月曆與費用內；
-- fee 對所有派工開放（不限加值服務），供未來月結統計使用。
ALTER TABLE public.butler_tasks
  ADD COLUMN resident_service_id uuid REFERENCES public.resident_services(id),
  ADD COLUMN fee numeric;

CREATE INDEX idx_bt_resident_service ON public.butler_tasks(resident_service_id);
