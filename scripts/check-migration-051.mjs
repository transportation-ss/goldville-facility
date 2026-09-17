import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await supabase.from('room_rate_config').select('*').eq('id', 1).single()
console.log('room_rate_config:', error ? `ERROR: ${error.message}` : JSON.stringify(data))

const { data: overrides, error: overrideError } = await supabase.from('room_rate_overrides').select('*')
console.log('room_rate_overrides:', overrideError ? `ERROR: ${overrideError.message}` : JSON.stringify(overrides))
