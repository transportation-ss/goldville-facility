-- Migration 066: 管家活動月曆 — 每月公告（印在月曆最上方，例如垃圾收取時間）
-- 每月一筆；{{文字}} 會印成紅字。權限同 065：管家僅檢視，admin/manager/butler_manager/sales 可編輯。

CREATE TABLE public.butler_calendar_notes (
  ym         text PRIMARY KEY CHECK (ym ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  body       text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES public.user_profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.butler_calendar_notes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.butler_calendar_notes TO authenticated, service_role;

CREATE POLICY "管家相關角色可檢視月公告" ON public.butler_calendar_notes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid()
                   AND role IN ('admin','manager','butler_manager','sales','butler')));

CREATE POLICY "管理員主管業務可新增月公告" ON public.butler_calendar_notes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                      WHERE id = auth.uid()
                        AND role IN ('admin','manager','butler_manager','sales')));

CREATE POLICY "管理員主管業務可修改月公告" ON public.butler_calendar_notes
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid()
                   AND role IN ('admin','manager','butler_manager','sales')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                      WHERE id = auth.uid()
                        AND role IN ('admin','manager','butler_manager','sales')));

CREATE POLICY "管理員主管業務可刪除月公告" ON public.butler_calendar_notes
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid()
                   AND role IN ('admin','manager','butler_manager','sales')));
