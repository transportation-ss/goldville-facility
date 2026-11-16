// 交接本主題（固定清單，存成純文字欄位 topic，不是 enum/外鍵）。
// 要增減主題只改這裡，不需要 migration；舊資料的主題字串即使不在清單內也照常顯示。
export const HANDOVER_TOPICS = ['餐廳', '住民', '設備', '交通', '活動', '行政', '其他'] as const

export function isHandoverTopic(v: unknown): v is string {
  return typeof v === 'string' && (HANDOVER_TOPICS as readonly string[]).includes(v)
}
