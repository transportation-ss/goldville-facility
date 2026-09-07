-- Migration 040: 派工任務／服務紀錄 服務模組分類（用藥管理／清潔掃房／陪伴服務／其他）
-- 原因：管家主管派工時可先選好模組，管家完成任務後產生的服務紀錄會帶著同一個
-- category，未來做週報/月報時才能用 category 把同一位住戶在時間範圍內的
-- 同模組項目直接兜起來，不用逐筆翻紀錄手動分類。

ALTER TABLE public.butler_tasks
  ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('medication', 'cleaning', 'companion', 'other'));

ALTER TABLE public.butler_service_logs
  ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('medication', 'cleaning', 'companion', 'other'));
