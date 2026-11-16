-- Migration 071: 管家交接本事項新增「主題」欄位
-- 純文字、可為 null（舊資料沒有主題）。主題清單放在前端 handover/topics.ts，不做 CHECK，
-- 之後增減主題不需要再跑 migration。
-- 070 的欄位層級 GRANT 只開放 title/content/edited_at，作者要能改主題需追加 topic。

ALTER TABLE public.butler_handover_notes
  ADD COLUMN IF NOT EXISTS topic text;

GRANT UPDATE (topic) ON public.butler_handover_notes TO authenticated;
