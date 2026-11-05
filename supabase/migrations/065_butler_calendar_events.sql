-- Migration 065: 管家活動月曆
-- 以月為單位排活動（類似課表／活動菜單），每個活動有主標題、副標題、說明、可複選主責管家。
-- 可檢視：admin、manager、butler_manager、sales、butler；可編輯：admin、manager、butler_manager、sales。
-- owner_ids 存 user_profiles.id 陣列（日後可直接轉成管家派工）。

CREATE TABLE public.butler_calendar_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date  date NOT NULL,
  title       text NOT NULL,
  subtitle    text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  start_time  time,
  owner_ids   uuid[] NOT NULL DEFAULT '{}',
  created_by  uuid REFERENCES public.user_profiles(id),
  updated_by  uuid REFERENCES public.user_profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_butler_calendar_events_date ON public.butler_calendar_events(event_date);

ALTER TABLE public.butler_calendar_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.butler_calendar_events TO authenticated, service_role;

CREATE POLICY "管家相關角色可檢視活動月曆" ON public.butler_calendar_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid()
                   AND role IN ('admin','manager','butler_manager','sales','butler')));

CREATE POLICY "管理員主管業務可新增活動" ON public.butler_calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                      WHERE id = auth.uid()
                        AND role IN ('admin','manager','butler_manager','sales')));

CREATE POLICY "管理員主管業務可修改活動" ON public.butler_calendar_events
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid()
                   AND role IN ('admin','manager','butler_manager','sales')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                      WHERE id = auth.uid()
                        AND role IN ('admin','manager','butler_manager','sales')));

CREATE POLICY "管理員主管業務可刪除活動" ON public.butler_calendar_events
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid()
                   AND role IN ('admin','manager','butler_manager','sales')));
