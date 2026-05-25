import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Search, Package } from 'lucide-react'

const CATEGORIES = ['住宅設備', '電子電器設備', '事務設備', '廚房設備', '雜項設備']

const conditionLabel: Record<string, string> = {
  good: '正常', fair: '尚可', poor: '待維修', decommissioned: '已汰除',
}
const conditionColor: Record<string, string> = {
  good: 'bg-emerald-100 text-emerald-700',
  fair: 'bg-yellow-100 text-yellow-700',
  poor: 'bg-red-100 text-red-700',
  decommissioned: 'bg-gray-100 text-gray-400',
}

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; q?: string; page?: string }>
}) {
  const { cat, q, page } = await searchParams
  const supabase = await createClient()
  const PAGE_SIZE = 50
  const currentPage = Math.max(1, parseInt(page ?? '1'))
  const offset = (currentPage - 1) * PAGE_SIZE

  let query = supabase
    .from('hardware_items')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('category')
    .order('item_group')
    .order('name')
    .range(offset, offset + PAGE_SIZE - 1)

  if (cat) query = query.eq('category', cat)
  if (q) query = query.or(`name.ilike.%${q}%,asset_no.ilike.%${q}%,location.ilike.%${q}%,item_group.ilike.%${q}%`)

  const { data: items, count } = await query

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // 統計（不受篩選影響）
  const { data: stats } = await supabase
    .from('hardware_items')
    .select('category, condition')
    .eq('is_active', true)

  const total = stats?.length ?? 0
  const poor = stats?.filter(i => i.condition === 'poor').length ?? 0

  // admin 判斷
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user?.id ?? '')
    .single()
  const isAdmin = ['admin', 'manager'].includes(profile?.role ?? '')

  const buildUrl = (params: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    if (params.cat ?? cat) p.set('cat', params.cat ?? cat ?? '')
    if (params.q ?? q) p.set('q', params.q ?? q ?? '')
    if (params.page) p.set('page', params.page)
    const s = p.toString()
    return '/assets' + (s ? '?' + s : '')
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">財產清單</h1>
          <p className="text-sm text-gray-500 mt-0.5">設備財產盤點與追蹤</p>
        </div>
        {isAdmin && (
          <Link
            href="/assets/new"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />新增設備
          </Link>
        )}
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-400 mt-0.5">財產總數</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className={`text-2xl font-bold ${poor > 0 ? 'text-red-500' : 'text-gray-900'}`}>{poor}</p>
          <p className="text-xs text-gray-400 mt-0.5">待維修</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{count ?? 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">篩選結果</p>
        </div>
      </div>

      {/* 搜尋 */}
      <form method="GET" action="/assets" className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          name="q"
          defaultValue={q}
          placeholder="搜尋品名、財產編號、位置..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        {cat && <input type="hidden" name="cat" value={cat} />}
      </form>

      {/* 類別篩選 */}
      <div className="flex gap-2 flex-wrap mb-5">
        <Link
          href={buildUrl({ cat: undefined, page: '1' })}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            !cat ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >全部</Link>
        {CATEGORIES.map(c => (
          <Link key={c} href={buildUrl({ cat: c, page: '1' })}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              cat === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >{c}</Link>
        ))}
      </div>

      {/* 列表 */}
      {!items?.length ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Package className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">查無符合條件的設備</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
            {/* 桌機表頭 */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500">
              <div className="col-span-4">品名</div>
              <div className="col-span-2">群組</div>
              <div className="col-span-2">財產編號</div>
              <div className="col-span-2">位置</div>
              <div className="col-span-1">狀態</div>
              <div className="col-span-1"></div>
            </div>

            {/* 資料列 */}
            <div className="divide-y divide-gray-100">
              {items.map(item => (
                <Link
                  key={item.id}
                  href={`/assets/${item.id}`}
                  className="block md:grid md:grid-cols-12 md:gap-2 px-4 py-3 hover:bg-gray-50 transition-colors md:items-center"
                >
                  {/* 手機：卡片佈局 */}
                  <div className="md:col-span-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate flex-1">{item.name}</p>
                      {/* 手機狀態 badge（桌機隱藏） */}
                      <span className={`md:hidden shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${conditionColor[item.condition]}`}>
                        {conditionLabel[item.condition]}
                      </span>
                    </div>
                    {/* 手機副資訊 */}
                    <div className="md:hidden flex flex-wrap gap-x-2 mt-0.5 text-xs text-gray-500">
                      {item.location && <span>{item.location}</span>}
                      {item.item_group && <><span>·</span><span>{item.item_group}</span></>}
                      {item.asset_no && <span className="font-mono">{item.asset_no}</span>}
                    </div>
                  </div>
                  {/* 桌機欄位 */}
                  <div className="hidden md:block col-span-2 text-xs text-gray-500 truncate">{item.item_group ?? '—'}</div>
                  <div className="hidden md:block col-span-2 text-xs text-gray-500 font-mono truncate">{item.asset_no ?? '—'}</div>
                  <div className="hidden md:block col-span-2 text-xs text-gray-500 truncate">{item.location ?? '—'}</div>
                  <div className="hidden md:block col-span-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${conditionColor[item.condition]}`}>
                      {conditionLabel[item.condition]}
                    </span>
                  </div>
                  <div className="hidden md:block col-span-1 text-right text-gray-300 text-xs">›</div>
                </Link>
              ))}
            </div>
          </div>

          {/* 分頁 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>第 {currentPage} / {totalPages} 頁，共 {count} 筆</span>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link href={buildUrl({ page: String(currentPage - 1) })}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs">
                    ← 上一頁
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link href={buildUrl({ page: String(currentPage + 1) })}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs">
                    下一頁 →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
