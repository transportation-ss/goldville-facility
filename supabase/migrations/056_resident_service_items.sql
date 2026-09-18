-- Migration 056: 照顧包細項（掛在單一住戶的單一 resident_services 底下，個人化規劃，不共用）

CREATE TABLE public.resident_service_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_service_id uuid NOT NULL REFERENCES public.resident_services(id) ON DELETE CASCADE,
  title               text NOT NULL,   -- 工作內容，例如「陪伴服務」「用藥管理」
  subtitle            text,            -- 副標題
  notes               text,            -- 備註
  sort_order          int NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  created_by          uuid REFERENCES public.user_profiles(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rsi_resident_service ON public.resident_service_items(resident_service_id);

ALTER TABLE public.resident_service_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取照顧包細項" ON public.resident_service_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "管家主管可管理照顧包細項" ON public.resident_service_items
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'butler_manager'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'butler_manager'))
  );
