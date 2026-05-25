CREATE TABLE public.emergency_manuals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  floor           text NOT NULL,
  sub_location    text,
  equipment_name  text,
  issue_desc      text,
  repair_method   text,
  vendor_phone    text,
  sort_order      int NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES public.user_profiles(id)
);

CREATE INDEX idx_emergency_manuals_floor ON public.emergency_manuals(floor);
CREATE INDEX idx_emergency_manuals_sort  ON public.emergency_manuals(sort_order);

ALTER TABLE public.emergency_manuals ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_select ON public.emergency_manuals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY allow_all ON public.emergency_manuals
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('technician','manager','admin')
    )
  );