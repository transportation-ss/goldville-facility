// 派工任務／服務紀錄的服務模組分類（對應 butler_tasks / butler_service_logs 的 category 欄位）
export type ServiceModuleKey = 'medication' | 'cleaning' | 'companion' | 'exercise' | 'activity'
export type ServiceCategory = ServiceModuleKey | 'other'
