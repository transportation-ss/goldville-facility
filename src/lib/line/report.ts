import { createAdminClient } from '@/lib/supabase/admin'

// ── 台灣時間格式化 ──────────────────────────────────────
function toTwTime(isoStr: string | null | undefined): string {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const tw = new Date(d.getTime() + 8 * 60 * 60 * 1000)
  return `${String(tw.getUTCHours()).padStart(2, '0')}:${String(tw.getUTCMinutes()).padStart(2, '0')}`
}

// ── 純文字 fallback ────────────────────────────────────
function textMsg(text: string) {
  return { type: 'text', text }
}

// ── 主函式 ────────────────────────────────────────────
export async function generateNightshiftReport() {
  const supabase = createAdminClient()

  // 最近一筆班次
  const { data: session } = await supabase
    .from('nightshift_sessions')
    .select('*')
    .order('session_date', { ascending: false })
    .limit(1)
    .single()

  if (!session) return textMsg('目前尚無大夜工作表記錄。')

  // 固定任務
  const { data: templates } = await supabase
    .from('nightshift_task_templates')
    .select('id, title, time_slot, sort_order')
    .eq('is_active', true)
    .order('time_slot').order('sort_order')

  // 加派任務
  const { data: extras } = await supabase
    .from('nightshift_extra_tasks')
    .select('id, title, time_slot')
    .eq('session_id', session.id)

  // 完成紀錄
  const { data: completions } = await supabase
    .from('nightshift_completions')
    .select('template_id, extra_task_id, completed_by, completed_at, notes')
    .eq('session_id', session.id)

  // 完成人姓名
  const userIds = [...new Set((completions ?? []).map(c => c.completed_by).filter(Boolean))]
  let userNames: Record<string, string> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles').select('id, display_name').in('id', userIds)
    userNames = Object.fromEntries((profiles ?? []).map(p => [p.id, p.display_name]))
  }

  // 建立完成 Map
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

  // 時段分組（統計）
  const slotStats = new Map<string, { done: number; total: number }>()
  for (const t of allTemplates) {
    const slot = t.time_slot ?? '其他'
    const cur = slotStats.get(slot) ?? { done: 0, total: 0 }
    cur.total++
    if (doneMap.has(t.id)) cur.done++
    slotStats.set(slot, cur)
  }
  if (allExtras.length > 0) {
    const cur = slotStats.get('加派') ?? { done: 0, total: 0 }
    for (const e of allExtras) {
      cur.total++
      if (doneMap.has(e.id)) cur.done++
    }
    slotStats.set('加派', cur)
  }

  // 未完成
  const incomplete = allTemplates.filter(t => !doneMap.has(t.id))
  // 有備註
  const withNotes = allTemplates.filter(t => doneMap.get(t.id)?.notes)

  // 簽到列表
  const signins = [
    session.signin_1_name ? `${session.signin_1_name} ${toTwTime(session.signin_1_at)}` : null,
    session.signin_2_name ? `${session.signin_2_name} ${toTwTime(session.signin_2_at)}` : null,
    session.signin_3_name ? `${session.signin_3_name} ${toTwTime(session.signin_3_at)}` : null,
  ].filter(Boolean) as string[]

  const isCompleted  = session.status === 'completed'
  const statusLabel  = isCompleted ? '已結班' : '進行中'
  const statusBg     = isCompleted ? '#10B981' : '#F59E0B'
  const progressPct  = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0

  // ── Flex body contents ───────────────────────────────
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

  // 完成進度
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

  // 時段明細
  if (slotStats.size > 0) {
    body.push({ type: 'separator', margin: 'md' })
    body.push({ type: 'text', text: '時段明細', size: 'xs', color: '#9CA3AF', weight: 'bold', margin: 'md' })
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
  }

  // 未完成項目（結班後才顯示）
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

  // 工作備註
  if (withNotes.length > 0) {
    body.push({ type: 'separator', margin: 'md' })
    body.push({ type: 'text', text: '📝 工作備註', size: 'xs', color: '#9CA3AF', weight: 'bold', margin: 'md' })
    for (const t of withNotes.slice(0, 3)) {
      const c = doneMap.get(t.id)!
      body.push({
        type: 'box', layout: 'vertical', margin: 'sm',
        backgroundColor: '#F9FAFB', cornerRadius: '6px', paddingAll: 'sm',
        contents: [
          { type: 'text', text: t.title, size: 'xs', color: '#374151', weight: 'bold' },
          { type: 'text', text: c.notes!, size: 'xs', color: '#6B7280', wrap: true, margin: 'xs' },
        ],
      })
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

  // ── 組合 Flex Message ────────────────────────────────
  return {
    type: 'flex',
    altText: `大夜工作報表 ${session.session_date}（${statusLabel}）`,
    contents: {
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
        contents: [
          { type: 'text', text: '好好園館 工務管理系統', size: 'xxs', color: '#CBD5E1', align: 'center' },
        ],
      },
    },
  }
}
