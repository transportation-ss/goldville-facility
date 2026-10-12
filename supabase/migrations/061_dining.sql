-- Migration 061: 用餐排桌／報到
-- dining_tables：桌位（全館共用，座標為畫布百分比）
-- meal_sessions：某日某餐次（早/午/晚）
-- meal_attendees：該餐次的用餐者（長輩或訪客），status: expected / declined / checked_in

CREATE TABLE public.dining_tables (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  capacity    int  NOT NULL DEFAULT 4 CHECK (capacity > 0),
  shape       text NOT NULL DEFAULT 'round' CHECK (shape IN ('round', 'rect')),
  pos_x       numeric NOT NULL DEFAULT 10,
  pos_y       numeric NOT NULL DEFAULT 10,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.meal_sessions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date         date NOT NULL,
  meal_type            text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  slot                 int  NOT NULL DEFAULT 1,  -- 場次序號：早餐 1~4 梯，午/晚餐 1~2 梯
  start_at             timestamptz NOT NULL,
  end_at               timestamptz NOT NULL,
  confirm_deadline_at  timestamptz NOT NULL,
  headcount_warn       int,
  alerted_confirm_at   timestamptz,
  alerted_late_at      timestamptz,
  alerted_end_at       timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_date, meal_type, slot)
);

CREATE TABLE public.meal_attendees (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid NOT NULL REFERENCES public.meal_sessions(id) ON DELETE CASCADE,
  resident_id    uuid REFERENCES public.butler_residents(id) ON DELETE CASCADE,
  guest_name     text,
  table_id       uuid REFERENCES public.dining_tables(id) ON DELETE SET NULL,
  status         text NOT NULL DEFAULT 'expected' CHECK (status IN ('expected', 'declined', 'checked_in')),
  checked_in_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (resident_id IS NOT NULL OR guest_name IS NOT NULL),
  UNIQUE (session_id, resident_id)
);

CREATE INDEX idx_meal_attendees_session ON public.meal_attendees(session_id);
CREATE INDEX idx_meal_attendees_table   ON public.meal_attendees(table_id);

ALTER TABLE public.dining_tables   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_attendees  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "登入者可讀取桌位" ON public.dining_tables FOR SELECT TO authenticated USING (true);
CREATE POLICY "登入者可讀取餐次" ON public.meal_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "登入者可讀取用餐者" ON public.meal_attendees FOR SELECT TO authenticated USING (true);

CREATE POLICY "管家與主管可管理桌位" ON public.dining_tables
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager','butler','frontdesk_day')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager','butler','frontdesk_day')));

CREATE POLICY "管家與主管可管理餐次" ON public.meal_sessions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager','butler','frontdesk_day')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager','butler','frontdesk_day')));

CREATE POLICY "管家與主管可管理用餐者" ON public.meal_attendees
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager','butler','frontdesk_day')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles
                 WHERE id = auth.uid() AND role IN ('admin','manager','butler_manager','butler','frontdesk_day')));

-- 預設桌位：2 排 × 7 桌（A1~A7、B1~B7），每桌 4 人。座標為畫布百分比，可在畫面上拖曳調整。
INSERT INTO public.dining_tables (name, capacity, shape, pos_x, pos_y)
SELECT r.row_name || n, 4, 'rect', 4 + (n - 1) * 13.5, r.y
FROM (VALUES ('A', 25), ('B', 60)) AS r(row_name, y), generate_series(1, 7) AS n;

-- C1：烘焙坊區域的獨立桌，可坐 6 人。位置放在圖面右下角，可拖曳調整。
INSERT INTO public.dining_tables (name, capacity, shape, pos_x, pos_y)
VALUES ('C1', 6, 'rect', 82, 85);
