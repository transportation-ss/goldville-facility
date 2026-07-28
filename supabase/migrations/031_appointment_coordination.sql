-- Migration 031: 回診協調（管家 LINE bot 用，經 service role 存取，非透過站台登入）

CREATE TABLE public.appointment_cases (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id          uuid NOT NULL REFERENCES public.butler_residents(id),
  status               text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'matched', 'dispatched', 'notified', 'done', 'cancelled')),
  appointment_date     date NOT NULL,
  appointment_time     time,
  appointment_location text,
  requested_by_line_id text NOT NULL,
  requested_at         timestamptz NOT NULL DEFAULT now(),
  matched_staff        text,
  matched_time         timestamptz,
  matched_by_line_id   text,
  notes                text,
  trip_id              text,            -- line-transport-dispatch 的 tripId
  line_group_id        text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ac_status ON public.appointment_cases(status);
CREATE INDEX idx_ac_resident ON public.appointment_cases(resident_id);

ALTER TABLE public.appointment_cases ENABLE ROW LEVEL SECURITY;
-- 無 policy：僅供 line-appointment-bot 服務以 service role key 存取，不開放給站台登入使用者

CREATE TABLE public.conversation_states (
  line_user_id  text PRIMARY KEY,
  flow          text NOT NULL CHECK (flow IN ('new_case', 'match_input')),
  step          text NOT NULL,
  draft_data    jsonb NOT NULL DEFAULT '{}',
  case_id       uuid REFERENCES public.appointment_cases(id),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conversation_states ENABLE ROW LEVEL SECURITY;
-- 無 policy：僅供 line-appointment-bot 服務以 service role key 存取
