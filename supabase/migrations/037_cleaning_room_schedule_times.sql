-- Migration 037: 打掃房間表改成每筆紀錄各自帶時間，不再依賴固定的 5(AM)/2(PM) 節次陣列位置
-- 原因：真實白板（掃房表 sheet）每天時段數與時間都不固定（例如週四下午是 15:00 不是 15:30，
-- 同一時段還可能疊多人），固定陣列位置放不下這種資料，改成 room_names[i] 對應 room_times[i]。

ALTER TABLE public.cleaning_room_schedule ADD COLUMN room_times text[] NOT NULL DEFAULT '{}';

-- 既有資料是照 036 當初寫入時的固定節次順序建立的，回填對應時間
UPDATE public.cleaning_room_schedule SET room_times = (
  SELECT array_agg(t ORDER BY ord)
  FROM unnest(
    CASE period
      WHEN 'AM' THEN ARRAY['09:30','10:00','10:30','11:00','11:30']
      ELSE ARRAY['15:30','16:00']
    END
  ) WITH ORDINALITY AS s(t, ord)
  WHERE ord <= array_length(room_names, 1)
)
WHERE array_length(room_names, 1) > 0;
