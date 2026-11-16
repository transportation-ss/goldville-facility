-- Migration 072: 交接本主題型列表用的索引（依主題篩選、由新到舊）
-- 非必要：資料量小時不加也不影響功能，只是讓資料累積後主題篩選 + 排序仍然快。
CREATE INDEX IF NOT EXISTS butler_handover_notes_topic_created_idx
  ON public.butler_handover_notes (topic, created_at DESC);
