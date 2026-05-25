import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { DoorOpen, ClipboardCheck, ClipboardX, RefreshCw } from 'lucide-react'

const FLOOR_ORDER = ['2F', '3F', '5F', '6F', '7F']

export default async function RoomsPage() {
  const supabase = await createClient()

  const { data: rooms } = await supabase
    .from('rooms')
    .select(`
      id, name, floor, room_type, sort_order,
      inventory:room_inventory(id, snapshot_date, is_initial, bed_type)
    `)
    .eq('is_active', true)
    .eq('room_type', '客房')
    .order('sort_order')

  // 按樓層分組
  const grouped: Record<string, typeof rooms> = {}
  for (const room of rooms ?? []) {
    const floor = room.floor ?? '其他'
    if (!grouped[floor]) grouped[floor] = []
    grouped[floor]!.push(room)
  }

  const totalRooms = rooms?.length ?? 0
  const inventoried = rooms?.filter(r => (r.inventory as any[])?.length > 0).length ?? 0
  const hasInitial = rooms?.filter(r => (r.inventory as any[])?.some((i: any) => i.is_initial)).length ?? 0

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">房間登錄</h1>
          <p className="text-sm text-gray-500 mt-0.5">客房設備盤點與變動記錄</p>
        </div>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
          <p className="text-xs text-gray-400 mt-0.5">客房總數</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{hasInitial}</p>
          <p className="text-xs text-gray-400 mt-0.5">已建初始盤點</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{totalRooms - hasInitial}</p>
          <p className="text-xs text-gray-400 mt-0.5">待盤點</p>
        </div>
      </div>

      {/* 各樓層房間 */}
      <div className="space-y-5">
        {FLOOR_ORDER.filter(f => grouped[f]?.length).map(floor => {
          const floorRooms = grouped[floor] ?? []
          const floorDone = floorRooms.filter(r =>
            (r.inventory as any[])?.some((i: any) => i.is_initial)
          ).length

          return (
            <div key={floor}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-gray-700">{floor}</h2>
                <span className="text-xs text-gray-400">{floorDone}/{floorRooms.length} 已盤點</span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2">
                {floorRooms.map(room => {
                  const inv = room.inventory as any[]
                  const hasInit = inv?.some((i: any) => i.is_initial)
                  const hasChange = inv?.filter((i: any) => !i.is_initial).length > 0
                  const latest = inv?.sort((a: any, b: any) =>
                    new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime()
                  )[0]

                  return (
                    <Link
                      key={room.id}
                      href={`/rooms/${room.id}`}
                      className={`rounded-xl border p-2.5 text-center hover:shadow-sm transition-all ${
                        hasInit
                          ? hasChange
                            ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                            : 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900">{room.name}</p>
                      {hasInit ? (
                        <>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {latest?.bed_type ?? '—'}
                          </p>
                          <div className="flex items-center justify-center gap-1 mt-1">
                            {hasChange
                              ? <RefreshCw className="w-3 h-3 text-blue-400" />
                              : <ClipboardCheck className="w-3 h-3 text-emerald-400" />
                            }
                            <span className={`text-xs ${hasChange ? 'text-blue-500' : 'text-emerald-500'}`}>
                              {hasChange ? `${inv.filter((i:any)=>!i.is_initial).length}次變動` : '已盤點'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center gap-1 mt-1.5">
                          <ClipboardX className="w-3 h-3 text-gray-300" />
                          <span className="text-xs text-gray-300">未盤點</span>
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
