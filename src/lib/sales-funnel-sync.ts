/**
 * Google Sheets 業務統計同步工具
 * Sheet: https://docs.google.com/spreadsheets/d/1clbJQroRE5Al2X10FSbSPK2W0DPwdDRMjcDlawoq94o
 * 分頁：「客服來電數統計」→ gid=1197083364
 *
 * 欄位（0-based）：
 *   1  日期
 *   2  (第一次)來電/walkin 總數
 *   9  回電/參觀追蹤 總數
 *   17 參觀
 *   18 試住
 *   28 備註
 */

import { createAdminClient } from '@/lib/supabase/admin'

const SHEET_ID = '1clbJQroRE5Al2X10FSbSPK2W0DPwdDRMjcDlawoq94o'
const GID = '1197083364'

export type FunnelEntry = {
  date: string   // YYYY-MM-DD
  callIn: number
  callbackVisit: number
  visit: number
  trialStay: number
  notes: string | null
}

// ── 解析 CSV（quote-aware，支援欄位內嵌逗號/換行）─────────────
function parseCsv(csv: string): string[][] {
  const rows: string[][] = []
  let cells: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]
    if (ch === '"') {
      if (inQuotes && csv[i + 1] === '"') { cur += '"'; i++; continue }
      inQuotes = !inQuotes
    } else if (ch === '\r') {
      continue
    } else if (ch === '\n' && !inQuotes) {
      cells.push(cur)
      rows.push(cells)
      cells = []
      cur = ''
    } else if (ch === ',' && !inQuotes) {
      cells.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur !== '' || cells.length > 0) {
    cells.push(cur)
    rows.push(cells)
  }
  return rows
}

// ── 日期正規化：容忍 2025/12/22、2025/08/16、2026/9/1 等格式 ──
function normalizeDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  const [, y, mo, d] = m
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function toInt(raw: string | undefined): number {
  const n = parseInt((raw ?? '').trim(), 10)
  return Number.isFinite(n) ? n : 0
}

export async function fetchFunnelEntries(): Promise<FunnelEntry[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`
  const res = await fetch(url, { cache: 'no-store', redirect: 'follow' })
  if (!res.ok) throw new Error(`Google Sheet 讀取失敗：HTTP ${res.status}`)

  const grid = parseCsv(await res.text())
  const entries: FunnelEntry[] = []

  // 前 2 列是群組標題/子標題，資料從第 3 列開始
  for (const row of grid.slice(2)) {
    const date = normalizeDate(row[1] ?? '')
    if (!date) continue // 跳過空白日期列（含結尾殘留空白列）

    entries.push({
      date,
      callIn:        toInt(row[2]),
      callbackVisit: toInt(row[9]),
      visit:         toInt(row[17]),
      trialStay:     toInt(row[18]),
      notes:         (row[28] ?? '').trim() || null,
    })
  }

  return entries
}

// ── 同步到資料庫（以 entry_date upsert，供手動按鈕觸發）──────
export async function syncFunnelEntriesToDb() {
  const entries = await fetchFunnelEntries()
  const supabase = createAdminClient()

  if (entries.length === 0) return { synced: 0, total: 0 }

  const { error } = await supabase
    .from('sales_funnel_entries')
    .upsert(
      entries.map(e => ({
        entry_date: e.date,
        call_in_count: e.callIn,
        callback_visit_count: e.callbackVisit,
        visit_count: e.visit,
        trial_stay_count: e.trialStay,
        notes: e.notes,
      })),
      { onConflict: 'entry_date' }
    )

  if (error) throw new Error('同步寫入失敗：' + error.message)

  return { synced: entries.length, total: entries.length }
}
