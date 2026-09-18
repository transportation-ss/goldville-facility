'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type RateConfigFields = {
  weekly_low: number | null
  monthly_low: number
  yearly_low: number
  core_member_low: number | null
  monthly_high: number
  care_light: number
  care_medium: number
  care_medium_heavy: number
  care_heavy: number
  second_family: number
  second_caregiver: number
  year_utility: number
}

const FIELD_KEYS: (keyof RateConfigFields)[] = [
  'weekly_low', 'monthly_low', 'yearly_low', 'core_member_low', 'monthly_high',
  'care_light', 'care_medium', 'care_medium_heavy', 'care_heavy',
  'second_family', 'second_caregiver', 'year_utility',
]

export async function updateRateConfig(updates: RateConfigFields) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { data: current, error: fetchError } = await supabase
    .from('room_rate_config')
    .select('*')
    .eq('id', 1)
    .single()
  if (fetchError) throw new Error(fetchError.message)

  const oldValues: Record<string, number | null> = {}
  const newValues: Record<string, number | null> = {}
  for (const key of FIELD_KEYS) {
    if (current[key] !== updates[key]) {
      oldValues[key] = current[key]
      newValues[key] = updates[key]
    }
  }

  if (Object.keys(newValues).length === 0) return

  const { error: updateError } = await supabase
    .from('room_rate_config')
    .update({ ...updates, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', 1)
  if (updateError) throw new Error(updateError.message)

  const { error: logError } = await supabase
    .from('room_rate_config_log')
    .insert({ changed_by: user.id, old_values: oldValues, new_values: newValues })
  if (logError) throw new Error(logError.message)

  revalidatePath('/admin/accounting/rate-catalog')
}

export type RateOverride = {
  room_name: string
  monthly_price: number | null
  yearly_price: number | null
  weekly_price: number | null
  discount_amount: number
  core_member_price: number | null
  note: string | null
}

const OVERRIDE_FIELD_KEYS = ['monthly_price', 'yearly_price', 'weekly_price', 'discount_amount', 'core_member_price'] as const

export async function updateRateOverride(input: RateOverride) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { data: current } = await supabase
    .from('room_rate_overrides')
    .select('monthly_price, yearly_price, weekly_price, discount_amount, core_member_price')
    .eq('room_name', input.room_name)
    .maybeSingle()

  const { error } = await supabase
    .from('room_rate_overrides')
    .upsert({ ...input, updated_at: new Date().toISOString(), updated_by: user.id })
  if (error) throw new Error(error.message)

  const oldValues: Record<string, number | null> = {}
  const newValues: Record<string, number | null> = {}
  for (const key of OVERRIDE_FIELD_KEYS) {
    const oldVal = current?.[key] ?? (key === 'discount_amount' ? 0 : null)
    if (oldVal !== input[key]) {
      oldValues[key] = oldVal
      newValues[key] = input[key]
    }
  }

  if (Object.keys(newValues).length > 0) {
    const { error: logError } = await supabase
      .from('room_rate_override_log')
      .insert({
        room_name: input.room_name,
        changed_by: user.id,
        old_values: oldValues,
        new_values: newValues,
      })
    if (logError) throw new Error(logError.message)
  }

  revalidatePath('/admin/accounting/rate-catalog')
}
