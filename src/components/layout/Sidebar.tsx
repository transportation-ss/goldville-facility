'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard, ClipboardList, CalendarCheck, Wrench, Package,
  Archive, DoorOpen, Droplets, LogOut, Settings, Moon,
  Users, BookOpen, KeyRound, BedDouble, History,
  Sparkles, UserCog, Loader2, Layers, Images,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── 身分群組 ──────────────────────────────────
const ADMIN_ROLES             = ['admin', 'manager']
const NIGHTSHIFT_ROLES        = ['frontdesk_night', 'nightshift']
const TECHNICIAN_ROLES        = ['technician']
const PROCUREMENT_ROLES       = ['procurement']
const HOUSEKEEPING_ROLES      = ['housekeeping']
const TECH_HOUSEKEEPING_ROLES = ['tech_housekeeping']
const FRONTDESK_DAY_ROLES     = ['frontdesk_day']
const BUTLER_MANAGER_ROLES    = ['butler_manager', 'sales']
const BUTLER_ROLES            = ['butler']

const ROLE_LABELS: Record<string, string> = {
  admin:             '系統管理員',
  manager:           '管理員',
  technician:        '工務人員',
  procurement:       '採購人員',
  housekeeping:      '房務',
  tech_housekeeping: '工務＋房務',
  butler_manager:    '管家主管',
  butler:            '生活管家',
  frontdesk_day:     '日班櫃台',
  frontdesk_night:   '大夜班',
  nightshift:        '大夜班',
  sales:             '業務',
}

type NavItem   = { label: string; href: string; icon: React.ElementType; exact?: boolean }
type NavGroup  = { type: 'group'; label: string; items: NavItem[] }
type NavSingle = { type: 'single' } & NavItem

// ─── 管理員專屬項目 ────────────────────────────
const adminNav: NavItem[] = [
  { label: '帳號管理',     href: '/admin/users',       icon: Users    },
  { label: '保養項目管理', href: '/maintenance/admin', icon: Settings  },
  { label: '硬體設備管理', href: '/hardware/admin',    icon: Wrench   },
  { label: '財產清單',     href: '/assets',            icon: Archive  },
  { label: '房間登錄',     href: '/rooms',             icon: DoorOpen },
  { label: '樓層配置',     href: '/butler/floorplan',  icon: Layers   },
]

// ─── 全員主導航（admin/manager）────────────────
const fullNav: (NavSingle | NavGroup)[] = [
  { type: 'single', label: '總覽', href: '/dashboard', icon: LayoutDashboard, exact: true },
  {
    type: 'group', label: '工務',
    items: [
      { label: '工務任務',   href: '/work-orders', icon: ClipboardList },
      { label: '保養提醒',   href: '/maintenance', icon: CalendarCheck },
      { label: '耗材進銷存', href: '/consumables', icon: Package       },
      { label: '水電紀錄',   href: '/utilities',   icon: Droplets      },
    ],
  },
  {
    type: 'group', label: '說明書',
    items: [
      { label: '設備說明書', href: '/manuals',  icon: BookOpen },
      { label: '緊急維修',   href: '/hardware', icon: Wrench   },
    ],
  },
  {
    type: 'group', label: '房務',
    items: [
      { label: '房務任務',     href: '/housekeeping',         icon: BedDouble     },
      { label: '房務派工',     href: '/housekeeping/plan',    icon: ClipboardList },
      { label: '歷史紀錄(房)', href: '/housekeeping/history', icon: History       },
      { label: '使用指引(房)', href: '/housekeeping/guide',   icon: BookOpen      },
    ],
  },
  {
    type: 'group', label: '大夜',
    items: [
      { label: '大夜工作表', href: '/nightshift',       icon: Moon       },
      { label: '使用指引(夜)', href: '/nightshift/guide', icon: BookOpen },
    ],
  },
  {
    type: 'group', label: '管家',
    items: [
      { label: '管家任務',     href: '/butler',           icon: Sparkles,     exact: true },
      { label: '管家派工',     href: '/butler/plan',      icon: ClipboardList },
      { label: '住戶列表',     href: '/butler/residents', icon: Users         },
      { label: '服務紀錄',     href: '/butler/logs',      icon: BookOpen      },
      { label: '管家清單',     href: '/butler/staff',     icon: UserCog       },
      { label: '班表管理',     href: '/butler/schedule',  icon: History       },
      { label: '歷史紀錄(管)', href: '/butler/history',   icon: History       },
      { label: '照片庫',       href: '/butler/photos',    icon: Images        },
      { label: '使用指引(管)', href: '/butler/guide',     icon: BookOpen      },
    ],
  },
]

/** 工務人員 */
const technicianNav: (NavSingle | NavGroup)[] = [
  {
    type: 'group', label: '工務',
    items: [
      { label: '工務任務',   href: '/work-orders', icon: ClipboardList },
      { label: '保養提醒',   href: '/maintenance', icon: CalendarCheck },
      { label: '耗材進銷存', href: '/consumables', icon: Package       },
      { label: '水電紀錄',   href: '/utilities',   icon: Droplets      },
    ],
  },
  {
    type: 'group', label: '說明書',
    items: [
      { label: '設備說明書', href: '/manuals',  icon: BookOpen },
      { label: '緊急維修',   href: '/hardware', icon: Wrench   },
    ],
  },
  { type: 'single', label: '房間登錄',     href: '/rooms',             icon: DoorOpen },
  { type: 'single', label: '保養項目管理', href: '/maintenance/admin', icon: Settings },
]

/** 採購人員 */
const procurementNav: (NavSingle | NavGroup)[] = [
  { type: 'single', label: '耗材進銷存',   href: '/consumables',    icon: Package  },
  {
    type: 'group', label: '說明書',
    items: [
      { label: '設備說明書', href: '/manuals',  icon: BookOpen },
      { label: '緊急維修',   href: '/hardware', icon: Wrench   },
    ],
  },
  { type: 'single', label: '房間登錄',     href: '/rooms',          icon: DoorOpen },
  { type: 'single', label: '硬體設備管理', href: '/hardware/admin', icon: Wrench   },
  { type: 'single', label: '財產清單',     href: '/assets',         icon: Archive  },
]

/** 房務 */
const housekeepingNav: (NavSingle | NavGroup)[] = [
  { type: 'single', label: '工務任務', href: '/work-orders', icon: ClipboardList },
  {
    type: 'group', label: '房務',
    items: [
      { label: '房務任務',     href: '/housekeeping',         icon: BedDouble },
      { label: '歷史紀錄(房)', href: '/housekeeping/history', icon: History   },
      { label: '使用指引(房)', href: '/housekeeping/guide',   icon: BookOpen  },
    ],
  },
  {
    type: 'group', label: '說明書',
    items: [
      { label: '設備說明書', href: '/manuals',  icon: BookOpen },
      { label: '緊急維修',   href: '/hardware', icon: Wrench   },
    ],
  },
]

/** 工務＋房務 */
const techHousekeepingNav: (NavSingle | NavGroup)[] = [
  {
    type: 'group', label: '工務',
    items: [
      { label: '工務任務',   href: '/work-orders', icon: ClipboardList },
      { label: '保養提醒',   href: '/maintenance', icon: CalendarCheck },
      { label: '耗材進銷存', href: '/consumables', icon: Package       },
      { label: '水電紀錄',   href: '/utilities',   icon: Droplets      },
    ],
  },
  {
    type: 'group', label: '說明書',
    items: [
      { label: '設備說明書', href: '/manuals',  icon: BookOpen },
      { label: '緊急維修',   href: '/hardware', icon: Wrench   },
    ],
  },
  { type: 'single', label: '房間登錄', href: '/rooms', icon: DoorOpen },
  {
    type: 'group', label: '房務',
    items: [
      { label: '房務任務', href: '/housekeeping',       icon: BedDouble },
      { label: '使用指引(房)', href: '/housekeeping/guide', icon: BookOpen  },
    ],
  },
]

/** 日班櫃台 */
const frontdeskDayNav: (NavSingle | NavGroup)[] = [
  { type: 'single', label: '工務任務', href: '/work-orders', icon: ClipboardList },
  {
    type: 'group', label: '房務',
    items: [
      { label: '房務任務',     href: '/housekeeping',         icon: BedDouble     },
      { label: '房務派工',     href: '/housekeeping/plan',    icon: ClipboardList },
      { label: '歷史紀錄(房)', href: '/housekeeping/history', icon: History       },
      { label: '使用指引(房)', href: '/housekeeping/guide',   icon: BookOpen      },
    ],
  },
  {
    type: 'group', label: '說明書',
    items: [
      { label: '設備說明書', href: '/manuals',  icon: BookOpen },
      { label: '緊急維修',   href: '/hardware', icon: Wrench   },
    ],
  },
  { type: 'single', label: '房間登錄', href: '/rooms', icon: DoorOpen },
]

/** 大夜班 */
const nightshiftNav: (NavSingle | NavGroup)[] = [
  { type: 'single', label: '工務任務', href: '/work-orders', icon: ClipboardList },
  {
    type: 'group', label: '說明書',
    items: [
      { label: '設備說明書', href: '/manuals',  icon: BookOpen },
      { label: '緊急維修',   href: '/hardware', icon: Wrench   },
    ],
  },
  {
    type: 'group', label: '大夜',
    items: [
      { label: '大夜工作表', href: '/nightshift',       icon: Moon        },
      { label: '使用指引(夜)', href: '/nightshift/guide', icon: BookOpen  },
    ],
  },
]

/** 管家主管 */
const butlerManagerNav: (NavSingle | NavGroup)[] = [
  {
    type: 'group', label: '管家',
    items: [
      { label: '管家任務', href: '/butler',            icon: Sparkles,     exact: true },
      { label: '管家派工', href: '/butler/plan',       icon: ClipboardList },
      { label: '住戶列表', href: '/butler/residents',  icon: Users         },
      { label: '管家清單', href: '/butler/staff',      icon: UserCog       },
      { label: '服務紀錄', href: '/butler/logs',       icon: BookOpen      },
      { label: '班表管理', href: '/butler/schedule',   icon: History       },
      { label: '照片庫',   href: '/butler/photos',     icon: Images        },
      { label: '使用指引(管)', href: '/butler/guide',      icon: BookOpen      },
    ],
  },
  {
    type: 'group', label: '說明書',
    items: [
      { label: '設備說明書', href: '/manuals',  icon: BookOpen },
      { label: '緊急維修',   href: '/hardware', icon: Wrench   },
    ],
  },
]

/** 管家 */
const butlerNav: (NavSingle | NavGroup)[] = [
  {
    type: 'group', label: '管家',
    items: [
      { label: '管家任務', href: '/butler',           icon: Sparkles, exact: true },
      { label: '住戶列表', href: '/butler/residents', icon: Users     },
      { label: '服務紀錄', href: '/butler/logs',      icon: BookOpen  },
      { label: '班表',     href: '/butler/schedule',  icon: History   },
      { label: '照片庫',   href: '/butler/photos',    icon: Images    },
      { label: '使用指引(管)', href: '/butler/guide',     icon: BookOpen  },
    ],
  },
  {
    type: 'group', label: '說明書',
    items: [
      { label: '設備說明書', href: '/manuals',  icon: BookOpen },
      { label: '緊急維修',   href: '/hardware', icon: Wrench   },
    ],
  },
]

/** 最小 fallback（未知身分） */
const minimalNav: (NavSingle | NavGroup)[] = [
  {
    type: 'group', label: '說明書',
    items: [
      { label: '設備說明書', href: '/manuals',  icon: BookOpen },
      { label: '緊急維修',   href: '/hardware', icon: Wrench   },
    ],
  },
]

// ─── 子元件 ──────────────────────────────────
function NavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick?: () => void }) {
  const isActive = item.exact ? pathname === item.href : (pathname === item.href || pathname.startsWith(item.href + '/'))
  const Icon = item.icon
  return (
    <Link href={item.href} onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-sm font-medium transition-colors ${
        isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}>
      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
      {item.label}
    </Link>
  )
}

function SubNavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick?: () => void }) {
  const isActive = item.exact ? pathname === item.href : (pathname === item.href || pathname.startsWith(item.href + '/'))
  const Icon = item.icon
  return (
    <Link href={item.href} onClick={onClick}
      className={`flex items-center gap-2.5 pl-7 pr-3 py-1.5 rounded-lg mb-0.5 text-sm transition-colors ${
        isActive ? 'text-emerald-700 font-medium' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      }`}>
      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-500' : 'text-gray-300'}`} />
      {item.label}
    </Link>
  )
}

function renderNav(nav: (NavSingle | NavGroup)[], pathname: string, onClick?: () => void) {
  return nav.map((section, i) => {
    if (section.type === 'single') {
      return <NavLink key={section.href} item={section} pathname={pathname} onClick={onClick} />
    }
    return (
      <div key={section.label} className={i > 0 ? 'mt-1' : ''}>
        <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          {section.label}
        </p>
        {section.items.map(item => (
          <SubNavLink key={item.href} item={item} pathname={pathname} onClick={onClick} />
        ))}
      </div>
    )
  })
}

// ─── 主元件 ──────────────────────────────────
export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [role, setRole]               = useState<string>('')
  const [displayName, setDisplayName] = useState<string>('')
  const [isNavigating, setIsNavigating] = useState(false)
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase
          .from('user_profiles').select('role, display_name').eq('id', user.id).single()
        setRole(profile?.role ?? '')
        setDisplayName(profile?.display_name ?? '')
      } catch {}
    }
    checkRole()
  }, [])

  useEffect(() => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current)
      navTimerRef.current = null
    }
    setIsNavigating(false)
  }, [pathname])

  function handleNavClick() {
    navTimerRef.current = setTimeout(() => setIsNavigating(true), 150)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin            = ADMIN_ROLES.includes(role)
  const isNightshift       = NIGHTSHIFT_ROLES.includes(role)
  const isTechnician       = TECHNICIAN_ROLES.includes(role)
  const isProcurement      = PROCUREMENT_ROLES.includes(role)
  const isHousekeeping     = HOUSEKEEPING_ROLES.includes(role)
  const isTechHousekeeping = TECH_HOUSEKEEPING_ROLES.includes(role)
  const isFrontdeskDay     = FRONTDESK_DAY_ROLES.includes(role)
  const isButlerManager    = BUTLER_MANAGER_ROLES.includes(role)
  const isButler           = BUTLER_ROLES.includes(role)

  const nav = isAdmin            ? fullNav
            : isNightshift       ? nightshiftNav
            : isTechnician       ? technicianNav
            : isProcurement      ? procurementNav
            : isHousekeeping     ? housekeepingNav
            : isTechHousekeeping ? techHousekeepingNav
            : isFrontdeskDay     ? frontdeskDayNav
            : isButlerManager    ? butlerManagerNav
            : isButler           ? butlerNav
            : role               ? minimalNav
            : []

  return (
    <>
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-200 flex-col z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-200">
          <Image src="/logo.png" alt="好好園館大平台" width={28} height={28} className="rounded-md shrink-0" />
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">好好園館大平台</p>
            <p className="text-xs text-gray-500">內部管理系統</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {renderNav(nav, pathname, handleNavClick)}

          {isAdmin && (
            <div className="mt-1">
              <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                管理
              </p>
              {adminNav.map(item => (
                <SubNavLink key={item.href} item={item} pathname={pathname} onClick={handleNavClick} />
              ))}
            </div>
          )}
        </nav>

        {/* 底部：使用者資訊 + 修改密碼 + 登出 */}
        <div className="p-2 border-t border-gray-200 space-y-0.5">
          {displayName && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1">
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-emerald-700">{displayName.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                <p className="text-xs text-gray-400 truncate">{ROLE_LABELS[role] ?? role}</p>
              </div>
            </div>
          )}
          <Link href="/settings/password"
            onClick={handleNavClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === '/settings/password'
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}>
            <KeyRound className="w-4 h-4 shrink-0" />
            修改密碼
          </Link>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="w-4 h-4 shrink-0" />
            登出
          </button>
        </div>
      </aside>

      {/* 導航讀取中遮罩 */}
      {isNavigating && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl px-6 py-4 flex items-center gap-3 shadow-lg">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span className="text-sm font-medium text-gray-700">讀取中…</span>
          </div>
        </div>
      )}
    </>
  )
}
