import { createAdminClient } from '@/lib/supabase/admin'
import { TASK_TYPE_LABELS } from '@/lib/types/housekeeping'

function todayTW(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

function textMsg(text: string) {
  return { type: 'text', text }
}

const NIGHTSHIFT_URL = 'https://goldville-facility.vercel.app/housekeeping'

function viewButton() {
  return {
    type: 'button',
    action: { type: 'uri', label: '查看詳細派工單', uri: NIGHTSHIFT_URL },
    style: 'primary',
    color: '#10B981',
    height: 'sm',
  }
}

// ── 摘要卡 ────────────────────────────────────────────────
function summaryBubble(
  date: string,
  totalTasks: number,
  doneTasks: number,
  urgentCount: number,
  adhocCount: number,
  status: string,
) {
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const statusLabel = status === 'published' ? '已發布' : status === 'completed' ? '已完成' : '草稿'
  const statusColor = status === 'published' ? '#10B981' : status === 'completed' ? '#6B7280' : '#F59E0B'

  const body: any[] = [
    {
      type: 'box', layout: 'horizontal', contents: [
        { type: 'text', text: '工作進度', size: 'xs', color: '#9CA3AF', weight: 'bold', flex: 1 },
        { type: 'text', text: `${doneTasks}/${totalTasks} (${pct}%)`, size: 'xs', color: '#10B981', weight: 'bold', align: 'end' },
      ],
    },
    {
      type: 'box', layout: 'vertical', margin: 'sm',
      height: '6px', backgroundColor: '#E5E7EB', cornerRadius: '3px',
      contents: [{ type: 'box', layout: 'vertical', width: `${Math.max(pct, 2)}%`, height: '6px', backgroundColor: '#10B981', cornerRadius: '3px', contents: [] }],
    },
  ]

  if (urgentCount > 0) {
    body.push({ type: 'separator', margin: 'md' })
    body.push({ type: 'text', text: `🔴 緊急任務：${urgentCount} 項`, size: 'sm', color: '#DC2626', weight: 'bold', margin: 'md' })
  }

  if (adhocCount > 0) {
    body.push({ type: 'separator', margin: 'md' })
    body.push({ type: 'text', text: `📋 臨時派工：${adhocCount} 項`, size: 'sm', color: '#EA580C', margin: 'md' })
  }

  body.push({ type: 'text', text: '← 左右滑動查看各區任務', size: 'xxs', color: '#9CA3AF', margin: 'lg' })

  return {
    type: 'bubble', size: 'mega',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: '#0F172A', paddingAll: 'lg',
      contents: [
        { type: 'text', text: '🏨 好好園館', color: '#64748B', size: 'xs' },
        { type: 'text', text: '今日房務安排', color: '#FFFFFF', weight: 'bold', size: 'xl', margin: 'xs' },
        {
          type: 'box', layout: 'horizontal', margin: 'sm',
          contents: [
            { type: 'text', text: date, color: '#94A3B8', size: 'sm', flex: 1 },
            {
              type: 'box', layout: 'vertical', flex: 0, backgroundColor: statusColor, cornerRadius: '4px',
              paddingStart: 'sm', paddingEnd: 'sm', paddingTop: 'xs', paddingBottom: 'xs',
              contents: [{ type: 'text', text: statusLabel, color: '#FFFFFF', size: 'xs', weight: 'bold' }],
            },
          ],
        },
      ],
    },
    body: { type: 'box', layout: 'vertical', paddingAll: 'lg', contents: body },
    footer: { type: 'box', layout: 'vertical', paddingAll: 'sm', contents: [viewButton()] },
  }
}

// ── 單一任務列（共用）────────────────────────────────────
function taskRow(t: any): any[] {
  const done = t.status === 'completed'
  const isUrgent = t.priority === 'urgent'
  const typeLabel = TASK_TYPE_LABELS[t.task_type as keyof typeof TASK_TYPE_LABELS] ?? t.task_type

  const rows: any[] = [{
    type: 'box', layout: 'vertical', paddingTop: 'sm', paddingBottom: 'sm',
    contents: [
      {
        type: 'box', layout: 'horizontal', contents: [
          { type: 'text', text: done ? '✅' : isUrgent ? '🔴' : '⬜', size: 'sm', flex: 0 },
          { type: 'text', text: t.room?.name ?? '（未指定）', size: 'sm', color: done ? '#9CA3AF' : '#374151', flex: 1, margin: 'sm', decoration: done ? 'line-through' : 'none' },
          { type: 'text', text: typeLabel, size: 'xxs', color: '#6B7280', align: 'end', flex: 0 },
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

  return rows
}

// ── 多樓層合併卡（客房 or 公共）────────────────────────────
function combinedBubble(
  title: string,
  headerColor: string,
  byFloor: Map<string, any[]>,
  floorOrder: string[],
  floorIcon: string,
) {
  const allTasks = [...byFloor.values()].flat()
  const doneCount = allTasks.filter(t => t.status === 'completed').length
  const allDone = doneCount === allTasks.length

  const contents: any[] = []

  for (const floor of floorOrder) {
    const tasks = byFloor.get(floor)
    if (!tasks?.length) continue

    // 樓層標題分隔列
    if (contents.length > 0) contents.push({ type: 'separator', margin: 'md', color: '#E5E7EB' })
    contents.push({
      type: 'box', layout: 'horizontal', margin: 'md',
      contents: [
        { type: 'text', text: `${floorIcon} ${floor}`, size: 'xs', weight: 'bold', color: '#374151', flex: 1 },
        { type: 'text', text: `${tasks.filter(t => t.status === 'completed').length}/${tasks.length}`, size: 'xs', color: '#9CA3AF', align: 'end', flex: 0 },
      ],
    })

    for (let i = 0; i < tasks.length; i++) {
      const rows = taskRow(tasks[i])
      contents.push(...rows)
      if (i < tasks.length - 1) contents.push({ type: 'separator', color: '#F3F4F6' })
    }
  }

  return {
    type: 'bubble', size: 'mega',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: headerColor, paddingAll: 'md',
      contents: [{
        type: 'box', layout: 'horizontal', contents: [
          { type: 'text', text: title, color: '#FFFFFF', weight: 'bold', size: 'lg', flex: 1 },
          {
            type: 'box', layout: 'vertical', flex: 0,
            backgroundColor: allDone ? '#10B981' : '#F59E0B',
            cornerRadius: '4px', paddingStart: 'sm', paddingEnd: 'sm', paddingTop: 'xs', paddingBottom: 'xs',
            contents: [{ type: 'text', text: `${doneCount}/${allTasks.length}`, color: '#FFFFFF', size: 'xs', weight: 'bold' }],
          },
        ],
      }],
    },
    body: { type: 'box', layout: 'vertical', paddingAll: 'md', contents },
    footer: { type: 'box', layout: 'vertical', paddingAll: 'sm', contents: [viewButton()] },
  }
}

// ── 臨時派工卡 ────────────────────────────────────────────
function adhocBubble(orders: any[]) {
  const rows: any[] = []
  for (const o of orders) {
    const done = o.status === 'completed'
    rows.push({
      type: 'box', layout: 'vertical', margin: 'md',
      contents: [
        {
          type: 'box', layout: 'horizontal', contents: [
            { type: 'text', text: done ? '✅' : o.priority === 'urgent' ? '🔴' : '📋', size: 'sm', flex: 0 },
            { type: 'text', text: o.title, size: 'sm', color: done ? '#9CA3AF' : '#374151', flex: 1, margin: 'sm', wrap: true, decoration: done ? 'line-through' : 'none' },
          ],
        },
        ...(o.description ? [{ type: 'text', text: o.description, size: 'xxs', color: '#6B7280', margin: 'xs', wrap: true, offsetStart: '28px' }] : []),
        ...(o.assignee ? [{ type: 'text', text: `→ ${o.assignee.display_name}`, size: 'xxs', color: '#9CA3AF', margin: 'xs', offsetStart: '28px' }] : []),
      ],
    })
    if (o !== orders[orders.length - 1]) rows.push({ type: 'separator', color: '#F3F4F6' })
  }

  return {
    type: 'bubble', size: 'mega',
    header: {
      type: 'box', layout: 'vertical', backgroundColor: '#EA580C', paddingAll: 'md',
      contents: [{ type: 'text', text: '📋 臨時派工', color: '#FFFFFF', weight: 'bold', size: 'lg' }],
    },
    body: { type: 'box', layout: 'vertical', paddingAll: 'md', contents: rows },
    footer: { type: 'box', layout: 'vertical', paddingAll: 'sm', contents: [viewButton()] },
  }
}

// ── 主函式 ────────────────────────────────────────────────
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
      *, room:rooms(id, name, floor, room_type),
      assignee:user_profiles!housekeeping_tasks_assigned_to_fkey(id, display_name)
    `)
    .eq('plan_id', plan.id)
    .order('priority', { ascending: false })
    .order('sort_order')

  const { data: adhocOrders } = await supabase
    .from('housekeeping_adhoc_orders')
    .select(`
      *, room:rooms(id, name, floor),
      assignee:user_profiles!housekeeping_adhoc_orders_assigned_to_fkey(id, display_name)
    `)
    .eq('order_date', today)
    .order('priority', { ascending: false })
    .order('created_at')

  const allTasks     = tasks     ?? []
  const allAdhoc     = adhocOrders ?? []
  const urgentCount  = allTasks.filter(t => t.priority === 'urgent').length
  const doneTasks    = allTasks.filter(t => t.status === 'completed').length

  // 按樓層分組
  const FLOOR_ORDER = ['B1', '1F', '2F', '3F', '5F', '6F', '7F', '8F']
  const guestTasks   = allTasks.filter(t => t.room?.room_type === '客房')
  const publicTasks  = allTasks.filter(t => t.room?.room_type !== '客房')

  // 客房按樓層分組
  const guestByFloor = new Map<string, typeof allTasks>()
  for (const t of guestTasks) {
    const floor = t.room?.floor ?? '其他'
    if (!guestByFloor.has(floor)) guestByFloor.set(floor, [])
    guestByFloor.get(floor)!.push(t)
  }

  // 公共空間按樓層分組
  const publicByFloor = new Map<string, typeof allTasks>()
  for (const t of publicTasks) {
    const floor = t.room?.floor ?? '全棟'
    if (!publicByFloor.has(floor)) publicByFloor.set(floor, [])
    publicByFloor.get(floor)!.push(t)
  }

  const bubbles: any[] = [
    summaryBubble(today, allTasks.length, doneTasks, urgentCount, allAdhoc.length, plan.status),
  ]

  // 客房：全部樓層合併一張
  if (guestByFloor.size > 0) {
    bubbles.push(combinedBubble('🛏 客房派工', '#1E40AF', guestByFloor, FLOOR_ORDER, '🛏'))
  }

  // 公共空間：全部樓層合併一張
  if (publicByFloor.size > 0) {
    bubbles.push(combinedBubble('🏢 公共空間', '#065F46', publicByFloor, [...FLOOR_ORDER, '全棟'], '📍'))
  }

  // 臨時派工卡
  if (allAdhoc.length > 0) {
    bubbles.push(adhocBubble(allAdhoc))
  }

  return {
    type: 'flex',
    altText: `今日房務安排 ${today}（${allTasks.length} 項 / ${urgentCount} 緊急）`,
    contents: { type: 'carousel', contents: bubbles.slice(0, 12) },
  }
}
