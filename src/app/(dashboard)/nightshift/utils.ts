// 大夜班日期邏輯：14:00 前算前一天的班
export function getNightshiftDate(): string {
  const now = new Date()
  if (now.getHours() < 14) {
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }
  return now.toISOString().split('T')[0]
}
