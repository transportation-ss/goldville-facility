-- Migration 042: 回診案件 → 管家任務 自動同步
--
-- 「經管家確認」(claimed_at 有值) 且尚未完成/取消的回診案件，
-- 自動同步成一筆未指派的管家任務（僅提醒/備查用途）；
-- 案件被取消、退回未確認、或完成後，對應任務自動移除。
-- 用 trigger 而非 app 端程式碼，是因為寫入方可能是本站或 line-appointment-bot，
-- 兩邊都會經過同一張表，trigger 在資料庫層保證兩邊都會同步，不用各自實作一次。

CREATE OR REPLACE FUNCTION public.sync_appointment_case_to_butler_task()
RETURNS trigger AS $$
DECLARE
  v_source_ref text;
  v_should_exist boolean;
  v_resident record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.butler_tasks WHERE source_ref = 'appointment:' || OLD.id;
    RETURN OLD;
  END IF;

  v_source_ref := 'appointment:' || NEW.id;
  v_should_exist := NEW.claimed_at IS NOT NULL AND NEW.status NOT IN ('done', 'cancelled');

  IF NOT v_should_exist THEN
    DELETE FROM public.butler_tasks WHERE source_ref = v_source_ref;
    RETURN NEW;
  END IF;

  SELECT name, room INTO v_resident FROM public.butler_residents WHERE id = NEW.resident_id;

  INSERT INTO public.butler_tasks (
    task_date, start_time, space, title, notes,
    assigned_to, assigned_to_ids, status, source, source_ref
  ) VALUES (
    NEW.appointment_date,
    NEW.appointment_time,
    v_resident.room,
    '回診：' || coalesce(v_resident.name, '住戶'),
    nullif(coalesce(NEW.appointment_location, '') ||
      case when NEW.notes is not null and NEW.notes <> '' then E'\n備註：' || NEW.notes else '' end, ''),
    NULL, '{}', 'pending', 'appointment', v_source_ref
  )
  ON CONFLICT (source_ref) DO UPDATE SET
    task_date  = EXCLUDED.task_date,
    start_time = EXCLUDED.start_time,
    space      = EXCLUDED.space,
    title      = EXCLUDED.title,
    notes      = EXCLUDED.notes,
    updated_at = now();
  -- 不動 assigned_to / assigned_to_ids / status：管家可能已手動接下或完成，回診案件異動不應打回未指派或改動進度

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_appointment_case_to_butler_task ON public.appointment_cases;
CREATE TRIGGER trg_sync_appointment_case_to_butler_task
  AFTER INSERT OR UPDATE OR DELETE ON public.appointment_cases
  FOR EACH ROW EXECUTE FUNCTION public.sync_appointment_case_to_butler_task();
