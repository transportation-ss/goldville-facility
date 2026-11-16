-- Migration 070: 管家交接本主文可由作者本人編輯（標題＋內文）
-- 新增 edited_at（null = 未編輯過）與 UPDATE policy（僅作者本人，且仍須是可新增交接的角色）。
-- 主管仍只能刪除、不能改別人的主文（與 069 留言規則一致）。
-- 欄位層級授權：只開放 title / content / edited_at，其餘欄位（author_id、note_date…）不可由前端改。

ALTER TABLE public.butler_handover_notes
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

CREATE POLICY "作者可編輯自己的交接事項" ON public.butler_handover_notes
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_profiles
                WHERE id = auth.uid()
                  AND role IN ('admin','manager','butler_manager','butler','sales','frontdesk_day'))
  );

GRANT UPDATE (title, content, edited_at) ON public.butler_handover_notes TO authenticated;
