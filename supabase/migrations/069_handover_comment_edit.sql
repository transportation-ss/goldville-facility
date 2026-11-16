-- Migration 069: 管家交接本留言可由留言者本人編輯
-- 新增 edited_at（null = 未編輯過）與 UPDATE policy（僅作者本人，且仍須是可留言角色）。
-- 主管仍只能刪除、不能改別人的留言。

ALTER TABLE public.butler_handover_comments
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

CREATE POLICY "作者可編輯自己的交接留言" ON public.butler_handover_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_profiles
                WHERE id = auth.uid()
                  AND role IN ('admin','manager','butler_manager','butler','sales','frontdesk_day'))
  );

GRANT UPDATE ON public.butler_handover_comments TO authenticated;
