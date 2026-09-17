import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data: overrides, error: e1 } = await supabase
  .from('room_rate_overrides')
  .select('room_name, monthly_price, yearly_price, weekly_price, discount_amount, note')
  .order('room_name')

if (e1) {
  console.log('052 未套用（room_rate_overrides 查詢失敗）：', e1.message)
} else {
  console.log('--- room_rate_overrides ---')
  console.table(overrides)
}

const { error: e2 } = await supabase
  .from('room_rate_override_log')
  .select('id, old_values, new_values')
  .limit(1)

console.log('room_rate_override_log jsonb 欄位：', e2 ? `失敗 - ${e2.message}` : 'OK')

const { error: e3 } = await supabase
  .from('misc_income_entries')
  .select('id')
  .limit(1)

console.log('053 misc_income_entries：', e3 ? `未套用 - ${e3.message}` : 'OK，table 已存在')
