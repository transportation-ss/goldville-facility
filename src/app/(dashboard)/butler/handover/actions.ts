'use server'

import { createClient } from '@/lib/supabase/server'

export type HandoverNote = {
  id: string
  note_date: string
  title: string
  content: string
  author_id: string
  author_name: string
  created_at: string
}

function taiwanToday() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

export async function createHandoverNote(input: { title: string; content: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const title = input.title.trim()
  if (!title) throw new Error('請填寫標題')

  const { error } = await supabase.from('butler_handover_notes').insert({
    note_date: taiwanToday(),
    title,
    content: input.content.trim(),
    author_id: user.id,
  })
  if (error) throw new Error(error.message)
}

export async function deleteHandoverNote(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')
  const { error } = await supabase.from('butler_handover_notes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getHandoverNotesByMonth(year: number, month: number): Promise<HandoverNote[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')

  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data, error } = await supabase
    .from('butler_handover_notes')
    .select('id, note_date, title, content, author_id, created_at, author:user_profiles(display_name)')
    .gte('note_date', start)
    .lte('note_date', end)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)

  return (data ?? []).map(r => {
    const author = r.author as { display_name: string | null } | { display_name: string | null }[] | null
    const name = Array.isArray(author) ? author[0]?.display_name : author?.display_name
    return {
      id: r.id,
      note_date: r.note_date,
      title: r.title,
      content: r.content,
      author_id: r.author_id,
      author_name: name || '未知',
      created_at: r.created_at,
    }
  })
}
