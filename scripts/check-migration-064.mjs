import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

for (const table of ['butler_handover_comments', 'butler_handover_likes']) {
  const { error } = await sb.from(table).select('id').limit(1)
  console.log(table, error ? `MISSING (${error.message})` : 'OK')
}
