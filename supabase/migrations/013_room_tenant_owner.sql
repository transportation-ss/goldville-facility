-- Migration 013: 房間登錄加入住戶與房東欄位
ALTER TABLE public.room_inventory
  ADD COLUMN IF NOT EXISTS tenant_name text,
  ADD COLUMN IF NOT EXISTS owner_name  text;
