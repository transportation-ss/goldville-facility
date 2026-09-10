-- Migration 043: 修正回診同步任務的 space 欄位，改用「房號 姓名」格式
--
-- 問題：042 的 space 只填房號，跟清潔任務的慣例（space = 房號+姓名）不一致，
-- 導致只顯示 space 欄位的畫面（今日/週檢視/歷史紀錄的房號小標籤）只看得到房號看不到長輩姓名。
-- title 本身其實一直都有正確帶姓名，這裡只補上 space。

CREATE OR REPLACE FUNCTION public.sync_appointment_case_to_butler_task()
RETURNS trigger AS $$
DECLARE
  v_source_ref text;
  v_should_exist boolean;
  v_resident record;
  v_space text;
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
  v_space := trim(both ' ' from coalesce(v_resident.room, '') || ' ' || coalesce(v_resident.name, ''));

  INSERT INTO public.butler_tasks (
    task_date, start_time, space, title, notes,
    assigned_to, assigned_to_ids, status, source, source_ref
  ) VALUES (
    NEW.appointment_date,
    NEW.appointment_time,
    nullif(v_space, ''),
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
