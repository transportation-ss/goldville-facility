-- Migration 029: 管家人事資料新增「班表姓名」對照欄位
-- 用途：帳號顯示名稱與 Google Sheet 班表上的姓名可能不同（例如 翊涵＝涵涵），
-- 設定 schedule_alias 後，同步班表時優先用這個名字比對。

ALTER TABLE public.butler_staff_profiles
  ADD COLUMN IF NOT EXISTS schedule_alias text;
