-- Migration 064: 管家交接本 留言（最多三層）與點讚
-- 層級：交接事項（第一層）→ 留言（第二層，parent_id IS NULL）→ 回覆（第三層，parent_id 指向第二層留言）
-- 回覆第三層的留言時，仍掛在同一則第二層留言下，以 reply_to_id 記錄被回覆的留言（畫面上以引用呈現）。
-- 點讚可對交接事項或留言，note_id / comment_id 擇一。

CREATE TABLE public.butler_handover_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id     uuid NOT NULL REFERENCES public.butler_handover_notes(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES public.butler_handover_comments(id) ON DELETE CASCADE,
  reply_to_id uuid REFERENCES public.butler_handover_comments(id) ON DELETE SET NULL,
  content     text NOT NULL,
  author_id   uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_butler_handover_comments_note ON public.butler_handover_comments(note_id);

CREATE TABLE public.butler_handover_likes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id     uuid REFERENCES public.butler_handover_notes(id) ON DELETE CASCADE,
  comment_id  uuid REFERENCES public.butler_handover_comments(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((note_id IS NOT NULL)::int + (comment_id IS NOT NULL)::int = 1)
);

CREATE UNIQUE INDEX uq_handover_like_note    ON public.butler_handover_likes(note_id, user_id)    WHERE note_id IS NOT NULL;
CREATE UNIQUE INDEX uq_handover_like_comment ON public.butler_handover_likes(comment_id, user_id) WHERE comment_id IS NOT NULL;

ALTER TABLE public.butler_handover_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.butler_handover_likes    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取交接留言" ON public.butler_handover_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "管家主管業務可新增交接留言" ON public.butler_handover_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_profiles
                WHERE id = auth.uid()
                  AND role IN ('admin','manager','butler_manager','butler','sales','frontdesk_day'))
  );

CREATE POLICY "作者與主管可刪除交接留言" ON public.butler_handover_comments
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles
               WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager'))
  );

CREATE POLICY "登入者可讀取交接點讚" ON public.butler_handover_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "管家主管業務可點讚" ON public.butler_handover_likes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_profiles
                WHERE id = auth.uid()
                  AND role IN ('admin','manager','butler_manager','butler','sales','frontdesk_day'))
  );

CREATE POLICY "自己可收回讚" ON public.butler_handover_likes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
