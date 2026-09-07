-- Migration 038: 帳號審核政策補上 butler_manager
-- 原因：帳號管理頁面的核准/拒絕實際會用到的角色包含 butler_manager（例如邱阿喵、涵涵、芒果），
-- 但 007 當初的 RLS 政策只允許 admin/manager，butler_manager 按核准會被 RLS 靜默擋下（0 筆更新、
-- 前端沒有錯誤處理，看起來像成功但資料庫沒真的改到）。

DROP POLICY IF EXISTS "Admins can update any profile" ON public.user_profiles;
CREATE POLICY "Admins can update any profile"
  ON public.user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'butler_manager')
    )
  );
