/**
 * 匯入 115.07（2026-07）加值服務確定資料到 room_income_entries
 * 來源：115.07加值服務表-給紹堯.xlsx
 *
 * 這份表只有「加值服務」金額（照顧包/固定收/非固定收），沒有房費資料，
 * 所以 billing_cycle 先預設「月租」、first_person_fee/second_person_fee 先留 0，
 * 房費部分留給會計之後手動在頁面上用「帶入建議費率」補上。
 *
 * 執行方式：
 *   node --env-file=.env.local scripts/import-2026-07-value-added.mjs
 */
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const PERIOD_MONTH = '2026-07-01'

// 室別 | 住戶姓名(可能含括號註記) | 照顧包 | 非照顧包固定收 | 非固定收 | 備註
const ROWS = [
  ['201', '廖偉強(張智貞)', 0, 26400, 2340, null],
  ['202', '謝昭文', 0, 0, 7215, null],
  ['206', '陳器斗', 20000, 0, 390, null],
  ['209', '許銀城(看護)', 0, 0, 780, null],
  ['210', '張淑芬', 0, 0, 585, null],
  ['213', '林勝男', 10000, 3000, 0, null],
  ['215', '黃筱琳', 0, 0, 5600, null],
  ['216', '陳仲蘭', 0, 0, 420, null],
  ['301', '蕭守樑(溫碧梨)', 20000, 0, 0, null],
  ['307', '吳志銘', 10000, 0, 0, null],
  ['309', '涂錦鳳', 0, 0, 1200, null],
  ['310', '吳碧金', 0, 0, 1200, null],
  ['312', '朱嘉政', 0, 0, 780, null],
  ['316', '鍾陳尾', 10000, 3000, 1170, null],
  ['601', '林瑞瑤(看護)', 5000, 0, 585, null],
  ['602', 'Charlotte Adelheid', 0, 0, 585, null],
  ['603', '盧荷英', 10000, 0, 585, null],
  ['605', '許潘綿', 10000, 0, 0, null],
  ['606', '楊潮海', 10000, 3000, 390, null],
  ['611', '詹掌妹', 0, 0, 1560, null],
  ['615', '劉許秀容', 5000, 0, 2414, null],
  ['705', '張俊玉', 10000, 0, 0, null],
  ['707', '白英', 10000, 0, 2145, null],
  ['708', '辛秀妹', 0, 0, 30, null],
  ['709', '金蕙珍', 0, 11700, 3390, null],
  ['710', '王佩琳', 0, 11700, 5070, null],
  ['712', '張正和', 6370, 0, 0, '原照顧包1萬/月，7月11天未使用'],
  ['715', '洪麗華(看護)', 13400, 0, 30, '原照顧包2萬/月，7月10天未使用'],
]

// 無房號、非住戶的加值服務收入（例如未入住前的照顧包）
const MISC_ROWS = [
  { name: '黃惠美', category: '未入住的服務費用', amount: 20000, notes: '照顧包115.06.18-115.07.18' },
]

function parseNameAnnotation(raw) {
  const m = raw.match(/^(.+?)\(([^)]+)\)$/)
  if (!m) return { name: raw, annotation: null }
  return { name: m[1], annotation: m[2] }
}

const { data: rooms, error: roomsErr } = await supabase.from('rooms').select('id, name')
if (roomsErr) throw roomsErr
const roomByName = new Map(rooms.map(r => [r.name, r.id]))

const { data: residents, error: residentsErr } = await supabase
  .from('butler_residents')
  .select('name, room, status')
  .neq('status', 'inactive')
if (residentsErr) throw residentsErr
const residentsByRoom = new Map()
for (const r of residents) {
  if (!residentsByRoom.has(r.room)) residentsByRoom.set(r.room, [])
  residentsByRoom.get(r.room).push(r.name)
}

let imported = 0
let skipped = 0

for (const [roomName, rawName, careAmt, fixedAmt, addonAmt, note] of ROWS) {
  const roomId = roomByName.get(roomName)
  if (!roomId) {
    console.warn(`跳過：找不到房間 ${roomName}`)
    skipped++
    continue
  }

  const { name, annotation } = parseNameAnnotation(rawName)
  let annotationNote = null
  if (annotation === '看護') {
    annotationNote = `${name} 有看護同住（照顧者，24000/月，非住戶列表成員）`
  } else if (annotation) {
    const roommates = residentsByRoom.get(roomName) ?? []
    if (roommates.includes(annotation)) {
      annotationNote = `${name} 與 ${annotation} 同房同住`
    } else {
      console.warn(`提醒：${roomName} 的 ${name}(${annotation}) 在住戶列表中找不到 ${annotation} 同房，請人工確認`)
      annotationNote = `${name} 標註同住者 ${annotation}（住戶列表未確認到同房，請人工複查）`
    }
  }

  const fixed_services = []
  if (careAmt > 0) fixed_services.push({ item: '照顧包', amount: careAmt })
  if (fixedAmt > 0) fixed_services.push({ item: '固定加值服務', amount: fixedAmt })

  const addon_services = []
  if (addonAmt > 0) addon_services.push({ item: '非固定加值服務', amount: addonAmt })

  const notes = [annotationNote, note].filter(Boolean).join('；') || null

  const { error } = await supabase.from('room_income_entries').upsert(
    {
      room_id: roomId,
      period_month: PERIOD_MONTH,
      billing_cycle: '月租',
      first_person_fee: 0,
      second_person_fee: 0,
      second_person_category: null,
      caregiver_cohabiting: annotation === '看護',
      utility_fee: 0,
      fixed_services,
      addon_services,
      notes,
    },
    { onConflict: 'room_id,period_month' }
  )

  if (error) {
    console.error(`失敗：${roomName} (${name})`, error.message)
    continue
  }
  imported++
  console.log(`已匯入 ${roomName} - ${name}${annotation ? `(${annotation})` : ''}`)
}

let miscImported = 0
for (const row of MISC_ROWS) {
  const { error } = await supabase.from('misc_income_entries').insert({
    period_month: PERIOD_MONTH,
    resident_name: row.name,
    category: row.category,
    amount: row.amount,
    notes: row.notes,
  })
  if (error) {
    console.error(`非房間收入匯入失敗：${row.name}`, error.message)
    continue
  }
  miscImported++
  console.log(`已匯入非房間收入 ${row.name} - ${row.category} ${row.amount}`)
}

console.log(`\n完成：房間收入匯入 ${imported} 筆，跳過 ${skipped} 筆（無房號可對應）；非房間收入匯入 ${miscImported} 筆`)
console.log('提醒：房費部分（房間收入）尚未填入，請至房間收入頁面用「帶入建議費率」補上。')
