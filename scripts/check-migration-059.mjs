import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { error } = await supabase
  .from('nightshift_extra_tasks')
  .select('id, assigned_to')
  .limit(1)

console.log('059 nightshift_extra_tasks.assigned_to：', error ? `未套用 - ${error.message}` : 'OK，欄位已存在')
