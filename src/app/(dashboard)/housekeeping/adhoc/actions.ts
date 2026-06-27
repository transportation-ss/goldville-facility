'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TaskType, TaskPriority } from '@/lib/types/housekeeping'

// ── 取得今日臨時派工 ──────────────────────────────────────
export async function getTodayAdhocOrders(date: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('housekeeping_adhoc_orders')
    .select(`
      *,
      room:rooms(id, name, floor, sort_order),
      assignee:user_profiles!housekeeping_adhoc_orders_assigned_to_fkey(id, display_name),
      completer:user_profiles!housekeeping_adhoc_orders_completed_by_fkey(id, display_name)
    `)
    .eq('order_date', date)
    .order('priority', { ascending: false })
    .order('created_at')
  return data ?? []
}

// ── 建立臨時派工 ──────────────────────────────────────────
export async function createAdhocOrder(order: {
  title: string
  description: string
  roomId: string | null
  taskType: TaskType | null
  priority: TaskPriority
  assignedTo: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })

  const { error } = await supabase
    .from('housekeeping_adhoc_orders')
    .insert({
      order_date:  today,
      title:       order.title,
      description: order.description || null,
      room_id:     order.roomId || null,
      task_type:   order.taskType || null,
      priority:    'urgent',
      assigned_to: order.assignedTo || null,
      created_by:  user.id,
    })
  if (error) throw new Error(error.message)
  revalidatePath('/housekeeping')
}

// ── 標記臨時派工完成 ──────────────────────────────────────
export async function completeAdhocOrder(orderId: string, completionNotes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { error } = await supabase
    .from('housekeeping_adhoc_orders')
    .update({
      status: 'completed',
      completed_by: user.id,
      completed_at: new Date().toISOString(),
      completion_notes: completionNotes?.trim() || null,
    })
    .eq('id', orderId)
  if (error) throw new Error(error.message)
  revalidatePath('/housekeeping')
}

// ── 刪除臨時派工 ─────────────────────────────────────────
export async function deleteAdhocOrder(orderId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('housekeeping_adhoc_orders')
    .delete()
    .eq('id', orderId)
  if (error) throw new Error(error.message)
  revalidatePath('/housekeeping')
  revalidatePath('/housekeeping/plan')
}

// ── 更新備註（不改狀態）──────────────────────────────────
export async function updateAdhocNotes(orderId: string, notes: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('housekeeping_adhoc_orders')
    .update({ completion_notes: notes.trim() || null })
    .eq('id', orderId)
  if (error) throw new Error(error.message)
  revalidatePath('/housekeeping')
}

// ── 取消完成臨時派工 ──────────────────────────────────────
export async function uncompleteAdhocOrder(orderId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('housekeeping_adhoc_orders')
    .update({ status: 'pending', completed_by: null, completed_at: null, completion_notes: null })
    .eq('id', orderId)
  if (error) throw new Error(error.message)
  revalidatePath('/housekeeping')
}
