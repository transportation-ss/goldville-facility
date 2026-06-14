-- Migration 021: 房間命名修正
-- 1. 5F 客房子房號 512-4/513-4/515-4 改名為 -7（排序放在 -6 之後）
-- 2. 1F 公共空間「烘焙坊」更名為「烘焙坊/微波爐」

UPDATE public.rooms SET name = '512-7',
  sort_order = (SELECT sort_order FROM public.rooms WHERE name = '512-6') + 1
WHERE name = '512-4';

UPDATE public.rooms SET name = '513-7',
  sort_order = (SELECT sort_order FROM public.rooms WHERE name = '513-6') + 1
WHERE name = '513-4';

UPDATE public.rooms SET name = '515-7',
  sort_order = (SELECT sort_order FROM public.rooms WHERE name = '515-6') + 1
WHERE name = '515-4';

UPDATE public.rooms SET name = '烘焙坊/微波爐'
WHERE name = '烘焙坊' AND floor = '1F' AND room_type = '公共區';
