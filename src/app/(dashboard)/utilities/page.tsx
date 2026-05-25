import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Droplets, Zap, AlertTriangle, CalendarClock, Plus } from 'lucide-react'
// AlertTriangle 仍在月度警示區塊使用
import { AbnormalAlert } from './AbnormalAlert'

export default async function UtilitiesPage() {
  const supabase = await createClient()

  // 最新 5 筆 session
  const { data: sessions } = await supabase
    .from('utility_sessions')
    .select(`
      *,
      readings:utility_readings(
        *, meter:utility_meters(name, meter_type, floor, room_no, unit, sort_order)
      )
    `)
    .order('reading_date', { ascending: false })
    .limit(5)

  const latestSession = sessions?.[0]

  // 按樓層分組最新讀數
  const byFloor: Record<string, any[]> = {}
  for (const r of latestSession?.readings ?? []) {
    const floor = r.meter?.floor ?? '其他'
    if (!byFloor[floor]) byFloor[floor] = []
    byFloor[floor].push(r)
  }
  for (const floor in byFloor) {
    byFloor[floor]!.sort((a: any, b: any) => (a.meter?.sort_order ?? 0) - (b.meter?.sort_order ?? 0))
  }

  // 只顯示尚未確認的異常
  const abnormals = latestSession?.readings?.filter((r: any) => r.is_abnormal && !r.is_acknowledged) ?? []

  // ── 月度抄表警示 ────────────────────────────────────────────
  const today = new Date()
  const dayOfMonth = today.getDate()
  const year = today.getFullYear()
  const month = today.getMonth()
  const thisMonthStart = new Date(year, month, 1).toISOString().split('T')[0]
  const thisMonthEnd   = new Date(year, month + 1, 0).toISOString().split('T')[0]

  const { data: thisMonthSessions } = await supabase
    .from('utility_sessions')
    .select('id')
    .gte('reading_date', thisMonthStart)
    .lte('reading_date', thisMonthEnd)
    .limit(1)

  const hasThisMonthReading = (thisMonthSessions?.length ?? 0) > 0
  const isOverdue = !hasThisMonthReading && dayOfMonth >= 25   // 25日後逾期
  const isReminder = !hasThisMonthReading && dayOfMonth < 25   // 25日前提醒

  // 月份顯示
  const monthLabel = `${year} 年 ${month + 1} 月`

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">水電抄表紀錄</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {latestSession
              ? `最新抄表：${new Date(latestSession.reading_date).toLocaleDateString('zh-TW')}`
              : '尚未建立抄表記錄'}
          </p>
        </div>
        <Link
          href="/utilities/new"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增抄表
        </Link>
      </div>

      {/* ── 月度抄表警示 ── */}
      {isOverdue && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-300 rounded-xl px-4 py-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              ⚠️ {monthLabel} 抄表尚未填報（已逾截止日 25 日）
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              請盡快前往「新增抄表」完成本月記錄
            </p>
          </div>
          <Link
            href="/utilities/new"
            className="ml-auto shrink-0 text-xs font-medium text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            立即填報
          </Link>
        </div>
      )}

      {isReminder && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
          <CalendarClock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-700">
              📅 {monthLabel} 尚未填報抄表
            </p>
            <p className="text-xs text-amber-500 mt-0.5">
              本月截止日為 25 日（剩 {25 - dayOfMonth} 天）
            </p>
          </div>
          <Link
            href="/utilities/new"
            className="ml-auto shrink-0 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            前往填報
          </Link>
        </div>
      )}

      {/* ── 異常用量警示（含確認按鈕）── */}
      <AbnormalAlert abnormals={abnormals} />

      {/* ── 最新抄表資料 ── */}
      {latestSession && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              {new Date(latestSession.reading_date).toLocaleDateString('zh-TW')} 抄表記錄
            </h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              latestSession.status === 'complete'
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {latestSession.status === 'complete' ? '完整' : latestSession.status === 'partial' ? '部分' : '草稿'}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {(['頂樓', '1F', '2F', '3F', '5F', '6F', '7F', '8F'] as const)
              .filter(f => byFloor[f]?.length)
              .map(floor => {
                const floorReadings: any[] = byFloor[floor]
                const isRoomFloor = ['2F', '3F', '5F', '6F', '7F'].includes(floor)

                if (isRoomFloor) {
                  // 房間樓層：依 room_no 分組，水電並排
                  const roomMap: Record<string, { water?: any; elec?: any }> = {}
                  for (const r of floorReadings) {
                    const rn = r.meter?.room_no ?? 'x'
                    if (!roomMap[rn]) roomMap[rn] = {}
                    if (r.meter?.meter_type === 'water') roomMap[rn].water = r
                    else roomMap[rn].elec = r
                  }
                  return (
                    <div key={floor} className="px-4 py-3">
                      <h3 className="text-xs font-semibold text-gray-400 mb-2">{floor}</h3>
                      <div className="space-y-1.5">
                        {Object.entries(roomMap)
                          .sort(([a], [b]) => parseInt(a) - parseInt(b))
                          .map(([rn, pair]) => (
                            <div key={rn} className="grid grid-cols-2 gap-1.5">
                              {pair.water ? <MiniReadingCard r={pair.water} label={`${rn}水`} /> : <div />}
                              {pair.elec  ? <MiniReadingCard r={pair.elec}  label={`${rn}電`} /> : <div />}
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )
                }

                // 公共區域
                return (
                  <div key={floor} className="px-4 py-3">
                    <h3 className="text-xs font-semibold text-gray-400 mb-2">{floor}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                      {floorReadings.map((r: any) => <MiniReadingCard key={r.id} r={r} />)}
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      )}

      {/* ── 歷史記錄列表 ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">歷史抄表</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {(sessions ?? []).map((s: any, i: number) => (
            <Link
              key={s.id}
              href={`/utilities/${s.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm text-gray-900">
                  {new Date(s.reading_date).toLocaleDateString('zh-TW')}
                </p>
                {s.special_notes && (
                  <p className="text-xs text-gray-400">{s.special_notes}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {i === 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">最新</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  s.status === 'complete'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {s.status === 'complete' ? '完整' : s.status === 'partial' ? '部分' : '草稿'}
                </span>
                <span className="text-gray-300 text-sm">›</span>
              </div>
            </Link>
          ))}
          {(!sessions || sessions.length === 0) && (
            <p className="text-center text-sm text-gray-400 py-10">尚無抄表記錄</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 迷你讀數卡片（主頁用）─────────────────────────────────
function MiniReadingCard({ r, label }: { r: any; label?: string }) {
  const isWater = r.meter?.meter_type === 'water'
  return (
    <div className={`rounded-lg p-2 border text-xs ${
      r.is_abnormal && !r.is_acknowledged
        ? 'border-red-200 bg-red-50'
        : 'border-gray-100 bg-gray-50'
    }`}>
      <div className="flex items-center gap-1 mb-0.5">
        {isWater
          ? <Droplets className="w-3 h-3 text-blue-400 shrink-0" />
          : <Zap className="w-3 h-3 text-yellow-400 shrink-0" />
        }
        <span className="text-gray-500 truncate">{label ?? r.meter?.name}</span>
      </div>
      <p className="font-bold text-gray-900">
        {r.reading_value ?? '—'}
        <span className="text-xs font-normal text-gray-400 ml-0.5">{r.meter?.unit}</span>
      </p>
      {r.usage_amount !== null && (
        <p className={`${r.is_abnormal && !r.is_acknowledged ? 'text-red-500' : 'text-gray-400'}`}>
          +{r.usage_amount}{r.is_abnormal && !r.is_acknowledged ? ' ⚠' : ''}
        </p>
      )}
    </div>
  )
}
