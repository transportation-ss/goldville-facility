import { createClient } from '@/lib/supabase/server'
import { getOrCreateSession, recordAreaCheckin } from '../../actions'
import { NightshiftSheet } from '../../NightshiftSheet'
import { notFound } from 'next/navigation'
import { MapPin } from 'lucide-react'

export default async function NightshiftAreaPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  // 確認區域存在
  const { data: area } = await supabase
    .from('nightshift_areas')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!area) notFound()

  // 取得使用者
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, display_name')
    .eq('id', user?.id ?? '')
    .single()

  const isAdmin = ['admin', 'manager'].includes(profile?.role ?? '')

  // 取得或建立今日班次
  const session = await getOrCreateSession()

  // 記錄到場（Server Component 直接呼叫）
  await recordAreaCheckin(session.id, slug)

  // 只取這個區域的任務
  const { data: templates } = await supabase
    .from('nightshift_task_templates')
    .select('*')
    .eq('is_active', true)
    .eq('area_slug', slug)
    .order('time_slot')
    .order('sort_order')

  // 取得今日完成紀錄
  const { data: rawCompletions } = await supabase
    .from('nightshift_completions')
    .select('id, template_id, extra_task_id, completed_by, completed_at, notes')
    .eq('session_id', session.id)

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

  const tasks = (templates ?? []).map(t => ({ ...t, is_extra: false }))

  return (
    <div className="-m-4 md:-m-6 min-h-screen bg-gray-100">
      {/* 區域標題 */}
      <div className="bg-blue-700 text-white px-4 py-4 flex items-center gap-3">
        <MapPin className="w-5 h-5 shrink-0" />
        <div>
          <p className="text-xs text-blue-200">掃描到場 ✓ 已記錄</p>
          <p className="text-lg font-bold">{area.name}</p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-400 text-sm">此區域目前沒有待辦任務</p>
        </div>
      ) : (
        <NightshiftSheet
          session={session}
          tasks={tasks}
          completions={completions}
          isAdmin={isAdmin}
          currentUserName={profile?.display_name ?? ''}
        />
      )}
    </div>
  )
}
