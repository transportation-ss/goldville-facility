import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'
import { generateHousekeepingReport, generateEODReport, generateUnlockReport } from '@/lib/line/housekeeping-report'

const CHANNEL_SECRET       = process.env.LINE_HOUSEKEEPING_CHANNEL_SECRET ?? ''
const CHANNEL_ACCESS_TOKEN = process.env.LINE_HOUSEKEEPING_CHANNEL_ACCESS_TOKEN ?? ''

const EOD_KEYWORDS    = ['收工', '下班', '收工確認']
const UNLOCK_KEYWORDS = ['封印解除', '月光變身']
const KEYWORDS        = ['今日任務', '任務', '今天任務', '今日派工', '派工']

function verifySignature(body: string, signature: string): boolean {
  const hmac = crypto.createHmac('SHA256', CHANNEL_SECRET)
  hmac.update(body)
  return hmac.digest('base64') === signature
}

async function reply(replyToken: string, messages: any[]) {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })
  if (!res.ok) {
    const errBody = await res.text()
    console.error('[housekeeping-webhook] reply failed', res.status, errBody)
  }
}

export async function POST(req: NextRequest) {
  const rawBody  = await req.text()
  const signature = req.headers.get('x-line-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const body = JSON.parse(rawBody)
  const events = body.events ?? []

  for (const event of events) {
    if (event.type !== 'message' || event.message?.type !== 'text') continue

    const text       = (event.message.text as string).trim()
    const replyToken = event.replyToken

const isEOD     = EOD_KEYWORDS.some(k => text.includes(k))
    const isUnlock  = UNLOCK_KEYWORDS.some(k => text.includes(k))
    const isKeyword = KEYWORDS.some(k => text.includes(k))
    if (!isEOD && !isUnlock && !isKeyword) continue

    try {
      const message = isEOD
        ? await generateEODReport()
        : isUnlock
          ? await generateUnlockReport()
          : await generateHousekeepingReport()
      await reply(replyToken, [message])
    } catch (e) {
      await reply(replyToken, [{ type: 'text', text: '發生錯誤，請稍後再試。' }])
    }
  }

  return NextResponse.json({ ok: true })
}
