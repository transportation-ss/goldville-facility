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

type ContractState = 'urgent' | 'warning' | 'no_date' | 'ok'

function contractState(contractEnd: string | null): ContractState {
  if (!contractEnd) return 'no_date'
  const diff = (new Date(contractEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (diff <= 5)  return 'urgent'
  if (diff <= 20) return 'warning'
  return 'ok'
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
      <div className="flex flex-wrap gap-3 mb-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-white border border-gray-200 inline-block" />
          入住
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-50 border border-red-200 inline-block" />
          注意續約（5天內/已到期）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-yellow-50 border border-yellow-200 inline-block" />
          即將到期（20天內）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-50 border border-blue-200 inline-block" />
          無到期日
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
                // 取最嚴重的合約狀態
                const state: ContractState = occupants
                  ? (['urgent','warning','no_date','ok'] as ContractState[]).find(
                      s => occupants.some(r => contractState(r.contract_end) === s)
                    ) ?? 'ok'
                  : 'ok'

                const cardStyle: Record<ContractState, string> = {
                  urgent:  'bg-red-50 border-red-200',
                  warning: 'bg-yellow-50 border-yellow-200',
                  no_date: 'bg-blue-50 border-blue-200',
                  ok:      'bg-white border-gray-200',
                }
                const roomNoStyle: Record<ContractState, string> = {
                  urgent:  'text-red-400',
                  warning: 'text-yellow-500',
                  no_date: 'text-blue-400',
                  ok:      'text-blue-400',
                }
                const nameStyle: Record<ContractState, string> = {
                  urgent:  'text-red-800',
                  warning: 'text-yellow-800',
                  no_date: 'text-blue-800',
                  ok:      'text-gray-800',
                }
                const tagLabel: Record<ContractState, string> = {
                  urgent:  '注意續約',
                  warning: '即將到期',
                  no_date: '無到期日',
                  ok:      '',
                }
                const tagStyle: Record<ContractState, string> = {
                  urgent:  'text-red-400',
                  warning: 'text-yellow-500',
                  no_date: 'text-blue-400',
                  ok:      '',
                }

                if (!occupants) {
                  return (
                    <div key={roomNo}
                      className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-2.5 min-h-[64px] flex flex-col">
                      <p className="text-[11px] font-medium text-gray-400">{roomNo}</p>
                      <p className="text-xs text-gray-300 mt-auto">空房</p>
                    </div>
                  )
                }

                return (
                  <div key={roomNo}
                    className={`rounded-lg border p-2.5 min-h-[64px] flex flex-col cursor-pointer transition-opacity hover:opacity-75 ${cardStyle[state]}`}
                    onClick={() => {
                      if (occupants.length === 1) router.push(`/butler/residents/${occupants[0].id}`)
                    }}
                  >
                    <p className={`text-[11px] font-medium ${roomNoStyle[state]}`}>{roomNo}</p>
                    <div className="mt-1 space-y-0.5">
                      {occupants.map(r => (
                        <p key={r.id}
                          className={`text-xs leading-tight font-medium ${nameStyle[state]}`}
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
                    {state !== 'ok' && (
                      <p className={`text-[10px] mt-auto pt-1 ${tagStyle[state]}`}>{tagLabel[state]}</p>
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
