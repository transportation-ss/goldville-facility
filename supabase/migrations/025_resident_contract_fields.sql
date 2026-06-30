-- Migration 025: 住戶合約/餐點/方案欄位

ALTER TABLE public.butler_residents
  ADD COLUMN IF NOT EXISTS contract_start    date,
  ADD COLUMN IF NOT EXISTS contract_end      date,
  ADD COLUMN IF NOT EXISTS meal_plan         text,   -- 早餐 / 午餐 / 晚餐
  ADD COLUMN IF NOT EXISTS membership_plan   text;   -- 樂活長青 / 安心家園 / 核心會員
