import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data: rooms } = await supabase.from('rooms').select('id,name,floor').eq('room_type','客房').order('sort_order')
console.log('ROOMS:', JSON.stringify(rooms))

const rooms201 = ['201','209','301','601','715']
const { data: residents } = await supabase.from('butler_residents').select('name,room,status').in('room', rooms201)
console.log('RESIDENTS sample:', JSON.stringify(residents))
