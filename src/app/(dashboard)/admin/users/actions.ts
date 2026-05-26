'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveUser(userId: string) {
  const supabase = await createClient()
  await supabase
    .from('user_profiles')
    .update({ status: 'active' })
    .eq('id', userId)
  revalidatePath('/admin/users')
}

export async function rejectUser(userId: string) {
  const supabase = await createClient()
  // 拒絕 = 設為 disabled（保留紀錄）
  await supabase
    .from('user_profiles')
    .update({ status: 'disabled' })
    .eq('id', userId)
  revalidatePath('/admin/users')
}

export async function updateUserRole(userId: string, role: string) {
  const supabase = await createClient()
  await supabase
    .from('user_profiles')
    .update({ role })
    .eq('id', userId)
  revalidatePath('/admin/users')
}

export async function toggleUserStatus(userId: string, currentStatus: string) {
  const supabase = await createClient()
  const newStatus = currentStatus === 'active' ? 'disabled' : 'active'
  await supabase
    .from('user_profiles')
    .update({ status: newStatus })
    .eq('id', userId)
  revalidatePath('/admin/users')
}
