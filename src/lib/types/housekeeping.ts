export type TaskType =
  | 'checkout' | 'stay_over' | 'vacant' | 'late_checkout'
  | 'deep_clean' | 'vip' | 'dnd' | 'extra_bed'
  | 'maintenance_hold' | 'routine' | 'spot_clean'

export type TaskPriority = 'urgent' | 'normal'
export type TaskStatus   = 'pending' | 'in_progress' | 'completed' | 'skipped'
export type PlanStatus   = 'draft' | 'published' | 'completed'

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  checkout:         '退房打掃',
  stay_over:        '續住整理',
  vacant:           '空房整備',
  late_checkout:    '遲退打掃',
  deep_clean:       '深度清潔',
  vip:              'VIP備房',
  dnd:              '拒絕服務',
  extra_bed:        '加床準備',
  maintenance_hold: '工務維修中',
  routine:          '例行清潔',
  spot_clean:       '局部清潔',
}

export const TASK_TYPE_COLORS: Record<TaskType, string> = {
  checkout:         'bg-blue-100 text-blue-700',
  stay_over:        'bg-green-100 text-green-700',
  vacant:           'bg-gray-100 text-gray-600',
  late_checkout:    'bg-orange-100 text-orange-700',
  deep_clean:       'bg-purple-100 text-purple-700',
  vip:              'bg-yellow-100 text-yellow-700',
  dnd:              'bg-red-100 text-red-600',
  extra_bed:        'bg-pink-100 text-pink-700',
  maintenance_hold: 'bg-slate-100 text-slate-600',
  routine:          'bg-teal-100 text-teal-700',
  spot_clean:       'bg-cyan-100 text-cyan-700',
}

export const TASK_TYPE_ORDER = Object.keys(TASK_TYPE_LABELS) as TaskType[]

export const FLOOR_ORDER = ['B1', '1F', '2F', '3F', '5F', '6F', '7F', '8F']

// ── 共用排序：類型 → 樓層 → 房號(sort_order) ──────────────────
export function compareByTypeFloorRoom(
  a: { task_type?: TaskType | null; room?: { floor: string | null; sort_order?: number | null } | null },
  b: { task_type?: TaskType | null; room?: { floor: string | null; sort_order?: number | null } | null },
): number {
  const aType = a.task_type ? TASK_TYPE_ORDER.indexOf(a.task_type) : TASK_TYPE_ORDER.length
  const bType = b.task_type ? TASK_TYPE_ORDER.indexOf(b.task_type) : TASK_TYPE_ORDER.length
  if (aType !== bType) return aType - bType

  const aFloor = a.room?.floor ? FLOOR_ORDER.indexOf(a.room.floor) : FLOOR_ORDER.length
  const bFloor = b.room?.floor ? FLOOR_ORDER.indexOf(b.room.floor) : FLOOR_ORDER.length
  const aFloorIdx = aFloor === -1 ? FLOOR_ORDER.length : aFloor
  const bFloorIdx = bFloor === -1 ? FLOOR_ORDER.length : bFloor
  if (aFloorIdx !== bFloorIdx) return aFloorIdx - bFloorIdx

  const aSort = a.room?.sort_order ?? Number.MAX_SAFE_INTEGER
  const bSort = b.room?.sort_order ?? Number.MAX_SAFE_INTEGER
  return aSort - bSort
}

// ── 資料庫 row 型別 ──────────────────────────────────────

export interface HousekeepingPlan {
  id:            string
  plan_date:     string
  status:        PlanStatus
  general_notes: string | null
  created_by:    string | null
  published_at:  string | null
  created_at:    string
  updated_at:    string
}

export interface HousekeepingTask {
  id:                string
  plan_id:           string
  room_id:           string | null
  task_type:         TaskType
  priority:          TaskPriority
  special_notes:     string | null
  assigned_to:       string | null
  sort_order:        number
  status:            TaskStatus
  completed_by:      string | null
  completed_at:      string | null
  completion_notes:  string | null
  created_at:        string
  // joined
  room?:     { id: string; name: string; floor: string | null; room_type: string | null; sort_order?: number | null }
  assignee?: { id: string; display_name: string } | null
  completer?: { id: string; display_name: string } | null
}

export interface HousekeepingAdhocOrder {
  id:                string
  order_date:        string
  title:             string
  description:       string | null
  room_id:           string | null
  task_type:         TaskType | null
  priority:          TaskPriority
  assigned_to:       string | null
  status:            'pending' | 'completed'
  completed_by:      string | null
  completed_at:      string | null
  completion_notes:  string | null
  created_by:        string | null
  created_at:        string
  // joined
  room?:     { id: string; name: string; floor: string | null; sort_order?: number | null } | null
  assignee?: { id: string; display_name: string } | null
  completer?: { id: string; display_name: string } | null
}

// ── 選單用空間清單 ─────────────────────────────────────────
export interface SpaceOption {
  id:        string
  name:      string
  floor:     string | null
  room_type: string | null
  label:     string   // display: "201" or "1F 保健室"
}
