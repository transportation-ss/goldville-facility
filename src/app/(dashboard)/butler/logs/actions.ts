'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { LogBlock } from '../residents/actions'

export type GroupActivity = {
  id: string
  author_id: string
  activity_date: string
  title: string
  content: LogBlock[]
  created_at: string
  updated_at: string
  author?: { display_name: string } | null
  participants?: {
    id: string
    resident_id: string | null
    staff_id: string | null
    resident?: { name: string; room: string | null } | null
    staff?: { display_name: string } | null
  }[]
}

export type StaffOption = { id: string; display_name: string }
export type ResidentOption = { id: string; name: string; room: string | null }

export async function getGroupActivities(): Promise<GroupActivity[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_group_activities')
    .select(`
      *,
      author:user_profiles!butler_group_activities_author_id_fkey(display_name),
      participants:butler_activity_participants(
        id, resident_id, staff_id,
        resident:butler_residents(name, room),
        staff:user_profiles(display_name)
      )
    `)
    .order('activity_date', { ascending: false })
  return (data ?? []) as GroupActivity[]
}

export async function getGroupActivity(id: string): Promise<GroupActivity | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_group_activities')
    .select(`
      *,
      author:user_profiles!butler_group_activities_author_id_fkey(display_name),
      participants:butler_activity_participants(
        id, resident_id, staff_id,
        resident:butler_residents(name, room),
        staff:user_profiles(display_name)
      )
    `)
    .eq('id', id)
    .single()
  return data as GroupActivity | null
}

export async function createGroupActivity(input: {
  activity_date: string
  title: string
  content: LogBlock[]
  participantResidentIds: string[]
  participantStaffIds: string[]
}): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('butler_group_activities')
    .insert({ author_id: user.id, activity_date: input.activity_date, title: input.title, content: input.content })
    .select('id')
    .single()
  if (error) throw new Error(error.message)

  const participantRows = [
    ...input.participantResidentIds.map(id => ({ activity_id: data.id, resident_id: id })),
    ...input.participantStaffIds.map(id => ({ activity_id: data.id, staff_id: id })),
  ]
  if (participantRows.length > 0) {
    await supabase.from('butler_activity_participants').insert(participantRows)
  }

  revalidatePath('/butler/logs')
  return data.id
}

export async function updateGroupActivity(id: string, input: {
  title: string
  content: LogBlock[]
  participantResidentIds: string[]
  participantStaffIds: string[]
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('butler_group_activities')
    .update({ title: input.title, content: input.content, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)

  await supabase.from('butler_activity_participants').delete().eq('activity_id', id)
  const rows = [
    ...input.participantResidentIds.map(rid => ({ activity_id: id, resident_id: rid })),
    ...input.participantStaffIds.map(sid => ({ activity_id: id, staff_id: sid })),
  ]
  if (rows.length > 0) await supabase.from('butler_activity_participants').insert(rows)

  revalidatePath('/butler/logs')
  revalidatePath(`/butler/logs/group/${id}`)
}

export async function deleteGroupActivity(id: string) {
  const supabase = await createClient()
  await supabase.from('butler_group_activities').delete().eq('id', id)
  revalidatePath('/butler/logs')
}

export async function getResidentOptions(): Promise<ResidentOption[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('butler_residents')
    .select('id, name, room')
    .in('status', ['active_resident', 'service_only'])
    .order('room', { ascending: true, nullsFirst: false })
    .order('name')
  return (data ?? []) as ResidentOption[]
}

export async function getStaffOptions(): Promise<StaffOption[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('user_profiles')
    .select('id, display_name')
    .in('role', ['butler', 'butler_manager'])
    .eq('is_active', true)
    .order('display_name')
  return (data ?? []) as StaffOption[]
}
