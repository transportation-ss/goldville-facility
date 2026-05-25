import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Plus, Clock, CheckCircle } from 'lucide-react'
import type { RoomInventory } from '@/lib/types'

// 16 個盤點項目的顯示設定
const INVENTORY_FIELDS: {
  key: keyof RoomInventory
  label: string
  format: (v: any) => string
}[] = [
  { key: 'bed_type',           label: '床型',    format: v => v ?? '—' },
  { key: 'headboard_type',     label: '床頭',    format: v => v ?? '—' },
  { key: 'bedside_table_count',label: '床頭小櫃', format: v => v != null ? `${v} 個` : '—' },
  { key: 'wardrobe',           label: '衣櫃',    format: v => v == null ? '—' : v ? '有' : '無' },
  { key: 'dresser_6drawer',    label: '六斗櫃',  format: v => v == null ? '—' : v ? '有' : '無' },
  { key: 'fridge_size',        label: '冰箱',    format: v => v ?? '—' },
  { key: 'sofa_type',          label: '沙發',    format: v => v ?? '—' },
  { key: 'washer',             label: '洗衣機',  format: v => v == null ? '—' : v ? '有' : '無' },
  { key: 'ac_count',           label: '冷氣',    format: v => v != null ? `${v} 台` : '—' },
  { key: 'tv_count',           label: '電視',    format: v => v != null ? `${v} 台` : '—' },
  { key: 'kettle',             label: '熱水瓶',  format: v => v == null ? '—' : v ? '有' : '無' },
  { key: 'desk',               label: '書桌',    format: v => v == null ? '—' : v ? '有' : '無' },
  { key: 'chair_count',        label: '座椅',    format: v => v != null ? `${v} 把` : '—' },
  { key: 'trash_bin_count',    label: '垃圾桶',  format: v => v != null ? `${v} 個` : '—' },
  { key: 'drying_rack',        label: '曬衣架',  format: v => v == null ? '—' : v ? '有' : '無' },
  { key: 'has_accessible',     label: '無障礙設施', format: v => v == null ? '—' : v ? '有' : '無' },
]

// 比對兩筆盤點的差異
function getDiff(older: RoomInventory, newer: RoomInventory) {
  const changed: { label: string; from: string; to: string }[] = []
  for (const field of INVENTORY_FIELDS) {
    const oldVal = older[field.key]
    const newVal = newer[field.key]
    if (oldVal !== newVal) {
      changed.push({
        label: field.label,
        from: field.format(oldVal),
        to: field.format(newVal),
      })
    }
  }
  return changed
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', id)
    .single()

  if (!room) notFound()

  const { data: inventoryList } = await supabase
    .from('room_inventory')
    .select('*, creator:created_by(display_name)')
    .eq('room_id', id)
    .order('snapshot_date', { ascending: true })

  const snapshots = (inventoryList ?? []) as RoomInventory[]
  const initial = snapshots.find(s => s.is_initial)
  const current = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null
  const changes = snapshots.filter(s => !s.is_initial)
  const hasInventory = snapshots.length > 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link href="/rooms" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{room.name} 房</h1>
          <p className="text-sm text-gray-400">{room.floor} · 客房</p>
        </div>
        <Link
          href={`/rooms/${id}/inventory/new`}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {hasInventory ? '記錄變動' : '建立初始盤點'}
        </Link>
      </div>

      {!hasInventory ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-400 text-sm">尚未建立盤點記錄</p>
          <p className="text-gray-300 text-xs mt-1">點右上角「建立初始盤點」開始登錄</p>
        </div>
      ) : (
        <>
          {/* 目前狀態 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">目前狀態</h2>
              <span className="text-xs text-gray-400">
                {new Date(current!.snapshot_date).toLocaleDateString('zh-TW')}
              </span>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {INVENTORY_FIELDS.map(field => {
                const val = current![field.key]
                const isEmpty = val == null
                return (
                  <div key={field.key} className="bg-gray-50 rounded-lg p-2.5">
                    <p className="text-xs text-gray-400 mb-0.5">{field.label}</p>
                    <p className={`text-sm font-medium ${isEmpty ? 'text-gray-300' : 'text-gray-800'}`}>
                      {field.format(val)}
                    </p>
                  </div>
                )
              })}
              {current!.accessible_notes && (
                <div className="col-span-full bg-gray-50 rounded-lg p-2.5">
                  <p className="text-xs text-gray-400 mb-0.5">無障礙說明</p>
                  <p className="text-sm text-gray-800">{current!.accessible_notes}</p>
                </div>
              )}
              {current!.notes && (
                <div className="col-span-full bg-amber-50 rounded-lg p-2.5">
                  <p className="text-xs text-amber-500 mb-0.5">備註</p>
                  <p className="text-sm text-gray-800">{current!.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* 歷史時間軸 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">盤點歷史</h2>
            </div>
            <div className="p-4">
              <div className="relative">
                {/* 時間軸線 */}
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />

                <div className="space-y-4">
                  {/* 初始狀態 */}
                  {initial && (
                    <TimelineItem
                      icon={<CheckCircle className="w-4 h-4 text-emerald-500" />}
                      title="初始盤點建立"
                      date={initial.snapshot_date}
                      creator={(initial as any).creator?.display_name}
                      badge={{ text: '初始', color: 'emerald' }}
                      diff={null}
                    />
                  )}

                  {/* 各次變動 */}
                  {changes.map((change, i) => {
                    const prev = snapshots[snapshots.indexOf(change) - 1]
                    const diff = prev ? getDiff(prev, change) : []
                    return (
                      <TimelineItem
                        key={change.id}
                        icon={<Clock className="w-4 h-4 text-blue-400" />}
                        title={change.change_reason ?? '房型變動'}
                        date={change.snapshot_date}
                        creator={(change as any).creator?.display_name}
                        badge={{ text: `第 ${i + 1} 次變動`, color: 'blue' }}
                        diff={diff}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── 時間軸項目 ───────────────────────────────────────────
function TimelineItem({
  icon, title, date, creator, badge, diff,
}: {
  icon: React.ReactNode
  title: string
  date: string
  creator?: string
  badge: { text: string; color: 'emerald' | 'blue' }
  diff: { label: string; from: string; to: string }[] | null
}) {
  const badgeClass = badge.color === 'emerald'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-blue-100 text-blue-700'

  return (
    <div className="flex gap-4 relative pl-8">
      <div className="absolute left-0 top-0.5 bg-white rounded-full p-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-800">{title}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${badgeClass}`}>{badge.text}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(date).toLocaleDateString('zh-TW')}
          {creator && ` · ${creator}`}
        </p>
        {diff && diff.length > 0 && (
          <div className="mt-2 space-y-1">
            {diff.map(d => (
              <div key={d.label} className="flex items-center gap-2 text-xs bg-gray-50 rounded px-2 py-1">
                <span className="text-gray-500 w-16 shrink-0">{d.label}</span>
                <span className="text-red-400 line-through">{d.from}</span>
                <span className="text-gray-400">→</span>
                <span className="text-emerald-600 font-medium">{d.to}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
