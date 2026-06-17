import { createAdminClient } from '@/lib/supabase/admin'
import { TASK_TYPE_LABELS, compareByTypeFloorRoom, type TaskType } from '@/lib/types/housekeeping'

function todayTW(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

function textMsg(text: string) {
  return { type: 'text', text }
}

const NIGHTSHIFT_URL = 'https://goldville-facility.vercel.app/housekeeping'

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
function combinedBubble(title: string, headerColor: string, tasks: any[], emptyText: string) {
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
    footer: { type: 'box', layout: 'vertical', paddingAll: 'sm', contents: [viewButton()] },
  }
}

// ── 臨時派工卡 ────────────────────────────────────────────
function adhocBubble(orders: any[]) {
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
    footer: { type: 'box', layout: 'vertical', paddingAll: 'sm', contents: [viewButton()] },
  }
}

// ── 優先處理卡（緊急任務彙總）────────────────────────────
function urgentBubble(urgentTasks: any[], urgentAdhoc: any[]) {
  const all = [...urgentTasks, ...urgentAdhoc].sort(compareByTypeFloorRoom)
  const done = all.filter(i => i.status === 'completed').length

  const rows: any[] = []
  for (const item of all) {
    const isAdhoc = typeof item.title === 'string' && !item.room?.room_type
    const isDone  = item.status === 'completed'
    const floor   = item.room?.floor
    const name    = isAdhoc ? item.title : (item.room?.name ?? '（未指定）')
    const label   = floor ? `${floor} ${name}` : name
    rows.push({
      type: 'box', layout: 'horizontal', paddingTop: 'sm', paddingBottom: 'sm',
      contents: [
        { type: 'text', text: isDone ? '✅' : '🔴', size: 'sm', flex: 0 },
        { type: 'text', text: label, size: 'sm', color: isDone ? '#9CA3AF' : '#111827', flex: 1, margin: 'sm', decoration: isDone ? 'line-through' : 'none', wrap: true },
      ],
    })
    if (rows.length < all.length) rows.push({ type: 'separator', color: '#FEE2E2' })
  }

  return {
    type: 'bubble', size: 'mega',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: '#B91C1C', paddingAll: 'md',
      contents: [{
        type: 'box', layout: 'horizontal', contents: [
          { type: 'text', text: '⚡ 優先處理', color: '#FFFFFF', weight: 'bold', size: 'lg', flex: 1 },
          {
            type: 'box', layout: 'vertical', flex: 0, backgroundColor: done === all.length ? '#10B981' : '#F59E0B',
            cornerRadius: '4px', paddingStart: 'sm', paddingEnd: 'sm', paddingTop: 'xs', paddingBottom: 'xs',
            contents: [{ type: 'text', text: `${done}/${all.length}`, color: '#FFFFFF', size: 'xs', weight: 'bold' }],
          },
        ],
      }],
    },
    body: { type: 'box', layout: 'vertical', paddingAll: 'md', contents: rows },
    footer: { type: 'box', layout: 'vertical', paddingAll: 'sm', contents: [viewButton()] },
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

  const guestTasks  = allTasks.filter(t => t.room?.room_type === '客房')
  const publicTasks = allTasks.filter(t => t.room?.room_type !== '客房')

  const urgentTasks = allTasks.filter(t => t.priority === 'urgent')
  const urgentAdhoc = allAdhoc.filter(o => o.priority === 'urgent')
  const urgentCount = urgentTasks.length + urgentAdhoc.length

  const bubbles = [
    ...(urgentCount > 0 ? [urgentBubble(urgentTasks, urgentAdhoc)] : []),
    combinedBubble('🛏 客房派工', '#1E40AF', guestTasks, '今日無客房任務'),
    combinedBubble('🏢 公共空間', '#065F46', publicTasks, '今日無公共空間任務'),
    adhocBubble(allAdhoc),
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
      footer: { type: 'box', layout: 'vertical', paddingAll: 'sm', contents: [viewButton()] },
    },
  }
}
