import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { error } = await supabase
  .from('butler_residents')
  .select('id, transport_aliases')
  .limit(1)

console.log('060 butler_residents.transport_aliases：', error ? `未套用 - ${error.message}` : 'OK，欄位已存在')
