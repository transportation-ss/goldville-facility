'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { ButlerResident } from '../actions'

const FLOOR_ROOMS: { floor: string; rooms: string[] }[] = [
  { floor: '2F', rooms: ['201','202','203','205','206','207','208','209','210','211','212','213','215','216'] },
  { floor: '3F', rooms: ['301','302','303','305','306','307','308','309','310','311','312','313','315','316'] },
  { floor: '5F', rooms: ['503','505'] },
  { floor: '6F', rooms: ['601','602','603','605','606','607','608','609','610','611','612','613','615'] },
  { floor: '7F', rooms: ['703','705','706','707','708','709','710','711','712','713','715'] },
]

function isExpiringSoon(contractEnd: string | null): boolean {
  if (!contractEnd) return false
  const end = new Date(contractEnd)
  const now = new Date()
  const diff = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return diff <= 30
}

export function RoomMapView({ residents }: { residents: ButlerResident[] }) {
  const router = useRouter()

  // 依房號分組（一個房間可能多人）
  const byRoom = new Map<string, ButlerResident[]>()
  for (const r of residents) {
    if (!r.room || r.status === 'inactive') continue
    if (!byRoom.has(r.room)) byRoom.set(r.room, [])
    byRoom.get(r.room)!.push(r)
  }

  const totalActive = residents.filter(r => r.status !== 'inactive' && r.room).length
  const totalRooms  = FLOOR_ROOMS.reduce((s, f) => s + f.rooms.length, 0)
  const occupiedRooms = byRoom.size

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">房間配置圖</h1>
          <p className="text-xs text-gray-400">{occupiedRooms} / {totalRooms} 間入住・{totalActive} 位住戶</p>
        </div>
      </div>

      {/* 圖例 */}
      <div className="flex gap-4 mb-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-white border border-gray-200 inline-block" />
          入住
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-200 inline-block" />
          合約即將到期
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-50 border border-dashed border-gray-300 inline-block" />
          空房
        </span>
      </div>

      {/* 樓層 */}
      {FLOOR_ROOMS.map(({ floor, rooms }) => {
        const floorResidents = rooms.flatMap(r => byRoom.get(r) ?? [])
        const occupied = rooms.filter(r => byRoom.has(r)).length

        return (
          <div key={floor} className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{floor}</p>
              <span className="text-xs text-gray-400">{occupied}/{rooms.length} 間</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {rooms.map(roomNo => {
                const occupants = byRoom.get(roomNo)
                const expiring  = occupants?.some(r => isExpiringSoon(r.contract_end))

                if (!occupants) {
                  return (
                    <div key={roomNo}
                      className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5 min-h-[64px] flex flex-col">
                      <p className="text-[11px] font-medium text-blue-400">{roomNo}</p>
                      <p className="text-xs text-gray-300 mt-auto">空房</p>
                    </div>
                  )
                }

                return (
                  <div key={roomNo}
                    className={`rounded-lg border p-2.5 min-h-[64px] flex flex-col cursor-pointer transition-opacity hover:opacity-75 ${
                      expiring
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-white border-gray-200'
                    }`}
                    onClick={() => {
                      if (occupants.length === 1) {
                        router.push(`/butler/residents/${occupants[0].id}`)
                      }
                    }}
                  >
                    <p className={`text-[11px] font-medium ${expiring ? 'text-amber-500' : 'text-blue-400'}`}>
                      {roomNo}
                    </p>
                    <div className="mt-1 space-y-0.5">
                      {occupants.map(r => (
                        <p key={r.id}
                          className={`text-xs leading-tight font-medium ${expiring ? 'text-amber-800' : 'text-gray-800'}`}
                          onClick={e => {
                            if (occupants.length > 1) {
                              e.stopPropagation()
                              router.push(`/butler/residents/${r.id}`)
                            }
                          }}
                        >
                          {r.name}
                        </p>
                      ))}
                    </div>
                    {expiring && (
                      <p className="text-[10px] text-amber-400 mt-auto pt-1">合約到期</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
