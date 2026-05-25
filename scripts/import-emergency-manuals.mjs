// 匯入緊急維修說明書從 Google Sheet
// 執行方式：node --env-file=.env.local scripts/import-emergency-manuals.mjs

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SHEET_ID = '1jvLkfVNNW8XG3JBwUdYY54IGSMBPMFux9Zy4cVlF01I'
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`

const VALID_FLOORS = new Set(['B1', '1F', '2F', '3F', '5F', '6F', '7F', '8F',
  '2F-7F', 'R1', 'R2', 'R3', 'R樓'])

async function fetchCSV() {
  const res = await fetch(CSV_URL, { redirect: 'follow' })
  if (!res.ok) throw new Error('CSV 下載失敗：' + res.status)
  return res.text()
}

// 完整 RFC-4180 CSV 解析器（支援引號內換行）
function parseCSVFull(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2 }
      else if (ch === '"') { inQuotes = false; i++ }
      else { field += ch; i++ }
    } else {
      if (ch === '"') { inQuotes = true; i++ }
      else if (ch === ',') { row.push(field.trim()); field = ''; i++ }
      else if (ch === '\r') { i++ }
      else if (ch === '\n') {
        row.push(field.trim())
        rows.push(row)
        row = []; field = ''; i++
      } else { field += ch; i++ }
    }
  }
  if (field || row.length > 0) { row.push(field.trim()); rows.push(row) }
  return rows
}

async function main() {
  console.log('下載 Google Sheet...')
  const csv = await fetchCSV()
  const rows = parseCSVFull(csv)
  console.log('總行數：', rows.length)

  const records = []
  let sortOrder = 0
  let skipped = 0

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i]
    const floor = (cols[0] || '').trim()
    const subLocation = (cols[1] || '').trim()
    const equipmentName = (cols[2] || '').trim()
    const issueDesc = (cols[3] || '').trim()
    const repairMethod = (cols[4] || '').trim()
    const vendorPhone = (cols[5] || '').trim()

    // 全空跳過
    if (!floor && !subLocation && !equipmentName && !issueDesc && !repairMethod) continue

    // 標題/分隔行跳過（floor 有值但不是有效樓層）
    if (floor && !VALID_FLOORS.has(floor)) {
      console.log(`  跳過：${floor}`)
      skipped++
      continue
    }

    records.push({
      floor: floor || '',
      sub_location: subLocation || null,
      equipment_name: equipmentName || null,
      issue_desc: issueDesc || null,
      repair_method: repairMethod || null,
      vendor_phone: vendorPhone || null,
      sort_order: sortOrder++,
    })
  }

  console.log(`有效 ${records.length} 筆，跳過 ${skipped} 筆`)

  // 清空舊資料
  const { error: delError } = await supabase
    .from('emergency_manuals')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (delError) { console.error('清空失敗：', delError.message); process.exit(1) }

  // 分批插入
  const BATCH = 50
  let total = 0
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const { error } = await supabase.from('emergency_manuals').insert(batch)
    if (error) { console.error(`第 ${i} 批失敗：`, error.message); process.exit(1) }
    total += batch.length
    console.log(`已匯入 ${total}/${records.length}`)
  }
  console.log('✅ 匯入完成！')
}

main().catch(e => { console.error(e); process.exit(1) })
