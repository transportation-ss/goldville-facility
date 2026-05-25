CREATE TABLE public.room_inventory (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id         uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  snapshot_date   date NOT NULL DEFAULT CURRENT_DATE,
  is_initial      boolean NOT NULL DEFAULT false,
  change_reason   text,
  bed_type        text,
  wardrobe            boolean,
  fridge_size         text,
  sofa_type           text,
  washer              boolean,
  ac_count            int,
  has_accessible      boolean,
  accessible_notes    text,
  tv_count            int,
  dresser_6drawer     boolean,
  bedside_table_count int,
  headboard_type      text,
  kettle              boolean,
  desk                boolean,
  chair_count         int,
  trash_bin_count     int,
  drying_rack         boolean,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES public.user_profiles(id)
);

CREATE UNIQUE INDEX room_inventory_initial_unique
  ON public.room_inventory(room_id) WHERE is_initial = true;

CREATE INDEX idx_room_inventory_room_date
  ON public.room_inventory(room_id, snapshot_date DESC);

ALTER TABLE public.room_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_select ON public.room_inventory
  FOR SELECT TO authenticated USING (true);

CREATE POLICY allow_all ON public.room_inventory
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('technician','manager','admin')
    )
  );

INSERT INTO public.rooms (name, floor, room_type, sort_order) VALUES
  ('201','2F','客房',201),('202','2F','客房',202),('203','2F','客房',203),
  ('205','2F','客房',205),('206','2F','客房',206),('207','2F','客房',207),
  ('208','2F','客房',208),('209','2F','客房',209),('210','2F','客房',210),
  ('211','2F','客房',211),('212','2F','客房',212),('213','2F','客房',213),
  ('215','2F','客房',215),('216','2F','客房',216),
  ('301','3F','客房',301),('302','3F','客房',302),('303','3F','客房',303),
  ('305','3F','客房',305),('306','3F','客房',306),('307','3F','客房',307),
  ('308','3F','客房',308),('309','3F','客房',309),('310','3F','客房',310),
  ('311','3F','客房',311),('312','3F','客房',312),('313','3F','客房',313),
  ('315','3F','客房',315),('316','3F','客房',316),
  ('501','5F','客房',501),('502','5F','客房',502),('503','5F','客房',503),
  ('505','5F','客房',505),('506','5F','客房',506),('507','5F','客房',507),
  ('508','5F','客房',508),('509','5F','客房',509),('510','5F','客房',510),
  ('511','5F','客房',511),('512','5F','客房',512),('513','5F','客房',513),
  ('515','5F','客房',515),
  ('601','6F','客房',601),('602','6F','客房',602),('603','6F','客房',603),
  ('605','6F','客房',605),('606','6F','客房',606),('607','6F','客房',607),
  ('608','6F','客房',608),('609','6F','客房',609),('610','6F','客房',610),
  ('611','6F','客房',611),('612','6F','客房',612),('613','6F','客房',613),
  ('615','6F','客房',615),
  ('701','7F','客房',701),('702','7F','客房',702),('703','7F','客房',703),
  ('705','7F','客房',705),('706','7F','客房',706),('707','7F','客房',707),
  ('708','7F','客房',708),('709','7F','客房',709),('710','7F','客房',710),
  ('711','7F','客房',711),('712','7F','客房',712),('713','7F','客房',713),
  ('715','7F','客房',715)
ON CONFLICT DO NOTHING;