-- Migration 044: 住戶新增緊急聯絡人欄位（MVP：只存第一順位聯絡人）
--
-- 來源 Google Sheet 每位住戶最多有三組緊急聯絡人，但列表要輸出/顯示用途
-- 只需要「出事時打第一通電話」，多存兩組會增加表格寬度跟維護成本，
-- 之後真的有需要再加 emergency_contact2_* / emergency_contact3_* 也不遲。

ALTER TABLE public.butler_residents
  ADD COLUMN IF NOT EXISTS emergency_contact_name     text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relation text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone    text;
