-- Migration 063: 管家交接本開放業務（sales）新增交接事項
-- 可使用者：butler、butler_manager、sales、manager、admin（frontdesk_day 沿用原設定）

DROP POLICY "管家與主管可新增交接事項" ON public.butler_handover_notes;

CREATE POLICY "管家主管業務可新增交接事項" ON public.butler_handover_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_profiles
                WHERE id = auth.uid()
                  AND role IN ('admin','manager','butler_manager','butler','sales','frontdesk_day'))
  );
