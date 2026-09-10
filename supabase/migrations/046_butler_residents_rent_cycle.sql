-- Migration 046: 住戶新增租期類型欄位，供合約自動/手動續約判斷用
--
-- monthly = 月租（登入時自動續約一期）
-- yearly / other = 年租或其他（登入時跳出提醒，業務手動點擊續約）

ALTER TABLE public.butler_residents
  ADD COLUMN IF NOT EXISTS rent_cycle text CHECK (rent_cycle IN ('monthly', 'yearly', 'other'));
