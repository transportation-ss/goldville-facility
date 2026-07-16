import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MODEL = 'gemini-3.1-flash-lite'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

const POLISH_PROMPT = `將以下照服紀錄口語草稿改寫成正式書面語氣。若提供「住戶固定特質/習慣」，僅作為理解背景脈絡之用，不可直接複製貼上到輸出中。
規則：
- 只能輸出改寫後的紀錄本文，禁止輸出任何講解、建議、版本選項、標題、前言或結語
- 不捏造草稿中沒有的資訊，不新增草稿未提及的觀察項目
- 保留原意與長度感，只做語句潤飾
- 輸出必須是純文字，不可使用 Markdown 符號（*, #, > 等）`

const CAPTION_PROMPT = `你是長照機構的照服員助手。請根據這張服務照片，寫出一句 10-20 字的客觀說明文字，描述照片中的服務內容或情境。
要求：
- 只描述照片中實際看到的內容，不要臆測
- 直接輸出說明文字，不要加任何前綴或說明`

async function callGemini(parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY 未設定')

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
    }),
  })

  if (!res.ok) throw new Error(`Gemini API 錯誤：${res.status} ${await res.text()}`)

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini 未回傳文字內容')
  return text.trim()
}

async function fetchImageAsBase64(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('無法讀取照片')
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const buf = Buffer.from(await res.arrayBuffer())
  return { mimeType: contentType, data: buf.toString('base64') }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mode, text, imageUrl, tags } = await req.json()

  try {
    if (mode === 'polish') {
      if (!text?.trim()) return NextResponse.json({ error: '缺少文字內容' }, { status: 400 })
      const tagsBlock = Array.isArray(tags) && tags.length > 0
        ? `\n【住戶固定特質/習慣】：${tags.join('、')}\n`
        : ''
      const result = await callGemini([{ text: `${POLISH_PROMPT}${tagsBlock}\n\n草稿：\n${text}` }])
      return NextResponse.json({ result })
    }

    if (mode === 'caption') {
      if (!imageUrl) return NextResponse.json({ error: '缺少照片網址' }, { status: 400 })
      const { mimeType, data } = await fetchImageAsBase64(imageUrl)
      const result = await callGemini([
        { text: CAPTION_PROMPT },
        { inlineData: { mimeType, data } },
      ])
      return NextResponse.json({ result })
    }

    return NextResponse.json({ error: '未知的 mode' }, { status: 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
