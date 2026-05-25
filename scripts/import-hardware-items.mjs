// 匯入財產盤點表到 hardware_items
// 執行方式：node --env-file=.env.local scripts/import-hardware-items.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const jsonPath = new URL('./hardware-export.json', import.meta.url).pathname
  .replace(/^\/([A-Z]:)/, '$1') // Windows path fix

const raw = JSON.parse(readFileSync(jsonPath, 'utf8'))
const records = Array.isArray(raw) ? raw : [raw]

console.log(`讀取 ${records.length} 筆資料`)

// 清空舊的 hardware_items（保留 schema）
const { error: delError } = await supabase
  .from('hardware_items')
  .update({ is_active: false })
  .neq('id', '00000000-0000-0000-0000-000000000000')

if (delError) { console.error('清空失敗：', delError.message); process.exit(1) }

// 分批插入
const BATCH = 100
let total = 0
for (let i = 0; i < records.length; i += BATCH) {
  const batch = records.slice(i, i + BATCH).map(r => ({
    name:       r.name,
    item_group: r.item_group || null,
    category:   r.category || null,
    tags:       r.tags || [],
    location:   r.location || null,
    asset_no:   r.asset_no || null,
    notes:      r.notes || null,
    condition:  r.condition || 'good',
    is_active:  true,
  }))

  const { error } = await supabase.from('hardware_items').insert(batch)
  if (error) {
    console.error(`第 ${i} 批失敗：`, error.message)
    process.exit(1)
  }
  total += batch.length
  process.stdout.write(`\r已匯入 ${total}/${records.length}`)
}

console.log('\n✅ 匯入完成！')
