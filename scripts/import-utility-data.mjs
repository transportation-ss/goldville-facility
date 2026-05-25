/**
 * 好好園館 水電抄表歷史資料匯入腳本
 *
 * 用途：把 Google Sheet 的歷史抄表資料一次性匯入 Supabase
 *
 * 執行方式：
 *   node --env-file=.env.local scripts/import-utility-data.mjs
 *
 * 需要 .env.local 包含：
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...   ← 從 Supabase Dashboard > Settings > API 取得
 */

import { createClient } from '@supabase/supabase-js'

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1rw68pob4e704LJvgdwAq527ItyAZYA9enKBKCn90fEQ/export?format=csv'

// ── 欄位名稱 → 資料庫 meter name 的對應邏輯 ─────────────────
function colToMeterName(col) {
  col = col.trim()

  // 公共區域固定對應
  const publicMap = {
    '頂樓水': '頂樓水表',
    '1F醫護室水': '1F醫護室水表',
    '1E體驗教室水': '1E體驗教室水表',
    '1D美容院水': '1D美容院水表',
    '1C餐廳水': '1C餐廳水表',
    '1B烘焙坊水': '1B烘焙坊水表',
    '1A物理治療室水': '1A物理治療室水表',
    '小館電表': '小館電表',
    '8F電表': '8F電表',
  }
  if (publicMap[col]) return publicMap[col]

  // 房間水表：201房(表號2F-1)水 → 201房水表
  const waterMatch = col.match(/^(\d+)房\(.*\)水$/)
  if (waterMatch) return `${waterMatch[1]}房水表`

  // 房間電表：201房(表號2F-1) 電 → 201房電表
  const elecMatch = col.match(/^(\d+)房\(.*\)\s*電$/)
  if (elecMatch) return `${elecMatch[1]}房電表`

  return null
}

// ── 簡易 CSV 解析（支援帶引號的欄位）───────────────────────
function parseCSV(text) {
  const rows = []
  // 統一換行符
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  for (const line of lines) {
    if (!line.trim()) continue
    const cols = []
    let inQuote = false
    let current = ''

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        // 連續兩個引號 = 跳脫引號
        if (inQuote && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuote = !inQuote
        }
      } else if (ch === ',' && !inQuote) {
        cols.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    cols.push(current.trim())
    rows.push(cols)
  }
  return rows
}

// ── 日期解析：2022/8/17、2022/08/17、24/6/22 → 2022-08-17 ──
function parseDate(str) {
  if (!str) return null
  const parts = str.trim().split('/')
  if (parts.length !== 3) return null
  let year = parseInt(parts[0])
  const month = parseInt(parts[1])
  const day = parseInt(parts[2])
  // 處理 2 位數年份（Google Sheet 部分列格式：24/6/22）
  if (year < 100) year += 2000
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

// ── 主程式 ──────────────────────────────────────────────────
async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('❌ 缺少環境變數：NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
    console.error('   請確認 .env.local 有設定這兩個值')
    process.exit(1)
  }

  // 使用 service role key（繞過 RLS）
  const supabase = createClient(supabaseUrl, serviceKey)

  // 1. 抓取 Google Sheet CSV
  console.log('📥 正在下載 Google Sheet 資料...')
  const res = await fetch(SHEET_CSV_URL, { redirect: 'follow' })
  if (!res.ok) {
    console.error(`❌ 下載失敗：HTTP ${res.status}`)
    process.exit(1)
  }
  const csvText = await res.text()
  console.log(`✅ 下載完成，資料大小：${Math.round(csvText.length / 1024)} KB`)

  // 2. 解析 CSV
  const rows = parseCSV(csvText)
  const headers = rows[0]
  // 過濾掉沒有抄表日期的列（最後一欄是「確認送出嗎？」的空行、標題行等）
  const dataRows = rows.slice(1).filter(r => r[1] && r[1].trim() && r[1].includes('/'))
  console.log(`📊 找到 ${dataRows.length} 筆抄表記錄`)

  // 3. 從資料庫取得所有表計
  const { data: meters, error: meterError } = await supabase
    .from('utility_meters')
    .select('id, name, is_active')
  if (meterError) {
    console.error('❌ 無法讀取表計資料：', meterError.message)
    process.exit(1)
  }

  // name → id 對應表（含已停用的，避免匯入遺漏）
  const meterByName = {}
  for (const m of meters) {
    meterByName[m.name] = m.id
  }
  console.log(`🔌 資料庫共 ${meters.length} 個表計`)

  // 4. 建立欄位索引 → meter ID 的對應
  const colIndexToMeterId = {}
  let mappedCount = 0
  for (let i = 0; i < headers.length; i++) {
    const meterName = colToMeterName(headers[i])
    if (meterName) {
      if (meterByName[meterName]) {
        colIndexToMeterId[i] = meterByName[meterName]
        mappedCount++
      } else {
        console.warn(`⚠️  欄位「${headers[i]}」找不到對應表計「${meterName}」`)
      }
    }
  }
  console.log(`🔗 成功對應 ${mappedCount} 個表計欄位`)

  // 5. 依抄表日期排序（舊到新）
  dataRows.sort((a, b) => {
    const da = new Date(a[1].replace(/\//g, '-'))
    const db = new Date(b[1].replace(/\//g, '-'))
    return da - db
  })

  // 6. 逐筆匯入
  // prevReadings: meterId → { currentVal, lastUsage, prevLastUsage }
  // 用來計算 usage_amount 和異常偵測
  const prevReadings = {}

  let sessionCount = 0
  let readingCount = 0
  let abnormalCount = 0
  let skippedCount = 0

  for (const row of dataRows) {
    const readingDate = parseDate(row[1])
    if (!readingDate) {
      console.warn(`⚠️  無效日期：${row[1]}，略過`)
      skippedCount++
      continue
    }

    const specialNotes = row[3]?.trim() || null

    // 建立 session
    const { data: session, error: sessionError } = await supabase
      .from('utility_sessions')
      .insert({
        reading_date: readingDate,
        status: 'complete',
        special_notes: specialNotes,
      })
      .select('id')
      .single()

    if (sessionError) {
      console.error(`❌ 建立 session 失敗（${readingDate}）：`, sessionError.message)
      skippedCount++
      continue
    }

    // 收集本次 session 的所有讀數
    const readings = []

    for (let i = 4; i < row.length; i++) {
      const meterId = colIndexToMeterId[i]
      if (!meterId) continue

      const valStr = row[i]?.trim()
      if (!valStr) continue

      const value = parseFloat(valStr)
      if (isNaN(value)) continue

      const prev = prevReadings[meterId]
      const previousValue = prev ? prev.currentVal : null
      const usageAmount = previousValue !== null ? value - previousValue : null

      // 異常偵測：用量超過前兩期平均的 10%
      let isAbnormal = false
      let abnormalNotes = null

      if (
        usageAmount !== null &&
        usageAmount > 0 &&
        prev?.lastUsage != null &&
        prev?.prevLastUsage != null
      ) {
        const avgPrev2 = (prev.lastUsage + prev.prevLastUsage) / 2
        if (avgPrev2 > 0 && usageAmount > avgPrev2 * 1.2) {
          isAbnormal = true
          abnormalNotes = `用量 ${usageAmount.toFixed(1)} 超過前兩期平均 ${avgPrev2.toFixed(1)} 的 20%`
          abnormalCount++
        }
      }

      readings.push({
        session_id: session.id,
        meter_id: meterId,
        reading_value: value,
        previous_value: previousValue,
        // usage_amount 是 GENERATED ALWAYS 欄位，資料庫自動計算，不需插入
        is_abnormal: isAbnormal,
        abnormal_notes: abnormalNotes,
      })

      // 更新前期記錄
      prevReadings[meterId] = {
        currentVal: value,
        lastUsage: usageAmount,
        prevLastUsage: prev?.lastUsage ?? null,
      }
    }

    if (readings.length > 0) {
      const { error: readError } = await supabase
        .from('utility_readings')
        .insert(readings)

      if (readError) {
        console.error(`❌ 讀數寫入失敗（${readingDate}）：`, readError.message)
      } else {
        readingCount += readings.length
      }
    }

    sessionCount++
    if (sessionCount % 10 === 0) {
      process.stdout.write(`\r⏳ 已處理 ${sessionCount}/${dataRows.length} 筆...`)
    }
  }

  console.log('\n')
  console.log('═══════════════════════════════════════')
  console.log(`✅ 匯入完成！`)
  console.log(`   Session（抄表批次）：${sessionCount} 筆`)
  console.log(`   讀數紀錄：           ${readingCount} 筆`)
  console.log(`   異常標記：           ${abnormalCount} 筆`)
  console.log(`   略過：               ${skippedCount} 筆`)
  console.log('═══════════════════════════════════════')
}

main().catch(err => {
  console.error('❌ 腳本執行失敗：', err)
  process.exit(1)
})
