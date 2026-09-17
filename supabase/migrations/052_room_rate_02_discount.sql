-- Migration 052：特殊房型費率調整
-- 1. 01房價格改成依租期分開存（原本誤設為不分租期的單一月租價）
-- 2. 02房優惠：既定費率基礎上固定扣除，不分租期
-- 3. 701/702 老闆自住，不收費

ALTER TABLE public.room_rate_overrides
  ALTER COLUMN monthly_price DROP NOT NULL,
  ADD COLUMN yearly_price numeric,
  ADD COLUMN weekly_price numeric,
  ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;

-- 改用通用 diff log（比照 room_rate_config_log 的作法），取代原本只認 monthly_price 的 old_price/new_price
ALTER TABLE public.room_rate_override_log
  DROP COLUMN old_price,
  DROP COLUMN new_price,
  ADD COLUMN old_values jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN new_values jsonb NOT NULL DEFAULT '{}';

-- 修正：201/601 實際是年租特價 100000/月，不是原先假設的月租 112000
UPDATE public.room_rate_overrides SET monthly_price = NULL, yearly_price = 100000, note = '01房-2F（年租特價）' WHERE room_name = '201';
UPDATE public.room_rate_overrides SET monthly_price = NULL, yearly_price = 100000, note = '01房-6F（年租特價）' WHERE room_name = '601';
UPDATE public.room_rate_overrides SET note = '01房-3F（月租）' WHERE room_name = '301';
UPDATE public.room_rate_overrides SET note = '01房-5F（月租）' WHERE room_name = '501';

-- 701/702：老闆自住，不收費（各租期一律 0）
UPDATE public.room_rate_overrides SET monthly_price = 0, yearly_price = 0, weekly_price = 0, note = '老闆自住，不收費' WHERE room_name = '701';
INSERT INTO public.room_rate_overrides (room_name, monthly_price, yearly_price, weekly_price, note) VALUES
  ('702', 0, 0, 0, '老闆自住，不收費');

-- 02房優惠（202/302/502/602；702已是老闆自住不收費，不重複套用折扣）
INSERT INTO public.room_rate_overrides (room_name, discount_amount, note) VALUES
  ('202', 2000, '02房優惠'),
  ('302', 2000, '02房優惠'),
  ('502', 2000, '02房優惠'),
  ('602', 2000, '02房優惠');
