'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateCleaningDuty } from '@/lib/cleaning-duty'

export async function getCleaningDuty(start: string, end: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cleaning_duty_assignments')
    .select('schedule_date, period, staff_names')
    .gte('schedule_date', start).lte('schedule_date', end)
  if (error) throw error
  return data ?? []
}

export async function regenerateCleaningDuty(start: string, end: string) {
  const result = await generateCleaningDuty(start, end)
  revalidatePath('/butler/cleaning')
  return result
}

export async function updateCleaningDuty(date: string, period: 'AM' | 'PM', staffNames: string[]) {
  const authed = await createClient()
  const { data: { user } } = await authed.auth.getUser()
  const { data: profile } = await authed.from('user_profiles').select('role').eq('id', user?.id ?? '').single()
  if (!profile || !['admin', 'manager', 'butler_manager'].includes(profile.role)) {
    throw new Error('Unauthorized')
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('cleaning_duty_assignments').upsert({
    schedule_date: date,
    period,
    staff_names: staffNames,
  }, { onConflict: 'schedule_date,period' })
  if (error) throw error
  revalidatePath('/butler/cleaning')
}
