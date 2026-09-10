-- Migration 045: 住戶新增第二順位緊急聯絡人欄位
--
-- 044 只存了第一順位，但實務上不少住戶有兩位緊急聯絡人都要能顯示/填寫。

ALTER TABLE public.butler_residents
  ADD COLUMN IF NOT EXISTS emergency_contact2_name     text,
  ADD COLUMN IF NOT EXISTS emergency_contact2_relation text,
  ADD COLUMN IF NOT EXISTS emergency_contact2_phone    text;
