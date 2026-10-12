import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sessionLabel, LATE_GRACE_MIN, fmtTime, type MealType } from '@/lib/dining'

// cron-job.org 每 10 分鐘呼叫一次。每種提醒各餐次只發一次（alerted_* 旗標）。
async function push(text: string) {
  // 用餐提醒使用獨立的 LINE bot（不與回診／房務共用額度）
  const to = process.env.MEAL_LINE_USER_ID
  const token = process.env.MEAL_LINE_CHANNEL_ACCESS_TOKEN
  if (!to || !token) throw new Error('缺少 MEAL_LINE_USER_ID / MEAL_LINE_CHANNEL_ACCESS_TOKEN')
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
  })
  if (!res.ok) throw new Error(`LINE push ${res.status}: ${await res.text()}`)
}

export async function GET() {
  try {
    const admin = createAdminClient()
    const now = Date.now()
    const nowIso = new Date(now).toISOString()
    const since = new Date(now - 36 * 3600 * 1000).toISOString()

    const { data: sessions } = await admin.from('meal_sessions').select('*').gte('start_at', since)
    const { count: residentCount } = await admin.from('butler_residents')
      .select('id', { count: 'exact', head: true }).eq('status', 'active_resident')

    const sent: string[] = []
    for (const s of sessions ?? []) {
      const label = `${s.session_date} ${sessionLabel(s.meal_type as MealType, s.slot)}`
      const { data: att } = await admin.from('meal_attendees')
        .select('resident_id,guest_name,status,butler_residents(name,nickname)').eq('session_id', s.id)
      const rows = (att ?? []) as unknown as {
        resident_id: string | null; guest_name: string | null; status: string
        butler_residents: { name: string; nickname: string | null } | null
      }[]
      const nameOf = (r: (typeof rows)[number]) => r.butler_residents?.nickname || r.butler_residents?.name || r.guest_name || '?'
      const eating = rows.filter(r => r.status !== 'declined')
      const notYet = eating.filter(r => r.status !== 'checked_in')

      // (a) 確認截止後仍有未確認
      if (!s.alerted_confirm_at && nowIso >= s.confirm_deadline_at && nowIso < s.end_at) {
        const unconfirmed = (residentCount ?? 0) - rows.filter(r => r.resident_id).length
        if (unconfirmed > 0) {
          await push(`【用餐確認】${label}\n已過確認截止時間（${fmtTime(s.confirm_deadline_at)}），仍有 ${unconfirmed} 位長輩未確認是否用餐。\n目前預計用餐 ${eating.length} 人。`)
          sent.push(`${label} confirm`)
        }
        await admin.from('meal_sessions').update({ alerted_confirm_at: nowIso }).eq('id', s.id)
      }

      // (b) 開餐 + 寬限後仍有人未到
      const lateAt = new Date(s.start_at).getTime() + LATE_GRACE_MIN * 60000
      if (!s.alerted_late_at && now >= lateAt && nowIso < s.end_at) {
        if (notYet.length > 0) {
          await push(`【用餐未到】${label}\n開餐已超過 ${LATE_GRACE_MIN} 分鐘，尚有 ${notYet.length} 人未報到：\n${notYet.map(nameOf).join('、')}`)
          sent.push(`${label} late`)
        }
        await admin.from('meal_sessions').update({ alerted_late_at: nowIso }).eq('id', s.id)
      }

      // (c) 結束統計（沒有任何用餐資料的餐次不發）
      if (!s.alerted_end_at && nowIso >= s.end_at) {
        if (eating.length > 0) {
          const checked = eating.length - notYet.length
          await push(`【用餐統計】${label}\n預計 ${eating.length} 人，已報到 ${checked} 人，未到 ${notYet.length} 人。` +
            (notYet.length ? `\n未到：${notYet.map(nameOf).join('、')}` : ''))
          sent.push(`${label} end`)
        }
        await admin.from('meal_sessions').update({ alerted_end_at: nowIso }).eq('id', s.id)
      }
    }
    return NextResponse.json({ ok: true, sent })
  } catch (e) {
    console.error('[cron] meal-alerts failed', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
