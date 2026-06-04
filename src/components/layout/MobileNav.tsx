'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, ClipboardList, Package, Wrench, Menu, X,
  CalendarCheck, Archive, DoorOpen, Droplets, Moon, BedDouble,
  Users, LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const primaryNav = [
  { label: '總覽',   href: '/dashboard',   icon: LayoutDashboard },
  { label: '派工單', href: '/work-orders',  icon: ClipboardList   },
  { label: '進銷存', href: '/consumables',  icon: Package          },
  { label: '大夜班', href: '/nightshift',   icon: Moon             },
]

const moreNav = [
  { label: '保養提醒', href: '/maintenance',  icon: CalendarCheck },
  { label: '房務派工', href: '/housekeeping', icon: BedDouble      },
  { label: '財產清單', href: '/assets',       icon: Archive        },
  { label: '說明書',   href: '/hardware',     icon: Wrench         },
  { label: '房間登錄', href: '/rooms',        icon: DoorOpen       },
  { label: '水電紀錄', href: '/utilities',    icon: Droplets       },
]

const ADMIN_ROLES = ['admin', 'manager']

export function MobileNav() {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const [showMore, setShowMore] = useState(false)
  const [role, setRole]         = useState<string>('')

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase
          .from('user_profiles').select('role').eq('id', user.id).single()
        setRole(profile?.role ?? '')
      } catch {}
    }
    fetchRole()
  }, [])

  const isAdmin = ADMIN_ROLES.includes(role)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* 更多選單 overlay */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-4 pb-5 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">其他功能</p>
            <div className="grid grid-cols-4 gap-1">
              {moreNav.map(item => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors ${
                      active ? 'bg-emerald-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-emerald-600' : 'text-gray-500'}`} />
                    <span className={`text-[11px] font-medium ${active ? 'text-emerald-600' : 'text-gray-600'}`}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}

              {/* 管理員專屬：帳號管理 */}
              {isAdmin && (
                <Link
                  href="/admin/users"
                  onClick={() => setShowMore(false)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors ${
                    isActive('/admin/users') ? 'bg-emerald-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <Users className={`w-5 h-5 ${isActive('/admin/users') ? 'text-emerald-600' : 'text-gray-500'}`} />
                  <span className={`text-[11px] font-medium ${isActive('/admin/users') ? 'text-emerald-600' : 'text-gray-600'}`}>
                    帳號管理
                  </span>
                </Link>
              )}
            </div>

            {/* 登出 */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                登出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部 Tab Bar（只在手機顯示）*/}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 safe-bottom">
        <div className="flex items-stretch h-16">
          {primaryNav.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-emerald-600' : 'text-gray-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
          <button
            onClick={() => setShowMore(o => !o)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              showMore ? 'text-emerald-600' : 'text-gray-500'
            }`}
          >
            {showMore
              ? <X className="w-5 h-5" />
              : <Menu className="w-5 h-5" />
            }
            <span className="text-[10px] font-medium">更多</span>
          </button>
        </div>
      </nav>
    </>
  )
}
