'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, DoorOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ButlerResident } from '../residents/actions'
import { FLOOR_2F_ROOMS, FLOOR_2F_IMAGE, type RoomHotspot } from '@/lib/floorplan/2f'

export function FloorPlanView({ residents }: { residents: ButlerResident[] }) {
  const router = useRouter()
  const [active, setActive] = useState<RoomHotspot | null>(null)

  const byRoom = useMemo(() => {
    const map = new Map<string, ButlerResident[]>()
    for (const r of residents) {
      if (!r.room) continue
      const list = map.get(r.room) ?? []
      list.push(r)
      map.set(r.room, list)
    }
    return map
  }, [residents])

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <DoorOpen className="w-5 h-5 text-gray-400" /> 樓層配置圖 · 2F
        </h1>
      </div>

      <div className="relative w-full select-none" style={{ aspectRatio: '1191 / 843' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={FLOOR_2F_IMAGE} alt="2F 樓層配置圖" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />

        {FLOOR_2F_ROOMS.map(hotspot => {
          const occupants = byRoom.get(hotspot.room) ?? []
          const occupied = occupants.length > 0
          return (
            <div
              key={hotspot.room}
              className={`absolute border-2 rounded transition-colors cursor-pointer ${
                occupied ? 'border-emerald-500/70 bg-emerald-400/10 hover:bg-emerald-400/25' : 'border-gray-300/70 bg-gray-200/10 hover:bg-gray-300/25'
              }`}
              style={{
                left: `${hotspot.x}%`, top: `${hotspot.y}%`,
                width: `${hotspot.w}%`, height: `${hotspot.h}%`,
              }}
              onMouseEnter={() => setActive(hotspot)}
              onMouseLeave={() => setActive(prev => (prev?.room === hotspot.room ? null : prev))}
              onClick={() => setActive(hotspot)}
            />
          )
        })}

        {active && (
          <RoomTooltip hotspot={active} occupants={byRoom.get(active.room) ?? []} onClose={() => setActive(null)} />
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">滑鼠移到房間上查看住戶，點擊查看詳細資料</p>
    </div>
  )
}

function RoomTooltip({ hotspot, occupants, onClose }: {
  hotspot: RoomHotspot
  occupants: ButlerResident[]
  onClose: () => void
}) {
  const left = Math.min(Math.max(hotspot.x + hotspot.w / 2, 12), 88)
  const top = hotspot.y > 50 ? hotspot.y - 2 : hotspot.y + hotspot.h + 2

  return (
    <div
      className="absolute z-10 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-48 -translate-x-1/2"
      style={{ left: `${left}%`, top: `${top}%` }}
      onMouseLeave={onClose}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-bold text-gray-900">房號 {hotspot.label}</span>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-xs">✕</button>
      </div>
      {occupants.length === 0 ? (
        <p className="text-xs text-gray-400">目前無住戶</p>
      ) : (
        <ul className="space-y-1">
          {occupants.map(r => (
            <li key={r.id}>
              <Link
                href={`/butler/residents/${r.id}`}
                className="text-xs text-emerald-700 hover:underline font-medium"
              >
                {r.name}{r.nickname ? `（${r.nickname}）` : ''}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
