import { createClient } from '@/lib/supabase/server'
import { getOrCreateSession, signInToSession } from './actions'
import { NightshiftSheet } from './NightshiftSheet'
import { Moon } from 'lucide-react'

export default async function NightshiftPage() {
  const supabase = await createClient()

  // 取得當前使用者
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, display_name')
    .eq('id', user?.id ?? '')
    .single()

  const isAdmin = ['admin', 'manager'].includes(profile?.role ?? '')

  // 取得或建立今日班次
  const session = await getOrCreateSession()

  // 自動簽到（班次未結束才簽）
  if (user && profile?.display_name && session.status !== 'completed') {
    await signInToSession(session.id, profile.display_name)
    // 重新取得最新 signin 資料
    const { data: refreshed } = await supabase
      .from('nightshift_sessions')
      .select('signin_1_name, signin_1_at, signin_2_name, signin_2_at, signin_3_name, signin_3_at')
      .eq('id', session.id)
      .single()
    if (refreshed) {
      Object.assign(session, refreshed)
    }
  }

  // 取得固定任務清單
  const { data: templates } = await supabase
    .from('nightshift_task_templates')
    .select('*')
    .eq('is_active', true)
    .order('time_slot')
    .order('sort_order')

  // 取得今日加派任務
  const { data: extraTasks } = await supabase
    .from('nightshift_extra_tasks')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at')

  // 組合所有任務
  const allTasks = [
    ...(templates ?? []).map(t => ({ ...t, is_extra: false })),
    ...(extraTasks ?? []).map(t => ({
      id: t.id,
      title: t.title,
      category: t.category,
      time_slot: t.time_slot,
      area_slug: t.area_slug ?? null,
      sort_order: 999,
      is_extra: true,
    })),
  ]

  // 取得今日完成紀錄（含完成人名稱）
  const { data: rawCompletions } = await supabase
    .from('nightshift_completions')
    .select('id, template_id, extra_task_id, completed_by, completed_at, notes')
    .eq('session_id', session.id)

  // 取得完成人姓名
  const userIds = [...new Set((rawCompletions ?? []).map(c => c.completed_by).filter(Boolean))]
  let userNames: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .in('id', userIds)
    userNames = Object.fromEntries((profiles ?? []).map(p => [p.id, p.display_name]))
  }

  const completions = (rawCompletions ?? []).map(c => ({
    ...c,
    completer_name: c.completed_by ? (userNames[c.completed_by] ?? null) : null,
  }))

  return (
    <div className="-m-4 md:-m-6 min-h-screen bg-gray-100">
      <NightshiftSheet
        session={session}
        tasks={allTasks}
        completions={completions}
        isAdmin={isAdmin}
        currentUserName={profile?.display_name ?? ''}
      />
    </div>
  )
}
