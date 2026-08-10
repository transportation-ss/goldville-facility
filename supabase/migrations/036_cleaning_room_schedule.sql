-- Migration 036: 每週固定的打掃房間對照表（週一～週日，不看日期）

CREATE TABLE public.cleaning_room_schedule (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday       int NOT NULL CHECK (weekday BETWEEN 1 AND 7), -- 1=一 ... 7=日
  period        text NOT NULL CHECK (period IN ('AM','PM')),
  room_names    text[] NOT NULL DEFAULT '{}',
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (weekday, period)
);

ALTER TABLE public.cleaning_room_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取打掃房間表" ON public.cleaning_room_schedule
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "管家主管可管理打掃房間表" ON public.cleaning_room_schedule
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager')));

-- 依使用者提供的參考表（7/13～7/19 那週）建立初始資料
INSERT INTO public.cleaning_room_schedule (weekday, period, room_names) VALUES
  (1, 'AM', ARRAY['213Katsu桑','212黃醫師','215筱琳姐','216仲蘭姐','206阿斗哥(重點打掃)']),
  (1, 'PM', ARRAY['202謝大哥']),
  (2, 'AM', ARRAY['705俊玉姐','710佩琳姐','715張媽媽','611掌妹姐','713瑞綺姐']),
  (2, 'PM', ARRAY['709小蕙']),
  (3, 'AM', ARRAY['203盧大姐','209城哥','615劉哥','609秀文姐','602夏洛特']),
  (3, 'PM', ARRAY['601林大哥','708秀妹姐']),
  (4, 'AM', ARRAY['205李爸爸','210淑芬姐','211大霞姐','207阿蓮姐','208碧綢姐']),
  (4, 'PM', ARRAY['201Jason','707白英姐']),
  (5, 'AM', ARRAY['603荷英姐','605許媽媽','606海哥','608來好姐','612賴教授']),
  (5, 'PM', ARRAY['712張爸爸']),
  (6, 'AM', ARRAY['703相蓮姐','711鍾姐','607靳爺爺','610雅雯姐','206阿斗哥']),
  (6, 'PM', ARRAY['613盛老師']),
  (7, 'AM', ARRAY['603荷英姐(重點打掃)','705俊玉姐(重點打掃)']),
  (7, 'PM', ARRAY[]::text[]);
