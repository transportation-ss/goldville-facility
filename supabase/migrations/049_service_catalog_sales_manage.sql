-- Migration 049: sales 也能管理加值服務目錄（新增/停用/刪除服務項目）

DROP POLICY "管家主管可管理服務目錄" ON public.service_catalog;

CREATE POLICY "管家主管可管理服務目錄" ON public.service_catalog
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'butler_manager', 'sales'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role IN ('admin', 'manager', 'butler_manager', 'sales'))
  );
