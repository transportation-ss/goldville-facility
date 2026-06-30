'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { TaskType, TaskPriority } from '@/lib/types/housekeeping'

// ── 今日固定派工單（取得或建立）──────────────────────────
export async function getTodayPlan(date: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('housekeeping_daily_plans')
    .select('*')
    .eq('plan_date', date)
    .maybeSingle()
  return data
}

// ── 建立今日派工單 ────────────────────────────────────────
export async function createPlan(date: string, generalNotes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { data, error } = await supabase
    .from('housekeeping_daily_plans')
    .insert({ plan_date: date, general_notes: generalNotes || null, created_by: user.id })
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/housekeeping')
  return data
}

// ── 刪除整日派工單（含所有任務）──────────────────────────
export async function deletePlan(planId: string) {
  const supabase = await createClient()
  // tasks 有 ON DELETE CASCADE，刪 plan 即一併刪除
  const { error } = await supabase
    .from('housekeeping_daily_plans')
    .delete()
    .eq('id', planId)
  if (error) throw new Error(error.message)
  revalidatePath('/housekeeping')
  revalidatePath('/housekeeping/plan')
}

// ── 更新派工單備註/狀態 ────────────────────────────────────
export async function updatePlan(planId: string, patch: { general_notes?: string; status?: string }) {
  const supabase = await createClient()
  const update: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() }
  if (patch.status === 'published') update.published_at = new Date().toISOString()

  const { error } = await supabase
    .from('housekeeping_daily_plans')
    .update(update)
    .eq('id', planId)
  if (error) throw new Error(error.message)
  revalidatePath('/housekeeping')
  revalidatePath('/housekeeping/plan')
}

// ── 發布派工單並推送給主管 ────────────────────────────────
export async function publishPlan(planId: string) {
  await updatePlan(planId, { status: 'published' })

  try {
    const { generateHousekeepingReport, pushReportToManager } = await import('@/lib/line/housekeeping-report')
    const report = await generateHousekeepingReport()
    await pushReportToManager(report)
  } catch (e) {
    console.error('[publishPlan] LINE push failed', e)
  }
}

// ── 取得派工單任務 ────────────────────────────────────────
export async function getPlanTasks(planId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('housekeeping_tasks')
    .select(`
      *,
      room:rooms(id, name, floor, room_type, sort_order),
      assignee:user_profiles!housekeeping_tasks_assigned_to_fkey(id, display_name),
      completer:user_profiles!housekeeping_tasks_completed_by_fkey(id, display_name)
    `)
    .eq('plan_id', planId)
    .order('priority', { ascending: false })   // urgent first
    .order('sort_order')
  return data ?? []
}

// ── 新增任務到派工單 ──────────────────────────────────────
export async function addTask(planId: string, task: {
  roomId: string | null
  taskType: TaskType
  priority: TaskPriority
  specialNotes: string
  assignedTo: string | null
  sortOrder: number
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('housekeeping_tasks')
    .insert({
      plan_id:       planId,
      room_id:       task.roomId || null,
      task_type:     task.taskType,
      priority:      task.priority,
      special_notes: task.specialNotes || null,
      assigned_to:   task.assignedTo || null,
      sort_order:    task.sortOrder,
    })
  if (error) throw new Error(error.message)
  // 更新派工單的 updated_at（記錄最後修改時間）
  await supabase
    .from('housekeeping_daily_plans')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', planId)
  revalidatePath('/housekeeping')
  revalidatePath('/housekeeping/plan')
}

// ── 更新任務（編輯用）─────────────────────────────────────
export async function updateTask(taskId: string, patch: {
  taskType?:    TaskType
  priority?:    TaskPriority
  assignedTo?:  string | null
  specialNotes?: string
}) {
  const supabase = await createClient()
  const update: Record<string, unknown> = {}
  if (patch.taskType    !== undefined) update.task_type     = patch.taskType
  if (patch.priority    !== undefined) update.priority      = patch.priority
  if (patch.assignedTo  !== undefined) update.assigned_to   = patch.assignedTo
  if (patch.specialNotes !== undefined) update.special_notes = patch.specialNotes || null

  const { error } = await supabase
    .from('housekeeping_tasks')
    .update(update)
    .eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath('/housekeeping')
  revalidatePath('/housekeeping/plan')
}

// ── 刪除任務 ──────────────────────────────────────────────
export async function deleteTask(taskId: string) {
  const supabase = await createClient()
  // 取得 plan_id 以便更新 updated_at
  const { data: task } = await supabase
    .from('housekeeping_tasks')
    .select('plan_id')
    .eq('id', taskId)
    .single()
  const { error } = await supabase
    .from('housekeeping_tasks')
    .delete()
    .eq('id', taskId)
  if (error) throw new Error(error.message)
  if (task?.plan_id) {
    await supabase
      .from('housekeeping_daily_plans')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', task.plan_id)
  }
  revalidatePath('/housekeeping')
  revalidatePath('/housekeeping/plan')
}

// ── 標記任務完成 ──────────────────────────────────────────
export async function completeTask(taskId: string, completionNotes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { error } = await supabase
    .from('housekeeping_tasks')
    .update({
      status: 'completed',
      completed_by: user.id,
      completed_at: new Date().toISOString(),
      completion_notes: completionNotes?.trim() || null,
    })
    .eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath('/housekeeping')
}

// ── 更新備註（不改狀態）──────────────────────────────────
export async function updateTaskNotes(taskId: string, notes: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('housekeeping_tasks')
    .update({ completion_notes: notes.trim() || null })
    .eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath('/housekeeping')
}

// ── 取消完成（還原 pending）──────────────────────────────
export async function uncompleteTask(taskId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('housekeeping_tasks')
    .update({ status: 'pending', completed_by: null, completed_at: null, completion_notes: null })
    .eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath('/housekeeping')
}

// ── 取得可選空間清單 ──────────────────────────────────────
export async function getSpaceOptions() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('rooms')
    .select('id, name, floor, room_type')
    .eq('is_active', true)
    .order('sort_order')
  return (data ?? []).map(r => ({
    ...r,
    label: r.room_type === '客房'
      ? r.name
      : r.floor ? `${r.floor} ${r.name}` : r.name,
  }))
}

// ── 取得房務人員清單 ──────────────────────────────────────
export async function getHousekeepingStaff() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('user_profiles')
    .select('id, display_name, role')
    .in('role', ['housekeeping', 'admin', 'manager', 'frontdesk_day'])
    .eq('status', 'active')
    .order('display_name')
  return data ?? []
}

// ── 取得指定日期派工單（歷史用）──────────────────────────
export async function getPlanByDate(date: string) {
  const supabase = await createClient()
  const { data: plan } = await supabase
    .from('housekeeping_daily_plans')
    .select('*')
    .eq('plan_date', date)
    .maybeSingle()
  if (!plan) return null
  const tasks = await getPlanTasks(plan.id)
  return { plan, tasks }
}

// ── 取得歷史派工單列表 ────────────────────────────────────
export async function getPlanHistory(limit = 30) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('housekeeping_daily_plans')
    .select('id, plan_date, status, created_at')
    .order('plan_date', { ascending: false })
    .limit(limit)
  return data ?? []
}
