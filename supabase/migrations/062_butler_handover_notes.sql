-- Migration 062: 管家交接本
-- 管家在今日任務頁寫下標題＋內文，加入交接本；交接本頁以月曆呈現，所有管家可互相查看。
-- 不綁住戶、不指派、不結案，就是單純的共用時間軸。

CREATE TABLE public.butler_handover_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_date   date NOT NULL,
  title       text NOT NULL,
  content     text NOT NULL DEFAULT '',
  author_id   uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_butler_handover_notes_date ON public.butler_handover_notes(note_date);

ALTER TABLE public.butler_handover_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取交接本" ON public.butler_handover_notes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "管家與主管可新增交接事項" ON public.butler_handover_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.user_profiles
                WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager','butler','frontdesk_day'))
  );

CREATE POLICY "作者與主管可刪除交接事項" ON public.butler_handover_notes
  FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_profiles
               WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager'))
  );
