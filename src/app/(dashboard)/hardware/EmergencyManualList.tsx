'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Phone, Search, Plus } from 'lucide-react'
import Link from 'next/link'

const FLOOR_ORDER = ['B1', '1F', '2F-7F', '2F', '3F', '5F', '6F', '7F', '8F', 'R1', 'R2', 'R3', 'R樓']

interface ManualRow {
  id: string
  floor: string
  sub_location: string | null
  equipment_name: string | null
  issue_desc: string | null
  repair_method: string | null
  vendor_phone: string | null
}

interface Props {
  items: ManualRow[]
  isAdmin: boolean
}

// 折疊卡片
function AccordionItem({
  title,
  subtitle,
  rows,
  isAdmin,
}: {
  title: string
  subtitle?: string
  rows: ManualRow[]
  isAdmin: boolean
}) {
  const [open, setOpen] = useState(false)
  const hasContent = rows.some(r => r.issue_desc || r.repair_method)

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 truncate">{subtitle}</p>}
        </div>
        <span className="text-xs text-gray-300 shrink-0">{rows.length} 筆</span>
      </button>

      {open && (
        <div className="px-4 pb-3 pl-11 space-y-2">
          {rows.map(row => (
            <div key={row.id} className="group bg-gray-50 rounded-lg p-3">
              {row.issue_desc && (
                <p className="text-xs font-semibold text-amber-600 mb-1">⚠ {row.issue_desc}</p>
              )}
              {row.repair_method && (
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {row.repair_method}
                </p>
              )}
              {row.vendor_phone && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Phone className="w-3 h-3 text-blue-400 shrink-0" />
                  <span className="text-xs text-blue-600">{row.vendor_phone}</span>
                </div>
              )}
              {isAdmin && (
                <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/hardware/admin/${row.id}`}
                    className="text-xs text-gray-400 hover:text-gray-600 underline">
                    編輯
                  </Link>
                </div>
              )}
            </div>
          ))}
          {!hasContent && (
            <p className="text-xs text-gray-300 py-1">（尚無詳細說明）</p>
          )}
        </div>
      )}
    </div>
  )
}

export function EmergencyManualList({ items, isAdmin }: Props) {
  const [search, setSearch] = useState('')
  const [floorFilter, setFloorFilter] = useState('')

  // 所有樓層
  const allFloors = useMemo(() =>
    [...new Set(items.map(i => i.floor).filter(Boolean))]
      .sort((a, b) => {
        const ia = FLOOR_ORDER.indexOf(a); const ib = FLOOR_ORDER.indexOf(b)
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      }),
    [items]
  )

  // 篩選後資料
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(item => {
      if (floorFilter && item.floor !== floorFilter) return false
      if (!q) return true
      return [item.sub_location, item.equipment_name, item.issue_desc, item.repair_method, item.vendor_phone]
        .some(v => v?.toLowerCase().includes(q))
    })
  }, [items, search, floorFilter])

  // 分組：floor → sub_location → equipment_name → rows
  type Group = { key: string; title: string; subtitle: string; floor: string; rows: ManualRow[] }
  const groups = useMemo(() => {
    const map = new Map<string, Group>()
    for (const item of filtered) {
      const loc = item.sub_location || ''
      const eq = item.equipment_name || ''
      const key = `${item.floor}||${loc}||${eq}`
      if (!map.has(key)) {
        const title = eq || loc || item.floor
        const subtitle = eq ? (loc ? `${item.floor} · ${loc}` : item.floor) : item.floor
        map.set(key, { key, title, subtitle, floor: item.floor, rows: [] })
      }
      map.get(key)!.rows.push(item)
    }
    return [...map.values()]
  }, [filtered])

  return (
    <div>
      {/* 搜尋 */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜尋裝備名稱、狀況說明、廠商..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* 樓層 Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
        <button
          onClick={() => setFloorFilter('')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !floorFilter ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >全部</button>
        {allFloors.map(f => (
          <button key={f}
            onClick={() => setFloorFilter(f === floorFilter ? '' : f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              floorFilter === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >{f}</button>
        ))}
      </div>

      {/* 結果數 */}
      <p className="text-xs text-gray-400 mb-3">
        顯示 {groups.length} 個項目
        {(search || floorFilter) && <span>（篩選中）</span>}
      </p>

      {/* 折疊列表 */}
      {groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-400">查無符合條件的項目</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {groups.map(group => (
            <AccordionItem
              key={group.key}
              title={group.title}
              subtitle={group.subtitle}
              rows={group.rows}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  )
}
