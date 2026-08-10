-- Migration 034: 業務（sales）開放可新增/編輯住戶主檔

DROP POLICY IF EXISTS "管家主管可管理住戶" ON public.butler_residents;

CREATE POLICY "管家主管可管理住戶" ON public.butler_residents
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager','sales'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager','sales'))
  );
