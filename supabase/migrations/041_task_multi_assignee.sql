-- 同一筆任務（尤其是清潔任務）可能同時派給兩人以上共同負責，
-- 任一人點選完成即算完成；assigned_to 保留給舊邏輯（顯示用/單一認領），
-- assigned_to_ids 才是「這筆任務對誰可見、誰能接」的權威欄位。
alter table butler_tasks add column if not exists assigned_to_ids uuid[] not null default '{}';

update butler_tasks
set assigned_to_ids = array[assigned_to]::uuid[]
where assigned_to is not null and assigned_to_ids = '{}';

create index if not exists butler_tasks_assigned_to_ids_idx on butler_tasks using gin (assigned_to_ids);
