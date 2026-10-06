import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { todayTW } from '@/lib/dining'
import { defaultMeal, fetchMealCount, MEAL_LABEL, type MealCount, type MealKey } from '@/lib/meal-sheet'

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

const n = (v: number | null | undefined) => (v == null ? '—' : String(v))

function row(label: string, value: number | null | undefined, opts: { bold?: boolean; color?: string } = {}) {
  return {
    type: 'box', layout: 'horizontal',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#6B7280', flex: 3 },
      { type: 'text', text: n(value), size: opts.bold ? 'xl' : 'md', weight: 'bold', color: opts.color ?? '#111827', align: 'end', flex: 1 },
    ],
  }
}

function section(title: string, rows: ReturnType<typeof row>[]) {
  return [
    { type: 'separator', margin: 'lg' },
    { type: 'text', text: title, size: 'sm', weight: 'bold', color: '#10B981', margin: 'lg' },
    { type: 'box', layout: 'vertical', spacing: 'sm', margin: 'sm', contents: rows },
  ]
}

function buildCard(c: MealCount) {
  const body: unknown[] = [
    { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
      row('葷食人數', c.meat, { bold: true }),
      row('素食人數', c.veg, { bold: true }),
      ...(c.staple != null ? [row('主食份數', c.staple)] : []),
      ...(c.vegSoup != null ? [row('素食湯', c.vegSoup)] : []),
      ...(c.extra != null ? [row('附餐加點（荷包蛋）', c.extra)] : []),
    ] },
  ]
  if (c.batch1) body.push(...section('第一批次', [
    row('葷食人數', c.batch1.meat), row('主食份數', c.batch1.staple),
    row('不吃豬肉', c.batch1.pork), row('素食人數', c.batch1.veg),
  ]))
  if (c.batch2) body.push(...section('第二批次', [
    row('葷食人數', c.batch2.meat), row('不吃豬肉', c.batch2.pork), row('素食人數', c.batch2.veg),
  ]))
  if (c.meal === 'breakfast') {
    body.push({ type: 'text', text: '早餐無批次摘要', size: 'xs', color: '#9CA3AF', margin: 'lg' })
  }

  return {
    type: 'flex',
    altText: `${c.dateLabel} ${MEAL_LABEL[c.meal]}用餐人數：葷 ${n(c.meat)}／素 ${n(c.veg)}`,
    contents: {
      type: 'bubble', size: 'kilo',
      header: {
        type: 'box', layout: 'vertical', backgroundColor: '#10B981', paddingAll: 'lg',
        contents: [
          { type: 'text', text: `${MEAL_LABEL[c.meal]}用餐人數`, color: '#FFFFFF', weight: 'bold', size: 'lg' },
          { type: 'text', text: `${c.dateLabel}　來源：安心家園用餐總表`, color: '#D1FAE5', size: 'xs', margin: 'xs' },
        ],
      },
      body: { type: 'box', layout: 'vertical', contents: body },
    },
    quickReply: {
      items: (['breakfast', 'lunch', 'dinner'] as MealKey[]).map(k => ({
        type: 'action',
        action: { type: 'postback', label: MEAL_LABEL[k], data: `meal=${k}` },
      })),
    },
  }
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
  let meal: MealKey | null = null
  if (ev.type === 'message' && ev.message?.type === 'text') {
    const m = KEYWORD.exec((ev.message.text ?? '').trim())
    if (!m) return                                  // 群組裡其他訊息一律不理
    meal = m[1] ? MEAL_BY_WORD[m[1]] : defaultMeal()
  } else if (ev.type === 'postback') {
    const m = /^meal=(breakfast|lunch|dinner)$/.exec(ev.postback?.data ?? '')
    if (!m) return
    meal = m[1] as MealKey
  } else return

  try {
    const card = buildCard(await fetchMealCount(todayTW(), meal))
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
