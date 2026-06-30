'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type EmploymentType = 'full_time' | 'part_time'
export type Gender = 'male' | 'female' | 'other'
export type Skill = 'driver' | 'sports' | 'activity_design' | 'other'

export type ButlerStaff = {
  id: string
  display_name: string
  role: string
  is_active: boolean
  employment_type: EmploymentType | null
  gender: Gender | null
  hire_date: string | null
  skills: Skill[]
  notes: string | null
  assigned_residents: { id: string; name: string; room: string | null }[]
}

export async function getButlerStaff(): Promise<ButlerStaff[]> {
  const supabase = createAdminClient()
  const [{ data: profiles }, { data: staffProfiles }, { data: residents }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, display_name, role, is_active')
      .in('role', ['butler', 'butler_manager'])
      .order('display_name'),
    supabase.from('butler_staff_profiles').select('*'),
    supabase.from('butler_residents').select('id, name, room, primary_butler_id').not('primary_butler_id', 'is', null),
  ])

  const staffMap = new Map((staffProfiles ?? []).map(s => [s.id, s]))
  const residentsByButler = new Map<string, { id: string; name: string; room: string | null }[]>()
  for (const r of residents ?? []) {
    if (!r.primary_butler_id) continue
    const list = residentsByButler.get(r.primary_butler_id) ?? []
    list.push({ id: r.id, name: r.name, room: r.room })
    residentsByButler.set(r.primary_butler_id, list)
  }

  return (profiles ?? []).map(p => {
    const sp = staffMap.get(p.id)
    return {
      id: p.id,
      display_name: p.display_name,
      role: p.role,
      is_active: p.is_active,
      employment_type: sp?.employment_type ?? null,
      gender: sp?.gender ?? null,
      hire_date: sp?.hire_date ?? null,
      skills: sp?.skills ?? [],
      notes: sp?.notes ?? null,
      assigned_residents: residentsByButler.get(p.id) ?? [],
    }
  })
}

export async function updateButlerStaffProfile(id: string, input: {
  employment_type: EmploymentType | null
  gender: Gender | null
  hire_date: string | null
  skills: Skill[]
  notes: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('butler_staff_profiles')
    .upsert({ id, ...input, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
  revalidatePath('/butler/staff')
}
