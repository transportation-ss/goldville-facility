import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'

const FLOOR_ORDER = ['B1', '1F', '2F-7F', '2F', '3F', '5F', '6F', '7F', '8F', 'R1', 'R2', 'R3', 'R樓']

export default async function HardwareAdminPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('emergency_manuals')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  const grouped: Record<string, typeof items> = {}
  for (const item of items ?? []) {
    const f = item.floor || '其他'
    if (!grouped[f]) grouped[f] = []
    grouped[f]!.push(item)
  }

  const sortedFloors = Object.keys(grouped).sort((a, b) => {
    const ia = FLOOR_ORDER.indexOf(a)
    const ib = FLOOR_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">維修說明書管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">共 {items?.length ?? 0} 筆</p>
        </div>
        <Link
          href="/hardware/admin/new"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          新增項目
        </Link>
      </div>

      <div className="space-y-4">
        {sortedFloors.map(floor => (
          <div key={floor}>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">{floor}</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {grouped[floor]?.map(item => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1 text-xs text-gray-400 mb-0.5">
                      {item.sub_location && <span>{item.sub_location}</span>}
                      {item.sub_location && item.equipment_name && <span>·</span>}
                      {item.equipment_name && <span className="font-medium text-gray-600">{item.equipment_name}</span>}
                    </div>
                    <p className="text-sm text-gray-800 truncate">{item.issue_desc || '（無狀況說明）'}</p>
                    {item.vendor_phone && (
                      <p className="text-xs text-blue-500 mt-0.5">{item.vendor_phone}</p>
                    )}
                  </div>
                  <Link
                    href={`/hardware/admin/${item.id}`}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 shrink-0 mt-0.5"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
