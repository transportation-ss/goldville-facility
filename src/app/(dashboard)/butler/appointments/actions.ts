'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type AppointmentCase = {
  id: string
  resident_id: string
  status: 'pending' | 'matched' | 'dispatched' | 'notified' | 'done' | 'cancelled'
  appointment_date: string
  appointment_time: string | null
  appointment_location: string | null
  requested_by_line_id: string
  requested_at: string
  claimed_by_line_id: string | null
  claimed_at: string | null
  matched_staff: string | null
  matched_time: string | null
  matched_by_line_id: string | null
  notes: string | null
  trip_id: string | null
  dispatched_by_line_id: string | null
  dispatched_at: string | null
  line_group_id: string | null
  created_at: string
  updated_at: string
  resident: { name: string; room: string | null } | null
}

export async function getAllAppointmentCases(): Promise<AppointmentCase[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('appointment_cases')
    .select('*, resident:butler_residents(name, room)')
    .order('appointment_date', { ascending: false })
  return (data ?? []) as AppointmentCase[]
}
