'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  CalendarCheck,
  Wrench,
  Package,
  Archive,
  DoorOpen,
  Droplets,
  BarChart3,
  LogOut,
  Building2,
  Settings,
  Moon,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const navItems = [
  {
    label: '總覽',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: '工務派工',
    href: '/work-orders',
    icon: ClipboardList,
  },
  {
    label: '保養提醒',
    href: '/maintenance',
    icon: CalendarCheck,
  },
  {
    label: '耗材進銷存',
    href: '/consumables',
    icon: Package,
  },
  {
    label: '緊急維修說明書',
    href: '/hardware',
    icon: Wrench,
  },
  {
    label: '財產清單',
    href: '/assets',
    icon: Archive,
  },
  {
    label: '房間登錄',
    href: '/rooms',
    icon: DoorOpen,
  },
  {
    label: '水電紀錄',
    href: '/utilities',
    icon: Droplets,
  },
  {
    label: '報表',
    href: '/reports',
    icon: BarChart3,
  },
  {
    label: '大夜工作表',
    href: '/nightshift',
    icon: Moon,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        setIsAdmin(!!(profile && ['admin', 'manager'].includes(profile.role)))
      } catch (error) {
        console.error('Error checking role:', error)
      }
    }

    checkRole()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
              {item.label}
            </Link>
          )
        })}

        {/* Admin Menu */}
        {isAdmin && (
          <>
            <div className="my-2 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              管理
            </div>
            <Link
              href="/admin/users"
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors
                ${pathname.startsWith('/admin/users')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <Users className={`w-4 h-4 shrink-0 ${pathname.startsWith('/admin/users') ? 'text-emerald-600' : 'text-gray-400'}`} />
              帳號管理
            </Link>
            <Link
              href="/maintenance/admin"
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors
                ${pathname.startsWith('/maintenance/admin')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <Settings className={`w-4 h-4 shrink-0 ${pathname.startsWith('/maintenance/admin') ? 'text-emerald-600' : 'text-gray-400'}`} />
              保養項目管理
            </Link>
            <Link
              href="/hardware/admin"
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors
                ${pathname.startsWith('/hardware/admin')
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <Wrench className={`w-4 h-4 shrink-0 ${pathname.startsWith('/hardware/admin') ? 'text-emerald-600' : 'text-gray-400'}`} />
              硬體設備管理
            </Link>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-gray-200">
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
