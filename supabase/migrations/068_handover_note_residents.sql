-- Migration 068: 管家交接本 連結住戶
-- 一則交接事項可連結多位住戶（連結表）；住戶頁以此顯示「相關交接」。
-- 連結由人工挑選建立，作者與主管可事後補連／取消連結。

CREATE TABLE public.butler_handover_note_residents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id      uuid NOT NULL REFERENCES public.butler_handover_notes(id) ON DELETE CASCADE,
  resident_id  uuid NOT NULL REFERENCES public.butler_residents(id) ON DELETE CASCADE,
  created_by   uuid NOT NULL REFERENCES public.user_profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (note_id, resident_id)
);

CREATE INDEX idx_hnr_resident ON public.butler_handover_note_residents(resident_id);
CREATE INDEX idx_hnr_note     ON public.butler_handover_note_residents(note_id);

ALTER TABLE public.butler_handover_note_residents ENABLE ROW LEVEL SECURITY;

-- 2026-10-30 起新表需自行 GRANT
GRANT SELECT, INSERT, UPDATE, DELETE ON public.butler_handover_note_residents TO authenticated, service_role;

CREATE POLICY "登入者可讀取交接住戶連結" ON public.butler_handover_note_residents
  FOR SELECT TO authenticated USING (true);

-- 新增連結：該交接事項的作者，或主管
CREATE POLICY "作者與主管可新增交接住戶連結" ON public.butler_handover_note_residents
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.butler_handover_notes n
              WHERE n.id = note_id AND n.author_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager'))
    )
  );

-- 取消連結：該交接事項的作者，或主管
CREATE POLICY "作者與主管可刪除交接住戶連結" ON public.butler_handover_note_residents
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.butler_handover_notes n
            WHERE n.id = note_id AND n.author_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_profiles
               WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager'))
  );
