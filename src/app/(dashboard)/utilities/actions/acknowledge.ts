'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function acknowledgeAbnormal(readingId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('utility_readings')
    .update({ is_acknowledged: true })
    .eq('id', readingId)

  if (error) throw new Error(error.message)

  revalidatePath('/utilities')
}
