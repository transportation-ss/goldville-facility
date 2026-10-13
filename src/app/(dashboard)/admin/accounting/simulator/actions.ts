'use server'

import { createClient } from '@/lib/supabase/server'
import type { Model } from '@/lib/simulator/engine'

export type EnvMeta = {
  id: string
  name: string
  derived_from: string | null
  derived_at: string | null
  updated_at: string
}

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')
  return { supabase, userId: user.id }
}

export async function listEnvironments(): Promise<EnvMeta[]> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from('sim_environments')
    .select('id, name, derived_from, derived_at, updated_at')
    .order('created_at')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getEnvironmentModel(id: string): Promise<Model> {
  const { supabase } = await requireUser()
  const { data, error } = await supabase.from('sim_environments').select('model').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data.model as Model
}

// derivedFrom：複製自哪個環境（僅紀錄）
export async function createEnvironment(name: string, model: Model, derivedFrom?: string): Promise<EnvMeta> {
  const { supabase, userId } = await requireUser()
  const trimmed = name.trim()
  if (!trimmed) throw new Error('請輸入環境名稱')
  const { data, error } = await supabase
    .from('sim_environments')
    .insert({
      name: trimmed, model,
      derived_from: derivedFrom ?? null,
      derived_at: derivedFrom ? new Date().toISOString() : null,
      created_by: userId, updated_by: userId,
    })
    .select('id, name, derived_from, derived_at, updated_at')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function saveEnvironment(id: string, model: Model): Promise<string> {
  const { supabase, userId } = await requireUser()
  const updated_at = new Date().toISOString()
  const { error } = await supabase
    .from('sim_environments')
    .update({ model, updated_at, updated_by: userId })
    .eq('id', id)
  if (error) throw new Error(error.message)
  return updated_at
}

export async function renameEnvironment(id: string, name: string) {
  const { supabase, userId } = await requireUser()
  const trimmed = name.trim()
  if (!trimmed) throw new Error('請輸入環境名稱')
  const { error } = await supabase
    .from('sim_environments')
    .update({ name: trimmed, updated_at: new Date().toISOString(), updated_by: userId })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteEnvironment(id: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('sim_environments').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
