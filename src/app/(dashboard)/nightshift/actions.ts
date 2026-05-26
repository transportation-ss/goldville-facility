'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getNightshiftDate } from './utils'

// 取得或建立今日班次
export async function getOrCreateSession() {
  const supabase = await createClient()
  const sessionDate = getNightshiftDate()

  const { data: existing } = await supabase
    .from('nightshift_sessions')
    .select('*')
    .eq('session_date', sessionDate)
    .single()

  if (existing) return existing

  const { data: created, error } = await supabase
    .from('nightshift_sessions')
    .insert({ session_date: sessionDate })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return created
}

// 切換任務完成狀態
export async function toggleCompletion(
  sessionId: string,
  templateId: string | null,
  extraTaskId: string | null,
  isCompleted: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (isCompleted) {
    // 取消完成 → 刪除紀錄
    let q = supabase.from('nightshift_completions').delete().eq('session_id', sessionId)
    if (templateId) q = q.eq('template_id', templateId)
    if (extraTaskId) q = q.eq('extra_task_id', extraTaskId)
    await q
  } else {
    // 標記完成 → 新增紀錄
    await supabase.from('nightshift_completions').insert({
      session_id: sessionId,
      template_id: templateId ?? null,
      extra_task_id: extraTaskId ?? null,
      completed_by: user?.id ?? null,
    })
  }

  // revalidatePath 移除：UI 用 optimistic state 即時更新，不需等 server revalidate
}

// 儲存任務備註
export async function saveTaskNotes(
  sessionId: string,
  templateId: string | null,
  extraTaskId: string | null,
  notes: string
) {
  const supabase = await createClient()
  let q = supabase.from('nightshift_completions').update({ notes }).eq('session_id', sessionId)
  if (templateId) q = q.eq('template_id', templateId)
  if (extraTaskId) q = q.eq('extra_task_id', extraTaskId)
  await q
  revalidatePath('/nightshift')
}

// 儲存交接說明
export async function saveHandoverNotes(sessionId: string, notes: string) {
  const supabase = await createClient()
  await supabase
    .from('nightshift_sessions')
    .update({ handover_notes: notes })
    .eq('id', sessionId)
  revalidatePath('/nightshift')
}

// 結束班次（鎖定）
export async function closeSession(sessionId: string) {
  const supabase = await createClient()
  await supabase
    .from('nightshift_sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString() })
    .eq('id', sessionId)
  revalidatePath('/nightshift')
}

// 管理員重新開啟班次
export async function reopenSession(sessionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user?.id ?? '').single()
  if (!profile || !['admin', 'manager'].includes(profile.role)) {
    throw new Error('權限不足')
  }
  await supabase
    .from('nightshift_sessions')
    .update({ status: 'active', ended_at: null })
    .eq('id', sessionId)
  revalidatePath('/nightshift/history')
}

// QR 到場紀錄
export async function recordAreaCheckin(sessionId: string, areaSlug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('nightshift_area_checkins').insert({
    session_id: sessionId,
    area_slug: areaSlug,
    user_id: user?.id ?? null,
  })
}

// 夜班自動簽到（填入第一個空槽）
export async function signInToSession(sessionId: string, displayName: string) {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from('nightshift_sessions')
    .select('signin_1_name, signin_2_name, signin_3_name')
    .eq('id', sessionId)
    .single()

  if (!session) return

  // 已簽到 → 不重複
  if ([session.signin_1_name, session.signin_2_name, session.signin_3_name].includes(displayName)) return

  const now = new Date().toISOString()
  if (!session.signin_1_name) {
    await supabase.from('nightshift_sessions')
      .update({ signin_1_name: displayName, signin_1_at: now })
      .eq('id', sessionId)
  } else if (!session.signin_2_name) {
    await supabase.from('nightshift_sessions')
      .update({ signin_2_name: displayName, signin_2_at: now })
      .eq('id', sessionId)
  } else if (!session.signin_3_name) {
    await supabase.from('nightshift_sessions')
      .update({ signin_3_name: displayName, signin_3_at: now })
      .eq('id', sessionId)
  }
  // 三個槽都滿 → 靜默忽略
}

// 管理員加派任務
export async function addExtraTask(
  sessionId: string,
  title: string,
  category: string,
  timeSlot: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await supabase.from('nightshift_extra_tasks').insert({
    session_id: sessionId,
    title,
    category,
    time_slot: timeSlot,
    added_by: user?.id ?? null,
  })
  revalidatePath('/nightshift')
}
