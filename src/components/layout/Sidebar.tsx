'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ClipboardList, CalendarCheck, Wrench, Package,
  Archive, DoorOpen, Droplets, LogOut, Building2, Settings, Moon,
  Users, BookOpen, KeyRound, HelpCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// ─── 身分群組 ──────────────────────────────────
const ADMIN_ROLES      = ['admin', 'manager']
const NIGHTSHIFT_ROLES = ['frontdesk_night']          // 大夜班限制版
const TECHNICIAN_ROLES = ['technician']               // 工務完整版
// 其餘（frontdesk_day, housekeeper, admin_staff, sales）→ 一般版

// ─── 型別 ──────────────────────────────────────
type NavItem   = { label: string; href: string; icon: React.ElementType }
type NavGroup  = { type: 'group'; label: string; items: NavItem[] }
type NavSingle = { type: 'single' } & NavItem

// ─── 各身分導航 ────────────────────────────────

/** 管理員 */
const adminNav: NavItem[] = [
  { label: '帳號管理',     href: '/admin/users',       icon: Users    },
  { label: '保養項目管理', href: '/maintenance/admin', icon: Settings  },
  { label: '硬體設備管理', href: '/hardware/admin',    icon: Wrench   },
  { label: '財產清單',     href: '/assets',            icon: Archive  },
  { label: '房間登錄',     href: '/rooms',             icon: DoorOpen },
]

/** 全員主導航（admin/manager 使用） */
const fullNav: (NavSingle | NavGroup)[] = [
  { type: 'single', label: '總覽', href: '/dashboard', icon: LayoutDashboard },
  {
    type: 'group', label: '工務',
    items: [
      { label: '工務派工',   href: '/work-orders', icon: ClipboardList },
      { label: '保養提醒',   href: '/maintenance', icon: CalendarCheck },
      { label: '耗材進銷存', href: '/consumables', icon: Package       },
      { label: '水電紀錄',   href: '/utilities',   icon: Droplets      },
    ],
  },
  {
    type: 'group', label: '說明書',
    items: [
      { label: '使用說明書',     href: '/manuals',  icon: BookOpen },
      { label: '緊急維修說明書', href: '/hardware', icon: Wrench   },
    ],
  },
  { type: 'single', label: '房間登錄', href: '/rooms', icon: DoorOpen },
  {
    type: 'group', label: '大夜',
    items: [
      { label: '大夜工作表', href: '/nightshift',       icon: Moon       },
      { label: '使用說明書', href: '/nightshift/guide', icon: HelpCircle },
    ],
  },
]

/** 工務身分 */
const technicianNav: (NavSingle | NavGroup)[] = [
  {
    type: 'group', label: '工務',
    items: [
      { label: '工務派工',   href: '/work-orders', icon: ClipboardList },
      { label: '保養提醒',   href: '/maintenance', icon: CalendarCheck },
      { label: '耗材進銷存', href: '/consumables', icon: Package       },
      { label: '水電紀錄',   href: '/utilities',   icon: Droplets      },
    ],
  },
  {
    type: 'group', label: '說明書',
    items: [
      { label: '使用說明書',     href: '/manuals',  icon: BookOpen },
      { label: '緊急維修說明書', href: '/hardware', icon: Wrench   },
    ],
  },
  { type: 'single', label: '房間登錄', href: '/rooms', icon: DoorOpen },
]

/** 一般身分（frontdesk_day / housekeeper / admin_staff / sales） */
const generalNav: (NavSingle | NavGroup)[] = [
  { type: 'single', label: '工務派工', href: '/work-orders', icon: ClipboardList },
  {
    type: 'group', label: '說明書',
    items: [
      { label: '使用說明書',     href: '/manuals',  icon: BookOpen },
      { label: '緊急維修說明書', href: '/hardware', icon: Wrench   },
    ],
  },
  { type: 'single', label: '房間登錄', href: '/rooms', icon: DoorOpen },
]

/** 大夜班身分 */
const nightshiftNav: (NavSingle | NavGroup)[] = [
  {
    type: 'group', label: '工務',
    items: [
      { label: '工務派工', href: '/work-orders', icon: ClipboardList },
    ],
  },
  {
    type: 'group', label: '說明書',
    items: [
      { label: '使用說明書',     href: '/manuals',  icon: BookOpen },
      { label: '緊急維修說明書', href: '/hardware', icon: Wrench   },
    ],
  },
  {
    type: 'group', label: '大夜',
    items: [
      { label: '大夜工作表', href: '/nightshift',       icon: Moon        },
      { label: '使用說明書', href: '/nightshift/guide', icon: HelpCircle  },
    ],
  },
]

// ─── 子元件 ──────────────────────────────────
function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-sm font-medium transition-colors ${
        isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
      {item.label}
    </Link>
  )
}

function SubNavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 pl-7 pr-3 py-1.5 rounded-lg mb-0.5 text-sm transition-colors ${
        isActive ? 'text-emerald-700 font-medium' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      }`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-500' : 'text-gray-300'}`} />
      {item.label}
    </Link>
  )
}

function renderNav(nav: (NavSingle | NavGroup)[], pathname: string) {
  return nav.map((section, i) => {
    if (section.type === 'single') {
      return <NavLink key={section.href} item={section} pathname={pathname} />
    }
    return (
      <div key={section.label} className={i > 0 ? 'mt-1' : ''}>
        <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
          {section.label}
        </p>
        {section.items.map(item => (
          <SubNavLink key={item.href} item={item} pathname={pathname} />
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
  const [role, setRole] = useState<string>('')

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase
          .from('user_profiles').select('role').eq('id', user.id).single()
        setRole(profile?.role ?? '')
      } catch {}
    }
    checkRole()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin      = ADMIN_ROLES.includes(role)
  const isNightshift = NIGHTSHIFT_ROLES.includes(role)
  const isTechnician = TECHNICIAN_ROLES.includes(role)

  const nav = isAdmin      ? fullNav
            : isNightshift ? nightshiftNav
            : isTechnician ? technicianNav
            : role         ? generalNav
            : []  // 尚未載入時不顯示

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 bg-white border-r border-gray-200 flex-col z-10">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-200">
        <Building2 className="w-6 h-6 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">好好園館</p>
          <p className="text-xs text-gray-500">工務管理系統</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {renderNav(nav, pathname)}

        {/* 管理區（admin/manager only） */}
        {isAdmin && (
          <div className="mt-1">
            <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              管理
            </p>
            {adminNav.map(item => (
              <SubNavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </div>
        )}
      </nav>

      {/* 底部：修改密碼 + 登出 */}
      <div className="p-2 border-t border-gray-200 space-y-0.5">
        <Link
          href="/settings/password"
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            pathname === '/settings/password'
              ? 'bg-emerald-50 text-emerald-700'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
          }`}
        >
          <KeyRound className="w-4 h-4 shrink-0" />
          修改密碼
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          登出
        </button>
      </div>
    </aside>
  )
}
