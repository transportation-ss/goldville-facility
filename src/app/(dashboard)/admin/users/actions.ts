'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── 審核 ─────────────────────────────────────────────────
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
  await supabase
    .from('user_profiles')
    .update({ status: 'disabled' })
    .eq('id', userId)
  revalidatePath('/admin/users')
}

// ─── 角色 / 狀態 ──────────────────────────────────────────
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

// ─── 管理員直接新增帳號 ────────────────────────────────────
export async function createUser(data: {
  email: string
  password: string
  display_name: string
  role: string
}): Promise<{ error: string } | { success: true }> {
  try {
    const admin = createAdminClient()

    const { error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        display_name: data.display_name,
        role: data.role,
        status: 'active',
      },
    })

    if (error) return { error: error.message }
    revalidatePath('/admin/users')
    return { success: true }
  } catch (e: any) {
    return { error: e.message ?? '新增失敗（未知錯誤）' }
  }
}

// ─── 管理員重設他人密碼 ────────────────────────────────────
export async function adminResetPassword(userId: string, newPassword: string) {
  const admin = createAdminClient()

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  })

  if (error) throw new Error(error.message)
}
