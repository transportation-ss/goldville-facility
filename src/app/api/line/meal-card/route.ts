import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { resolveTarget, fetchMealCount, MEAL_LABEL, type MealKey } from '@/lib/meal-sheet'
import { buildCard } from '@/lib/meal-card'

// 餐廳廚房小幫手：群組內輸入「用餐人數」→ 以 reply（不佔推播額度）回覆用餐人數卡片。
// 只讀 Google Sheet，不寫任何資料。

const REPLY_URL = 'https://api.line.me/v2/bot/message/reply'
const KEYWORD = /^(早餐|午餐|晚餐)?用餐人數$/
const MEAL_BY_WORD: Record<string, MealKey> = { 早餐: 'breakfast', 午餐: 'lunch', 晚餐: 'dinner' }

function verifySignature(raw: string, signature: string | null): boolean {
  const secret = process.env.MEALCARD_CHANNEL_SECRET
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(raw).digest()
  const given = Buffer.from(signature, 'base64')
  return given.length === expected.length && crypto.timingSafeEqual(given, expected)
}

async function reply(replyToken: string, message: unknown) {
  const token = process.env.MEALCARD_CHANNEL_ACCESS_TOKEN
  if (!token) throw new Error('缺少 MEALCARD_CHANNEL_ACCESS_TOKEN')
  const res = await fetch(REPLY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ replyToken, messages: [message] }),
  })
  if (!res.ok) console.error('[meal-card] reply failed', res.status, await res.text())
}

type LineEvent = {
  type: string
  replyToken?: string
  message?: { type: string; text?: string }
  postback?: { data: string }
}

async function handle(ev: LineEvent) {
  if (!ev.replyToken) return
  let requested: MealKey | undefined
  if (ev.type === 'message' && ev.message?.type === 'text') {
    const m = KEYWORD.exec((ev.message.text ?? '').trim())
    if (!m) return                                  // 群組裡其他訊息一律不理
    requested = m[1] ? MEAL_BY_WORD[m[1]] : undefined
  } else if (ev.type === 'postback') {
    const m = /^meal=(breakfast|lunch|dinner)$/.exec(ev.postback?.data ?? '')
    if (!m) return
    requested = m[1] as MealKey
  } else return

  const t = resolveTarget(new Date(), requested)
  const meal = t.meal
  try {
    const card = buildCard(await fetchMealCount(t.date, meal), t)
    await reply(ev.replyToken, card)
  } catch (e) {
    console.error('[meal-card] failed', e)
    await reply(ev.replyToken, { type: 'text', text: `查不到${MEAL_LABEL[meal]}資料：${e instanceof Error ? e.message : '未知錯誤'}` })
  }
}

export async function POST(req: Request) {
  const raw = await req.text()
  if (!verifySignature(raw, req.headers.get('x-line-signature'))) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }
  const { events } = JSON.parse(raw) as { events?: LineEvent[] }
  await Promise.all((events ?? []).map(handle))
  return NextResponse.json({ ok: true })
}
