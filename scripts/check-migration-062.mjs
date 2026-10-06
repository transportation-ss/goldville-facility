import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { error } = await supabase
  .from('butler_handover_notes')
  .select('id, note_date, title, content, author_id')
  .limit(1)

console.log('062 butler_handover_notes：', error ? `未套用 - ${error.message}` : 'OK，資料表已存在')
