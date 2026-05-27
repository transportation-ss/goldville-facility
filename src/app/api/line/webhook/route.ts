import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { generateNightshiftReport } from '@/lib/line/report'

const CHANNEL_SECRET       = process.env.LINE_CHANNEL_SECRET!
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!
const REPLY_URL            = 'https://api.line.me/v2/bot/message/reply'

// 關鍵字（任一匹配即觸發）
const REPORT_KEYWORDS = ['今日報表', '報表', '大夜報表', '夜班報表']

// ── 簽名驗證 ─────────────────────────────────────────
function verifySignature(rawBody: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(rawBody)
    .digest('base64')
  return hash === signature
}

// ── 回覆訊息 ─────────────────────────────────────────
async function reply(replyToken: string, messages: unknown[]) {
  await fetch(REPLY_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  })
}

// ── Webhook 主入口 ────────────────────────────────────
export async function POST(request: NextRequest) {
  const rawBody  = await request.text()
  const signature = request.headers.get('x-line-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)

  for (const event of payload.events ?? []) {
    if (event.type !== 'message' || event.message.type !== 'text') continue

    const text = (event.message.text as string).trim()

    if (REPORT_KEYWORDS.includes(text)) {
      try {
        const report = await generateNightshiftReport()
        await reply(event.replyToken, [report])
      } catch (e) {
        await reply(event.replyToken, [{
          type: 'text',
          text: '⚠️ 報表產生失敗，請稍後再試。',
        }])
      }
    }
  }

  return NextResponse.json({ ok: true })
}
