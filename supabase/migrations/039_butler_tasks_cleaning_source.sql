-- Migration 039: 清潔值班表 → 管家任務 的來源追蹤欄位
-- 原因：手動按鈕會把「清潔值班表」的每個房間清潔項目轉成 butler_tasks 的一筆任務，
-- 需要一個穩定的 key（source_ref）判斷「這筆房間清潔項目是否已經產生過任務」，
-- 避免按鈕重複點擊造成任務重複產生。

ALTER TABLE public.butler_tasks
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_ref text UNIQUE;
