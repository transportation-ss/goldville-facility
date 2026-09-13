'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ServiceCatalogItem = {
  id: string
  name: string
  type: 'package' | 'addon'
  price: number
  unit: string | null
  is_active: boolean
  created_at: string
}

export async function getServiceCatalog(): Promise<ServiceCatalogItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('service_catalog')
    .select('id, name, type, price, unit, is_active, created_at')
    .order('type')
    .order('price')
  return data ?? []
}

export async function createServiceCatalogItem(input: {
  name: string
  type: 'package' | 'addon'
  price: number
  unit?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const { error } = await supabase.from('service_catalog').insert({
    ...input,
    created_by: user.id,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/services')
}

export async function updateServiceCatalogItem(id: string, updates: Partial<{
  name: string
  type: 'package' | 'addon'
  price: number
  unit: string | null
  is_active: boolean
}>) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('service_catalog')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/services')
}

export async function deleteServiceCatalogItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('service_catalog').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/services')
}
