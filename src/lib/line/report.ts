import { createAdminClient } from '@/lib/supabase/admin'

// ── 台灣時間格式化 ──────────────────────────────────────
function toTwTime(isoStr: string | null | undefined): string {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const tw = new Date(d.getTime() + 8 * 60 * 60 * 1000)
  return `${String(tw.getUTCHours()).padStart(2, '0')}:${String(tw.getUTCMinutes()).padStart(2, '0')}`
}

function textMsg(text: string) {
  return { type: 'text', text }
}

// ── 時段卡片（詳細任務列表）───────────────────────────────
function slotBubble(
  slot: string,
  tasks: { id: string; title: string }[],
  doneMap: Map<string, { completer: string; at: string; notes: string | null }>,
  statusBg: string,
) {
  const doneCount = tasks.filter(t => doneMap.has(t.id)).length
  const allDone   = doneCount === tasks.length

  const taskRows: any[] = []
  for (const t of tasks) {
    const c = doneMap.get(t.id)
    taskRows.push({
      type: 'box', layout: 'vertical',
      margin: 'md',
      paddingTop: 'sm', paddingBottom: 'sm',
      borderWidth: 'none',
      contents: [
        {
          type: 'box', layout: 'horizontal',
          contents: [
            // 圖示
            { type: 'text', text: c ? '✅' : '❌', size: 'sm', flex: 0 },
            // 任務名稱
            { type: 'text', text: t.title, size: 'sm', color: c ? '#374151' : '#9CA3AF', wrap: true, flex: 1, margin: 'sm' },
          ],
        },
        // 完成人 + 時間
        ...(c ? [{
          type: 'text',
          text: `${c.completer}・${c.at}`,
          size: 'xxs', color: '#6B7280',
          margin: 'xs',
          offsetStart: '28px',
        }] : []),
        // 備註
        ...(c?.notes ? [{
          type: 'box', layout: 'vertical',
          margin: 'xs',
          offsetStart: '28px',
          backgroundColor: '#FEF9C3',
          cornerRadius: '4px',
          paddingAll: 'xs',
          contents: [{
            type: 'text',
            text: `📝 ${c.notes}`,
            size: 'xxs', color: '#854D0E', wrap: true,
          }],
        }] : []),
      ],
    })

    // 分隔線（非最後一項）
    if (t !== tasks[tasks.length - 1]) {
      taskRows.push({ type: 'separator', color: '#F3F4F6' })
    }
  }

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box', layout: 'vertical',
      backgroundColor: allDone ? '#064E3B' : '#78350F',
      paddingAll: 'md',
      contents: [
        {
          type: 'box', layout: 'horizontal',
          contents: [
            { type: 'text', text: slot, color: '#FFFFFF', weight: 'bold', size: 'lg', flex: 1 },
            {
              type: 'box', layout: 'vertical', flex: 0,
              backgroundColor: allDone ? '#10B981' : '#F59E0B',
              cornerRadius: '4px',
              paddingStart: 'sm', paddingEnd: 'sm', paddingTop: 'xs', paddingBottom: 'xs',
              contents: [{
                type: 'text',
                text: `${doneCount}/${tasks.length}`,
                color: '#FFFFFF', size: 'xs', weight: 'bold',
              }],
            },
          ],
        },
      ],
    },
    body: {
      type: 'box', layout: 'vertical',
      paddingAll: 'md',
      contents: taskRows.length > 0 ? taskRows : [{
        type: 'text', text: '（無任務）', size: 'sm', color: '#9CA3AF',
      }],
    },
  }
}

// ── 摘要卡片 ───────────────────────────────────────────
function summaryBubble(
  session: any,
  totalTasks: number,
  doneCount: number,
  slotStats: Map<string, { done: number; total: number }>,
  signins: string[],
  incomplete: { title: string }[],
) {
  const isCompleted = session.status === 'completed'
  const statusLabel = isCompleted ? '已結班' : '進行中'
  const statusBg    = isCompleted ? '#10B981' : '#F59E0B'
  const progressPct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0

  const body: any[] = []

  // 值班人員
  if (signins.length > 0) {
    body.push({
      type: 'box', layout: 'vertical',
      contents: [
        { type: 'text', text: '值班人員', size: 'xs', color: '#9CA3AF', weight: 'bold' },
        ...signins.map(s => ({ type: 'text', text: `• ${s}`, size: 'sm', color: '#374151', margin: 'xs' })),
      ],
    })
    body.push({ type: 'separator', margin: 'md' })
  }

  // 進度
  body.push({
    type: 'box', layout: 'vertical', margin: 'md',
    contents: [
      {
        type: 'box', layout: 'horizontal',
        contents: [
          { type: 'text', text: '工作進度', size: 'xs', color: '#9CA3AF', weight: 'bold', flex: 1 },
          { type: 'text', text: `${doneCount}/${totalTasks} (${progressPct}%)`, size: 'xs', color: '#10B981', weight: 'bold', align: 'end' },
        ],
      },
      {
        type: 'box', layout: 'vertical', margin: 'sm',
        height: '6px', backgroundColor: '#E5E7EB', cornerRadius: '3px',
        contents: [{
          type: 'box', layout: 'vertical',
          width: `${Math.max(progressPct, 2)}%`, height: '6px',
          backgroundColor: isCompleted && doneCount === totalTasks ? '#10B981' : '#F59E0B',
          cornerRadius: '3px', contents: [],
        }],
      },
    ],
  })

  // 時段摘要
  body.push({ type: 'separator', margin: 'md' })
  body.push({ type: 'text', text: '時段明細（← 左右滑動查看詳情）', size: 'xxs', color: '#9CA3AF', margin: 'md' })
  for (const [slot, stat] of slotStats) {
    const allDone = stat.done === stat.total
    body.push({
      type: 'box', layout: 'horizontal', margin: 'sm',
      contents: [
        { type: 'text', text: allDone ? '✅' : '⚠️', size: 'sm', flex: 0 },
        { type: 'text', text: slot, size: 'sm', color: '#374151', flex: 3, margin: 'sm' },
        { type: 'text', text: `${stat.done}/${stat.total}`, size: 'sm', color: allDone ? '#10B981' : '#F59E0B', align: 'end', flex: 1, weight: 'bold' },
      ],
    })
  }

  // 未完成
  if (isCompleted && incomplete.length > 0) {
    body.push({ type: 'separator', margin: 'md' })
    body.push({ type: 'text', text: '⚠️ 未完成項目', size: 'xs', color: '#DC2626', weight: 'bold', margin: 'md' })
    for (const t of incomplete.slice(0, 5)) {
      body.push({ type: 'text', text: `• ${t.title}`, size: 'xs', color: '#6B7280', wrap: true, margin: 'xs' })
    }
    if (incomplete.length > 5) {
      body.push({ type: 'text', text: `… 還有 ${incomplete.length - 5} 項`, size: 'xs', color: '#9CA3AF', margin: 'xs' })
    }
  }

  // 交接說明
  if (session.handover_notes) {
    body.push({ type: 'separator', margin: 'md' })
    body.push({
      type: 'box', layout: 'vertical', margin: 'md',
      backgroundColor: '#FFFBEB', cornerRadius: '8px', paddingAll: 'md',
      contents: [
        { type: 'text', text: '📋 交接說明', size: 'xs', color: '#92400E', weight: 'bold' },
        { type: 'text', text: session.handover_notes, size: 'sm', color: '#78350F', wrap: true, margin: 'sm' },
      ],
    })
  }

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box', layout: 'vertical',
      backgroundColor: '#0F172A', paddingAll: 'lg',
      contents: [
        { type: 'text', text: '🌙 好好園館', color: '#64748B', size: 'xs' },
        { type: 'text', text: '大夜工作報表', color: '#FFFFFF', weight: 'bold', size: 'xl', margin: 'xs' },
        {
          type: 'box', layout: 'horizontal', margin: 'sm',
          contents: [
            { type: 'text', text: session.session_date, color: '#94A3B8', size: 'sm', flex: 1 },
            {
              type: 'box', layout: 'vertical', flex: 0,
              backgroundColor: statusBg, cornerRadius: '4px',
              paddingStart: 'sm', paddingEnd: 'sm', paddingTop: 'xs', paddingBottom: 'xs',
              contents: [{ type: 'text', text: statusLabel, color: '#FFFFFF', size: 'xs', weight: 'bold' }],
            },
          ],
        },
      ],
    },
    body: {
      type: 'box', layout: 'vertical', paddingAll: 'lg',
      contents: body,
    },
    footer: {
      type: 'box', layout: 'vertical',
      backgroundColor: '#F8FAFC', paddingAll: 'sm',
      contents: [{
        type: 'text', text: '好好園館 工務管理系統',
        size: 'xxs', color: '#CBD5E1', align: 'center',
      }],
    },
  }
}

// ── 主函式 ────────────────────────────────────────────
export async function generateNightshiftReport() {
  const supabase = createAdminClient()

  const { data: session } = await supabase
    .from('nightshift_sessions')
    .select('*')
    .order('session_date', { ascending: false })
    .limit(1)
    .single()

  if (!session) return textMsg('目前尚無大夜工作表記錄。')

  const { data: templates } = await supabase
    .from('nightshift_task_templates')
    .select('id, title, time_slot, sort_order')
    .eq('is_active', true)
    .order('time_slot').order('sort_order')

  const { data: extras } = await supabase
    .from('nightshift_extra_tasks')
    .select('id, title, time_slot')
    .eq('session_id', session.id)

  const { data: completions } = await supabase
    .from('nightshift_completions')
    .select('template_id, extra_task_id, completed_by, completed_at, notes')
    .eq('session_id', session.id)

  const userIds = [...new Set((completions ?? []).map(c => c.completed_by).filter(Boolean))]
  let userNames: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles').select('id, display_name').in('id', userIds)
    userNames = Object.fromEntries((profiles ?? []).map(p => [p.id, p.display_name]))
  }

  const doneMap = new Map<string, { completer: string; at: string; notes: string | null }>()
  for (const c of (completions ?? [])) {
    const key = c.template_id ?? c.extra_task_id
    if (key) doneMap.set(key, {
      completer: c.completed_by ? (userNames[c.completed_by] ?? '—') : '—',
      at:        toTwTime(c.completed_at),
      notes:     c.notes ?? null,
    })
  }

  const allTemplates = templates ?? []
  const allExtras    = extras    ?? []
  const totalTasks   = allTemplates.length + allExtras.length
  const doneCount    = doneMap.size

  // 時段分組
  const slotTaskMap = new Map<string, { id: string; title: string }[]>()
  for (const t of allTemplates) {
    const slot = t.time_slot ?? '其他'
    if (!slotTaskMap.has(slot)) slotTaskMap.set(slot, [])
    slotTaskMap.get(slot)!.push({ id: t.id, title: t.title })
  }
  if (allExtras.length > 0) {
    slotTaskMap.set('加派任務', allExtras.map(e => ({ id: e.id, title: e.title })))
  }

  // 時段統計（摘要用）
  const slotStats = new Map<string, { done: number; total: number }>()
  for (const [slot, tasks] of slotTaskMap) {
    slotStats.set(slot, {
      done:  tasks.filter(t => doneMap.has(t.id)).length,
      total: tasks.length,
    })
  }

  const incomplete = allTemplates.filter(t => !doneMap.has(t.id))

  const signins = [
    session.signin_1_name ? `${session.signin_1_name} ${toTwTime(session.signin_1_at)}` : null,
    session.signin_2_name ? `${session.signin_2_name} ${toTwTime(session.signin_2_at)}` : null,
    session.signin_3_name ? `${session.signin_3_name} ${toTwTime(session.signin_3_at)}` : null,
  ].filter(Boolean) as string[]

  const isCompleted = session.status === 'completed'
  const statusBg    = isCompleted ? '#10B981' : '#F59E0B'

  // 組合 Carousel（摘要 + 各時段詳細）
  const bubbles: any[] = [
    summaryBubble(session, totalTasks, doneCount, slotStats, signins, incomplete),
    ...[...slotTaskMap.entries()].map(([slot, tasks]) =>
      slotBubble(slot, tasks, doneMap, statusBg)
    ),
  ]

  // LINE carousel 最多 12 張
  return {
    type: 'flex',
    altText: `大夜工作報表 ${session.session_date}（${isCompleted ? '已結班' : '進行中'}）`,
    contents: {
      type: 'carousel',
      contents: bubbles.slice(0, 12),
    },
  }
}
