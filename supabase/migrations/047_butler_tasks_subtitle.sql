-- 派工任務增加副標題欄位，讓主管派工時能快速看清內容（備註欄 notes 已存在，只是先前沒接 UI）
ALTER TABLE public.butler_tasks
  ADD COLUMN IF NOT EXISTS subtitle text;
