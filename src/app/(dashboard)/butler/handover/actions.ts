'use server'

import { createClient } from '@/lib/supabase/server'

export type HandoverLike = { user_id: string; user_name: string }

export type HandoverComment = {
  id: string
  note_id: string
  parent_id: string | null     // null = 第二層留言；有值 = 第三層回覆（指向第二層留言）
  reply_to_id: string | null   // 第三層回覆時，被回覆的那則留言（以引用呈現）
  content: string
  author_id: string
  author_name: string
  created_at: string
  likes: HandoverLike[]
}

export type HandoverNote = {
  id: string
  note_date: string
  title: string
  content: string
  author_id: string
  author_name: string
  created_at: string
  likes: HandoverLike[]
  comments: HandoverComment[]
}

type NameEmbed = { display_name: string | null } | { display_name: string | null }[] | null

function nameOf(embed: NameEmbed): string {
  const name = Array.isArray(embed) ? embed[0]?.display_name : embed?.display_name
  return name || '未知'
}

function taiwanToday() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('未登入')
  return { supabase, user }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function createHandoverNote(input: { title: string; content: string }) {
  const { supabase, user } = await requireUser()

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
  const { supabase } = await requireUser()
  const { error } = await supabase.from('butler_handover_notes').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * 新增留言。parentId = 被回覆的那則留言（可省略 = 直接留言在交接事項下）。
 * 最多三層：回覆第三層的留言時，仍掛在同一則第二層留言下，並以 reply_to_id 記錄引用對象。
 */
export async function createHandoverComment(input: { noteId: string; parentId?: string | null; content: string }) {
  const { supabase, user } = await requireUser()

  const content = input.content.trim()
  if (!content) throw new Error('請填寫留言內容')

  let parentId: string | null = null
  let replyToId: string | null = null

  if (input.parentId) {
    const { data: target, error: targetError } = await supabase
      .from('butler_handover_comments')
      .select('id, note_id, parent_id')
      .eq('id', input.parentId)
      .single()
    if (targetError || !target) throw new Error('找不到要回覆的留言')
    if (target.note_id !== input.noteId) throw new Error('留言不屬於這則交接事項')

    if (target.parent_id) {
      parentId = target.parent_id
      replyToId = target.id
    } else {
      parentId = target.id
    }
  }

  const { error } = await supabase.from('butler_handover_comments').insert({
    note_id: input.noteId,
    parent_id: parentId,
    reply_to_id: replyToId,
    content,
    author_id: user.id,
  })
  if (error) throw new Error(error.message)
}

export async function deleteHandoverComment(id: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from('butler_handover_comments').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** 對交接事項或留言點讚／收回讚（只能對別人的內容點讚）。 */
export async function toggleHandoverLike(input: { noteId?: string; commentId?: string }) {
  const { supabase, user } = await requireUser()
  if (!input.noteId === !input.commentId) throw new Error('參數錯誤')

  const table = input.noteId ? 'butler_handover_notes' : 'butler_handover_comments'
  const targetId = (input.noteId ?? input.commentId)!
  const { data: target } = await supabase.from(table).select('author_id').eq('id', targetId).single()
  if (!target) throw new Error('找不到內容')
  if (target.author_id === user.id) throw new Error('不能對自己的內容點讚')

  const column = input.noteId ? 'note_id' : 'comment_id'
  const { data: existing } = await supabase
    .from('butler_handover_likes')
    .select('id')
    .eq(column, targetId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('butler_handover_likes').delete().eq('id', existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('butler_handover_likes').insert({ [column]: targetId, user_id: user.id })
    if (error) throw new Error(error.message)
  }
}

export async function getHandoverNotesByMonth(year: number, month: number): Promise<HandoverNote[]> {
  const { supabase } = await requireUser()

  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const { data: notes, error } = await supabase
    .from('butler_handover_notes')
    .select('id, note_date, title, content, author_id, created_at, author:user_profiles(display_name)')
    .gte('note_date', start)
    .lte('note_date', end)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  if (!notes || notes.length === 0) return []

  // 以 id 分批查詢，避免一個月事項很多時網址過長
  const noteIds = notes.map(n => n.id)

  type CommentRow = {
    id: string; note_id: string; parent_id: string | null; reply_to_id: string | null
    content: string; author_id: string; created_at: string; author: NameEmbed
  }
  const commentRows: CommentRow[] = []
  for (const ids of chunk(noteIds, 50)) {
    const { data, error: cErr } = await supabase
      .from('butler_handover_comments')
      .select('id, note_id, parent_id, reply_to_id, content, author_id, created_at, author:user_profiles(display_name)')
      .in('note_id', ids)
      .order('created_at', { ascending: true })
    if (cErr) throw new Error(cErr.message)
    commentRows.push(...((data ?? []) as unknown as CommentRow[]))
  }

  type LikeRow = { note_id: string | null; comment_id: string | null; user_id: string; user: NameEmbed }
  const likeRows: LikeRow[] = []
  for (const ids of chunk(noteIds, 50)) {
    const { data, error: lErr } = await supabase
      .from('butler_handover_likes')
      .select('note_id, comment_id, user_id, user:user_profiles(display_name)')
      .in('note_id', ids)
    if (lErr) throw new Error(lErr.message)
    likeRows.push(...((data ?? []) as unknown as LikeRow[]))
  }
  for (const ids of chunk(commentRows.map(c => c.id), 50)) {
    const { data, error: lErr } = await supabase
      .from('butler_handover_likes')
      .select('note_id, comment_id, user_id, user:user_profiles(display_name)')
      .in('comment_id', ids)
    if (lErr) throw new Error(lErr.message)
    likeRows.push(...((data ?? []) as unknown as LikeRow[]))
  }

  const likesOf = (match: (l: LikeRow) => boolean): HandoverLike[] =>
    likeRows.filter(match).map(l => ({ user_id: l.user_id, user_name: nameOf(l.user) }))

  return notes.map(n => ({
    id: n.id,
    note_date: n.note_date,
    title: n.title,
    content: n.content,
    author_id: n.author_id,
    author_name: nameOf(n.author as NameEmbed),
    created_at: n.created_at,
    likes: likesOf(l => l.note_id === n.id),
    comments: commentRows
      .filter(c => c.note_id === n.id)
      .map(c => ({
        id: c.id,
        note_id: c.note_id,
        parent_id: c.parent_id,
        reply_to_id: c.reply_to_id,
        content: c.content,
        author_id: c.author_id,
        author_name: nameOf(c.author),
        created_at: c.created_at,
        likes: likesOf(l => l.comment_id === c.id),
      })),
  }))
}
