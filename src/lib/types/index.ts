// ============================================================
// 好好園館 工務管理系統 — 全域型別定義
// ============================================================

// ─────────────────────────────────────────
// 通用
// ─────────────────────────────────────────
export type UserRole = 'reporter' | 'technician' | 'manager' | 'admin'

export interface UserProfile {
  id: string
  display_name: string
  unit: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────
// 工務派工
// ─────────────────────────────────────────
export type WorkOrderPriority = 'urgent' | 'normal'
export type WorkOrderStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
export type PhotoType = 'before' | 'after' | 'reference'

export interface WorkOrder {
  id: string
  requester_name: string
  requester_unit: string
  priority: WorkOrderPriority
  location: string
  description: string
  special_notes: string | null
  status: WorkOrderStatus
  assigned_to: string | null
  requires_budget: boolean
  estimated_cost: number | null
  actual_cost: number | null
  budget_notes: string | null
  deadline: string | null
  completion_notes: string | null
  completed_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // relations
  assignee?: UserProfile
  photos?: WorkOrderPhoto[]
  replies?: WorkOrderReply[]
}

export interface WorkOrderPhoto {
  id: string
  work_order_id: string
  storage_path: string
  photo_type: PhotoType
  file_name: string | null
  uploaded_by: string | null
  uploaded_at: string
}

export interface WorkOrderReply {
  id: string
  work_order_id: string
  replied_by: string | null
  role_at_time: string | null
  content: string
  created_at: string
  user?: UserProfile
}

// ─────────────────────────────────────────
// 保養提醒
// ─────────────────────────────────────────
export type MaintenanceFrequency = 'monthly' | 'quarterly' | 'biannual' | 'yearly' | 'custom'

export interface MaintenanceSchedule {
  id: string
  name: string
  description: string | null
  category: string | null
  frequency: MaintenanceFrequency
  frequency_days: number | null
  responsible_unit: string | null
  vendor: string | null
  vendor_contact: string | null
  last_done_at: string | null
  next_due_at: string | null
  advance_notice_days: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  logs?: MaintenanceLog[]
}

export interface MaintenanceLog {
  id: string
  schedule_id: string
  done_at: string
  done_by: string | null
  vendor_used: string | null
  cost: number | null
  result: string | null
  notes: string | null
  next_due_at: string | null
  created_by: string | null
  created_at: string
}

// ─────────────────────────────────────────
// 硬體說明書
// ─────────────────────────────────────────
export type HardwareCondition = 'good' | 'fair' | 'poor' | 'decommissioned'

export interface HardwareItem {
  id: string
  name: string
  category: string | null
  location: string | null
  floor: string | null
  room_no: string | null
  brand: string | null
  model: string | null
  serial_no: string | null
  purchase_date: string | null
  warranty_expiry: string | null
  vendor: string | null
  vendor_contact: string | null
  asset_no: string | null
  condition: HardwareCondition
  common_issues: string | null
  troubleshooting: string | null
  specs: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────
// 耗材進銷存
// ─────────────────────────────────────────
export type TransactionType = 'in' | 'out' | 'adjust'

export interface Consumable {
  id: string
  name: string
  category: string | null
  use_case: string | null
  storage_location: string | null
  unit: string
  current_quantity: number
  min_quantity: number
  unit_cost: number | null
  vendor: string | null
  vendor_contact: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // computed
  is_low_stock?: boolean
}

export interface ConsumableTransaction {
  id: string
  consumable_id: string
  type: TransactionType
  quantity: number
  quantity_before: number | null
  quantity_after: number | null
  work_order_id: string | null
  reason: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  consumable?: Consumable
  work_order?: WorkOrder
  user?: UserProfile
}

// ─────────────────────────────────────────
// 房間硬體
// ─────────────────────────────────────────
export interface Room {
  id: string
  name: string
  floor: string | null
  room_type: string | null
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  hardware?: RoomHardware[]
}

export interface RoomHardware {
  id: string
  room_id: string
  name: string
  category: string | null
  brand: string | null
  model: string | null
  serial_no: string | null
  condition: HardwareCondition
  install_date: string | null
  notes: string | null
  hardware_id: string | null
  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────
// 房間盤點快照
// ─────────────────────────────────────────
export type BedType = '雙人床' | '雙單人床' | '單人床' | '合併一大床'
export type FridgeSize = '大' | '小' | '無'
export type SofaType = '無' | '沙發床' | '一般沙發'
export type HeadboardType = '收納型' | '一般型'

export interface RoomInventory {
  id: string
  room_id: string
  snapshot_date: string
  is_initial: boolean
  change_reason: string | null
  bed_type: BedType | null
  wardrobe: boolean | null
  fridge_size: FridgeSize | null
  sofa_type: SofaType | null
  washer: boolean | null
  ac_count: number | null
  has_accessible: boolean | null
  accessible_notes: string | null
  tv_count: number | null
  dresser_6drawer: boolean | null
  bedside_table_count: number | null
  headboard_type: HeadboardType | null
  kettle: boolean | null
  desk: boolean | null
  chair_count: number | null
  trash_bin_count: number | null
  drying_rack: boolean | null
  notes: string | null
  created_at: string
  created_by: string | null
  creator?: UserProfile
}

// ─────────────────────────────────────────
// 水電抄表
// ─────────────────────────────────────────
export type MeterType = 'water' | 'electricity'
export type SessionStatus = 'complete' | 'partial' | 'draft'

export interface UtilityMeter {
  id: string
  name: string
  meter_type: MeterType
  location: string | null
  floor: string | null
  room_no: string | null
  meter_no: string | null
  unit: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface UtilitySession {
  id: string
  reading_date: string
  status: SessionStatus
  special_notes: string | null
  recorded_by: string | null
  created_at: string
  updated_at: string
  readings?: UtilityReading[]
  user?: UserProfile
}

export interface UtilityReading {
  id: string
  session_id: string
  meter_id: string
  reading_value: number | null
  previous_value: number | null
  usage_amount: number | null
  is_abnormal: boolean
  abnormal_notes: string | null
  is_acknowledged: boolean
  meter?: UtilityMeter
}

// ─────────────────────────────────────────
// Dashboard 統計
// ─────────────────────────────────────────
export interface DashboardStats {
  workOrders: {
    total: number
    pending: number
    inProgress: number
    completedToday: number
    overdue: number
    urgent: number
  }
  maintenance: {
    dueSoon: number      // 14 天內到期
    overdue: number
  }
  consumables: {
    lowStock: number
  }
  utilities: {
    lastReadingDate: string | null
    abnormalCount: number
  }
}
