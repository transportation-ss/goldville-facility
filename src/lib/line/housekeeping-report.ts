import { createAdminClient } from '@/lib/supabase/admin'
import { TASK_TYPE_LABELS, compareByTypeFloorRoom, type TaskType } from '@/lib/types/housekeeping'

function todayTW(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

function textMsg(text: string) {
  return { type: 'text', text }
}

const NIGHTSHIFT_URL = 'https://goldville-facility.vercel.app/housekeeping'
const UNLOCK_URL     = 'https://goldville-facility.vercel.app/unlock'

// ── 任務類型對應顏色（呼應 web TASK_TYPE_COLORS）─────────────
const TASK_TYPE_LINE_COLORS: Record<TaskType, string> = {
  checkout:         '#3B82F6',
  stay_over:        '#10B981',
  vacant:           '#9CA3AF',
  late_checkout:    '#F97316',
  deep_clean:       '#A855F7',
  vip:              '#F59E0B',
  dnd:              '#DC2626',
  extra_bed:        '#EC4899',
  maintenance_hold: '#64748B',
  routine:          '#14B8A6',
  spot_clean:       '#06B6D4',
}

function viewButton() {
  return {
    type: 'button',
    action: { type: 'uri', label: '查看詳細派工單', uri: NIGHTSHIFT_URL },
    style: 'primary',
    color: '#10B981',
    height: 'sm',
    flex: 2,
  }
}

function refreshButton() {
  return {
    type: 'button',
    action: { type: 'message', label: '🔄 更新', text: '今日任務' },
    style: 'secondary',
    height: 'sm',
    flex: 1,
  }
}

function footer() {
  return {
    type: 'box', layout: 'horizontal', paddingAll: 'sm', spacing: 'sm',
    contents: [refreshButton(), viewButton()],
  }
}

// ── 任務類型分組標頭 ──────────────────────────────────────
function typeGroupHeader(taskType: string | null, groupItems: any[]) {
  const typeLabel = taskType ? (TASK_TYPE_LABELS[taskType as TaskType] ?? taskType) : '未分類'
  const typeColor = taskType ? (TASK_TYPE_LINE_COLORS[taskType as TaskType] ?? '#9CA3AF') : '#9CA3AF'
  return {
    type: 'box', layout: 'horizontal', margin: 'md', alignItems: 'center',
    contents: [
      { type: 'box', layout: 'vertical', width: '10px', height: '10px', backgroundColor: typeColor, cornerRadius: '5px', flex: 0, contents: [] },
      { type: 'text', text: typeLabel, size: 'xs', weight: 'bold', color: '#374151', flex: 1, margin: 'sm' },
      { type: 'text', text: `${groupItems.filter(x => x.status === 'completed').length}/${groupItems.length}`, size: 'xs', color: '#9CA3AF', align: 'end', flex: 0 },
    ],
  }
}

// ── 客房／公共空間任務列 ──────────────────────────────────
function taskRow(t: any): any[] {
  const done = t.status === 'completed'
  const isUrgent = t.priority === 'urgent'
  const floor = t.room?.floor
  const name  = t.room?.name ?? '（未指定）'
  const label = floor ? `${floor} ${name}` : name

  return [{
    type: 'box', layout: 'vertical', paddingTop: 'sm', paddingBottom: 'sm',
    contents: [
      {
        type: 'box', layout: 'horizontal', contents: [
          { type: 'text', text: done ? '✅' : isUrgent ? '🔴' : '⬜', size: 'sm', flex: 0 },
          { type: 'text', text: label, size: 'sm', color: done ? '#9CA3AF' : '#374151', flex: 1, margin: 'sm', decoration: done ? 'line-through' : 'none' },
        ],
      },
      ...(t.assignee ? [{
        type: 'text', text: `→ ${t.assignee.display_name}`, size: 'xxs', color: '#9CA3AF', margin: 'xs', offsetStart: '28px',
      }] : []),
      ...(t.special_notes ? [{
        type: 'box', layout: 'vertical', margin: 'xs', offsetStart: '28px',
        backgroundColor: '#FFFBEB', cornerRadius: '4px', paddingAll: 'xs',
        contents: [{ type: 'text', text: `📝 ${t.special_notes}`, size: 'xxs', color: '#92400E', wrap: true }],
      }] : []),
    ],
  }]
}

// ── 臨時派工任務列 ────────────────────────────────────────
function adhocRow(o: any): any[] {
  const done = o.status === 'completed'
  const isUrgent = o.priority === 'urgent'
  const location = o.room ? (o.room.floor ? `${o.room.floor} ${o.room.name}` : o.room.name) : null

  return [{
    type: 'box', layout: 'vertical', paddingTop: 'sm', paddingBottom: 'sm',
    contents: [
      {
        type: 'box', layout: 'horizontal', contents: [
          { type: 'text', text: done ? '✅' : isUrgent ? '🔴' : '📋', size: 'sm', flex: 0 },
          { type: 'text', text: o.title, size: 'sm', color: done ? '#9CA3AF' : '#374151', flex: 1, margin: 'sm', wrap: true, decoration: done ? 'line-through' : 'none' },
        ],
      },
      ...(location ? [{ type: 'text', text: location, size: 'xxs', color: '#6B7280', margin: 'xs', offsetStart: '28px' }] : []),
      ...(o.description ? [{ type: 'text', text: o.description, size: 'xxs', color: '#6B7280', margin: 'xs', wrap: true, offsetStart: '28px' }] : []),
      ...(o.assignee ? [{ type: 'text', text: `→ ${o.assignee.display_name}`, size: 'xxs', color: '#9CA3AF', margin: 'xs', offsetStart: '28px' }] : []),
    ],
  }]
}

// ── 任務類別分組卡身（共用：客房／公共空間／臨時派工）──────
function groupedContents(items: any[], emptyText: string, rowFn: (t: any) => any[]): any[] {
  if (items.length === 0) {
    return [{ type: 'text', text: emptyText, size: 'sm', color: '#9CA3AF', align: 'center', margin: 'xl' }]
  }

  const sorted = [...items].sort(compareByTypeFloorRoom)
  const contents: any[] = []
  let currentType: string | null | undefined = undefined
  let firstGroup = true

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]
    if (i === 0 || item.task_type !== currentType) {
      currentType = item.task_type
      const groupItems = sorted.filter(x => x.task_type === currentType)
      if (!firstGroup) contents.push({ type: 'separator', margin: 'md', color: '#E5E7EB' })
      firstGroup = false
      contents.push(typeGroupHeader(currentType ?? null, groupItems))
    }
    contents.push(...rowFn(item))
    if (i < sorted.length - 1 && sorted[i + 1].task_type === currentType) {
      contents.push({ type: 'separator', color: '#F3F4F6' })
    }
  }

  return contents
}

// ── 客房／公共空間卡 ──────────────────────────────────────
function combinedBubble(title: string, headerColor: string, tasks: any[], emptyText: string, showFooter = false) {
  const doneCount = tasks.filter(t => t.status === 'completed').length
  const allDone   = tasks.length > 0 && doneCount === tasks.length
  const badgeColor = tasks.length === 0 ? '#9CA3AF' : allDone ? '#10B981' : '#F59E0B'

  return {
    type: 'bubble', size: 'mega',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: headerColor, paddingAll: 'md',
      contents: [{
        type: 'box', layout: 'horizontal', contents: [
          { type: 'text', text: title, color: '#FFFFFF', weight: 'bold', size: 'lg', flex: 1 },
          {
            type: 'box', layout: 'vertical', flex: 0, backgroundColor: badgeColor,
            cornerRadius: '4px', paddingStart: 'sm', paddingEnd: 'sm', paddingTop: 'xs', paddingBottom: 'xs',
            contents: [{ type: 'text', text: `${doneCount}/${tasks.length}`, color: '#FFFFFF', size: 'xs', weight: 'bold' }],
          },
        ],
      }],
    },
    body: { type: 'box', layout: 'vertical', paddingAll: 'md', contents: groupedContents(tasks, emptyText, taskRow) },
    ...(showFooter ? { footer: footer() } : {}),
  }
}

// ── 臨時派工卡 ────────────────────────────────────────────
function adhocBubble(orders: any[], showFooter = false) {
  const doneCount = orders.filter(o => o.status === 'completed').length
  const allDone   = orders.length > 0 && doneCount === orders.length
  const badgeColor = orders.length === 0 ? '#9CA3AF' : allDone ? '#10B981' : '#F59E0B'

  return {
    type: 'bubble', size: 'mega',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: '#EA580C', paddingAll: 'md',
      contents: [{
        type: 'box', layout: 'horizontal', contents: [
          { type: 'text', text: '📋 臨時派工', color: '#FFFFFF', weight: 'bold', size: 'lg', flex: 1 },
          {
            type: 'box', layout: 'vertical', flex: 0, backgroundColor: badgeColor,
            cornerRadius: '4px', paddingStart: 'sm', paddingEnd: 'sm', paddingTop: 'xs', paddingBottom: 'xs',
            contents: [{ type: 'text', text: `${doneCount}/${orders.length}`, color: '#FFFFFF', size: 'xs', weight: 'bold' }],
          },
        ],
      }],
    },
    body: { type: 'box', layout: 'vertical', paddingAll: 'md', contents: groupedContents(orders, '目前無臨時派工', adhocRow) },
    ...(showFooter ? { footer: footer() } : {}),
  }
}

// ── 優先處理卡（緊急任務彙總，四層分組）─────────────────
function urgentBubble(urgentTasks: any[], urgentAdhoc: any[], showFooter = false) {
  const total = urgentTasks.length + urgentAdhoc.length
  const done  = [...urgentTasks, ...urgentAdhoc].filter(i => i.status === 'completed').length

  // 第一層：大範圍分類
  const categories = [
    { label: '🛏 客房',    items: urgentTasks.filter(t => t.room?.room_type === '客房') },
    { label: '🏢 公共空間', items: urgentTasks.filter(t => t.room?.room_type !== '客房') },
    { label: '📋 臨時任務', items: urgentAdhoc as any[] },
  ].filter(c => c.items.length > 0)

  const contents: any[] = []

  for (let ci = 0; ci < categories.length; ci++) {
    const { label, items } = categories[ci]
    const isAdhoc = label.startsWith('📋')

    if (ci > 0) contents.push({ type: 'separator', margin: 'lg', color: '#FCA5A5' })

    // Level 1 header
    contents.push({
      type: 'text', text: label, size: 'sm', weight: 'bold', color: '#7F1D1D',
      margin: ci === 0 ? 'none' : 'md',
    })

    // 第二層：任務類型分組（sort 後依序輸出）
    const sorted = [...items].sort(compareByTypeFloorRoom)
    const typesSeen: (string | null)[] = []
    for (const item of sorted) {
      const taskType = (item.task_type as TaskType | null) ?? null
      if (!typesSeen.includes(taskType)) typesSeen.push(taskType)
    }

    for (const taskType of typesSeen) {
      const typeItems = sorted.filter(i => (i.task_type ?? null) === taskType)
      const typeLabel = taskType ? (TASK_TYPE_LABELS[taskType as TaskType] ?? taskType) : (isAdhoc ? '臨時' : '未分類')
      const typeColor = taskType ? (TASK_TYPE_LINE_COLORS[taskType as TaskType] ?? '#9CA3AF') : '#9CA3AF'

      // Level 2 header
      contents.push({
        type: 'box', layout: 'horizontal', margin: 'sm', alignItems: 'center',
        paddingStart: '8px', contents: [
          { type: 'box', layout: 'vertical', width: '8px', height: '8px', backgroundColor: typeColor, cornerRadius: '4px', flex: 0, contents: [] },
          { type: 'text', text: typeLabel, size: 'xxs', weight: 'bold', color: '#6B7280', margin: 'sm', flex: 1 },
        ],
      })

      // 第三層：樓層分組
      const floorsSeen: (string | null)[] = []
      for (const item of typeItems) {
        const floor = item.room?.floor ?? null
        if (!floorsSeen.includes(floor)) floorsSeen.push(floor)
      }

      for (const floor of floorsSeen) {
        const floorItems = typeItems.filter(i => (i.room?.floor ?? null) === floor)

        // Level 3 header（只在有樓層資訊時才顯示）
        if (floor) {
          contents.push({
            type: 'text', text: floor, size: 'xxs', color: '#9CA3AF', margin: 'xs', offsetStart: '16px',
          })
        }

        // 第四層：房號/位置
        for (const item of floorItems) {
          const isDone  = item.status === 'completed'
          const name    = isAdhoc ? item.title : (item.room?.name ?? '（未指定）')
          const notes   = isAdhoc ? item.description : item.special_notes
          contents.push({
            type: 'box', layout: 'vertical', margin: 'xs',
            contents: [
              {
                type: 'box', layout: 'horizontal', alignItems: 'center', offsetStart: '16px',
                contents: [
                  { type: 'text', text: isDone ? '✅' : '🔴', size: 'xs', flex: 0 },
                  { type: 'text', text: name, size: 'sm', color: isDone ? '#9CA3AF' : '#111827', flex: 1, margin: 'sm', decoration: isDone ? 'line-through' : 'none', wrap: true },
                  ...(item.assignee ? [{ type: 'text', text: item.assignee.display_name, size: 'xxs', color: '#9CA3AF', flex: 0, align: 'end' as const }] : []),
                ],
              },
              ...(notes ? [{
                type: 'box', layout: 'vertical', margin: 'xs',
                backgroundColor: '#FFFBEB', cornerRadius: '4px', paddingAll: 'xs',
                contents: [{ type: 'text', text: `📝 ${notes}`, size: 'xxs', color: '#92400E', wrap: true, offsetStart: '16px' }],
              }] : []),
            ],
          })
        }
      }
    }
  }

  return {
    type: 'bubble', size: 'mega',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: '#B91C1C', paddingAll: 'md',
      contents: [{
        type: 'box', layout: 'horizontal', contents: [
          { type: 'text', text: '⚡ 優先處理', color: '#FFFFFF', weight: 'bold', size: 'lg', flex: 1 },
          {
            type: 'box', layout: 'vertical', flex: 0, backgroundColor: done === total ? '#10B981' : '#F59E0B',
            cornerRadius: '4px', paddingStart: 'sm', paddingEnd: 'sm', paddingTop: 'xs', paddingBottom: 'xs',
            contents: [{ type: 'text', text: `${done}/${total}`, color: '#FFFFFF', size: 'xs', weight: 'bold' }],
          },
        ],
      }],
    },
    body: { type: 'box', layout: 'vertical', paddingAll: 'md', contents },
    ...(showFooter ? { footer: footer() } : {}),
  }
}

// ── 推送今日任務給主管 ─────────────────────────────────────
export async function pushReportToManager(report: any) {
  const userId = process.env.MANAGER_LINE_USER_ID
  const token  = process.env.LINE_HOUSEKEEPING_CHANNEL_ACCESS_TOKEN
  if (!userId || !token) return

  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ to: userId, messages: [report] }),
  })
}

// ── 主函式：今日任務 ──────────────────────────────────────
export async function generateHousekeepingReport() {
  const supabase = createAdminClient()
  const today = todayTW()

  const { data: plan } = await supabase
    .from('housekeeping_daily_plans')
    .select('*')
    .eq('plan_date', today)
    .maybeSingle()

  if (!plan) return textMsg('今日工單尚未安排。')
  if (plan.status === 'draft') return textMsg('今日工單尚未安排。')

  const { data: tasks } = await supabase
    .from('housekeeping_tasks')
    .select(`
      *, room:rooms(id, name, floor, room_type, sort_order),
      assignee:user_profiles!housekeeping_tasks_assigned_to_fkey(id, display_name)
    `)
    .eq('plan_id', plan.id)

  const { data: adhocOrders } = await supabase
    .from('housekeeping_adhoc_orders')
    .select(`
      *, room:rooms(id, name, floor, sort_order),
      assignee:user_profiles!housekeeping_adhoc_orders_assigned_to_fkey(id, display_name)
    `)
    .eq('order_date', today)

  const allTasks = tasks ?? []
  const allAdhoc = adhocOrders ?? []

  const urgentTasks = allTasks.filter(t => t.priority === 'urgent')
  const urgentAdhoc = allAdhoc.filter(o => o.priority === 'urgent')

  // 緊急任務已在「優先處理」卡顯示，其他卡排除
  const normalTasks = allTasks.filter(t => t.priority !== 'urgent')
  const normalAdhoc = allAdhoc.filter(o => o.priority !== 'urgent')

  const guestTasks  = normalTasks.filter(t => t.room?.room_type === '客房')
  const publicTasks = normalTasks.filter(t => t.room?.room_type !== '客房')
  const urgentCount = urgentTasks.length + urgentAdhoc.length

  const hasUrgent = urgentCount > 0
  const bubbles = [
    ...(hasUrgent ? [urgentBubble(urgentTasks, urgentAdhoc, true)] : []),
    combinedBubble('🛏 客房派工', '#1E40AF', guestTasks, '今日無客房任務', !hasUrgent),
    combinedBubble('🏢 公共空間', '#065F46', publicTasks, '今日無公共空間任務'),
    adhocBubble(normalAdhoc),
  ]

  const totalCount = allTasks.length + allAdhoc.length

  return {
    type: 'flex',
    altText: `今日房務安排 ${today}（${totalCount} 項${urgentCount > 0 ? ` / ${urgentCount} 緊急` : ''}）`,
    contents: { type: 'carousel', contents: bubbles },
  }
}

// ── 主函式：今日完成 ──────────────────────────────────────
export async function generateEODReport() {
  const supabase = createAdminClient()
  const today = todayTW()

  const { data: plan } = await supabase
    .from('housekeeping_daily_plans')
    .select('*')
    .eq('plan_date', today)
    .maybeSingle()

  if (!plan || plan.status === 'draft') return textMsg('今日工單尚未安排。')

  const { data: tasks } = await supabase
    .from('housekeeping_tasks')
    .select('*, room:rooms(id, name, floor, room_type, sort_order)')
    .eq('plan_id', plan.id)

  const { data: adhocOrders } = await supabase
    .from('housekeeping_adhoc_orders')
    .select('*, room:rooms(id, name, floor, sort_order)')
    .eq('order_date', today)

  const allTasks = tasks ?? []
  const allAdhoc = adhocOrders ?? []
  const all = [...allTasks, ...allAdhoc]

  const total = all.length
  const done  = all.filter(i => i.status === 'completed').length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0
  const incomplete = all.filter(i => i.status !== 'completed').sort(compareByTypeFloorRoom)

  const contents: any[] = [
    {
      type: 'box', layout: 'horizontal', contents: [
        { type: 'text', text: '今日完成度', size: 'sm', color: '#9CA3AF', weight: 'bold', flex: 1 },
        { type: 'text', text: `${done}/${total} (${pct}%)`, size: 'sm', color: '#10B981', weight: 'bold', align: 'end' },
      ],
    },
    {
      type: 'box', layout: 'vertical', margin: 'sm',
      height: '6px', backgroundColor: '#E5E7EB', cornerRadius: '3px',
      contents: [{
        type: 'box', layout: 'vertical', width: `${total > 0 ? Math.max(pct, 2) : 0}%`,
        height: '6px', backgroundColor: '#10B981', cornerRadius: '3px', contents: [],
      }],
    },
  ]

  if (incomplete.length === 0) {
    contents.push({ type: 'text', text: '🎉 今日任務已全部完成', size: 'md', color: '#10B981', weight: 'bold', align: 'center', margin: 'xl' })
  } else {
    contents.push({ type: 'separator', margin: 'lg' })
    contents.push({ type: 'text', text: '未完成項目', size: 'xs', color: '#9CA3AF', weight: 'bold', margin: 'md' })
    for (const item of incomplete) {
      const taskType  = (item as any).task_type as TaskType | null
      const typeLabel = taskType ? (TASK_TYPE_LABELS[taskType] ?? taskType) : '臨時'
      const typeColor = taskType ? (TASK_TYPE_LINE_COLORS[taskType] ?? '#9CA3AF') : '#9CA3AF'
      const isAdhoc = typeof (item as any).title === 'string'
      const room  = (item as any).room
      const name  = isAdhoc ? (item as any).title : (room?.name ?? '（未指定）')
      const label = !isAdhoc && room?.floor ? `${room.floor} ${name}` : name

      contents.push({
        type: 'box', layout: 'horizontal', margin: 'sm', alignItems: 'center',
        contents: [
          { type: 'box', layout: 'vertical', width: '10px', height: '10px', backgroundColor: typeColor, cornerRadius: '5px', flex: 0, contents: [] },
          { type: 'text', text: label, size: 'sm', color: '#374151', flex: 1, margin: 'sm', wrap: true },
          { type: 'text', text: typeLabel, size: 'xxs', color: '#9CA3AF', align: 'end', flex: 0 },
        ],
      })
    }
  }

  return {
    type: 'flex',
    altText: `收工確認 ${done}/${total} 完成（${pct}%）`,
    contents: {
      type: 'bubble', size: 'mega',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#0F172A', paddingAll: 'lg',
        contents: [
          { type: 'text', text: '🏨 好好園館', color: '#64748B', size: 'xs' },
          { type: 'text', text: '🔔 收工確認', color: '#FFFFFF', weight: 'bold', size: 'xl', margin: 'xs' },
          { type: 'text', text: today, color: '#94A3B8', size: 'sm', margin: 'sm' },
        ],
      },
      body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents },
      footer: footer(),
    },
  }
}

// ── 封印解除（搞笑入口）──────────────────────────────────
export async function generateUnlockReport() {
  const report = await generateHousekeepingReport()
  if (report.type !== 'flex') return report

  // 把 carousel 第一張卡的「查看詳細派工單」按鈕換成 unlock URL
  const carousel = (report as any).contents
  const firstBubble = carousel?.contents?.[0]
  if (firstBubble?.footer?.contents) {
    for (const item of firstBubble.footer.contents) {
      if (item?.action?.uri === NIGHTSHIFT_URL) {
        item.action.uri = UNLOCK_URL
        item.action.label = '🔓 進入系統'
      }
    }
  }

  return { ...report, altText: '🔓 封印解除！今日房務安排' }
}
