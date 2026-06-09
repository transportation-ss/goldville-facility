'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, ClipboardList, Package, Wrench, Menu, X,
  CalendarCheck, Archive, DoorOpen, Droplets, Moon, BedDouble,
  Users, LogOut, BookOpen, HelpCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── 型別 ──────────────────────────────────────
type NavItem = { label: string; href: string; icon: React.ElementType }

// ─── 各身分手機導航設定 ─────────────────────────
// primaryNav = 底部 Tab Bar（最多 4 項，第 4 格留給「更多」）
// moreNav    = 更多面板（額外項目）

type RoleNav = { primary: NavItem[]; more: NavItem[] }

function getNavByRole(role: string, isAdmin: boolean): RoleNav {
  switch (role) {
    // ── 管理員 / 主管 ──
    case 'admin':
    case 'manager':
      return {
        primary: [
          { label: '總覽',   href: '/dashboard',   icon: LayoutDashboard },
          { label: '派工單', href: '/work-orders',  icon: ClipboardList   },
          { label: '今日任務', href: '/housekeeping', icon: BedDouble      },
          { label: '大夜班', href: '/nightshift',   icon: Moon             },
        ],
        more: [
          { label: '保養提醒',   href: '/maintenance',      icon: CalendarCheck },
          { label: '進銷存',     href: '/consumables',       icon: Package       },
          { label: '水電紀錄',   href: '/utilities',         icon: Droplets      },
          { label: '說明書',     href: '/manuals',           icon: BookOpen      },
          { label: '緊急維修',   href: '/hardware',          icon: Wrench        },
          { label: '房間登錄',   href: '/rooms',             icon: DoorOpen      },
          { label: '財產清單',   href: '/assets',            icon: Archive       },
          { label: '帳號管理',   href: '/admin/users',       icon: Users         },
        ],
      }

    // ── 工務人員 ──
    case 'technician':
      return {
        primary: [
          { label: '派工單', href: '/work-orders', icon: ClipboardList },
          { label: '進銷存', href: '/consumables',  icon: Package       },
          { label: '保養提醒', href: '/maintenance', icon: CalendarCheck },
        ],
        more: [
          { label: '水電紀錄', href: '/utilities', icon: Droplets  },
          { label: '說明書',   href: '/manuals',   icon: BookOpen  },
          { label: '緊急維修', href: '/hardware',  icon: Wrench    },
          { label: '房間登錄', href: '/rooms',     icon: DoorOpen  },
        ],
      }

    // ── 工務＋房務 ──
    case 'tech_housekeeping':
      return {
        primary: [
          { label: '派工單',   href: '/work-orders',  icon: ClipboardList },
          { label: '進銷存',   href: '/consumables',   icon: Package       },
          { label: '今日任務', href: '/housekeeping',  icon: BedDouble     },
        ],
        more: [
          { label: '保養提醒', href: '/maintenance', icon: CalendarCheck },
          { label: '水電紀錄', href: '/utilities',   icon: Droplets      },
          { label: '說明書',   href: '/manuals',     icon: BookOpen      },
          { label: '緊急維修', href: '/hardware',    icon: Wrench        },
          { label: '房間登錄', href: '/rooms',       icon: DoorOpen      },
        ],
      }

    // ── 採購人員 ──
    case 'procurement':
      return {
        primary: [
          { label: '派工單', href: '/work-orders', icon: ClipboardList },
          { label: '進銷存', href: '/consumables',  icon: Package       },
        ],
        more: [
          { label: '說明書',     href: '/manuals',          icon: BookOpen },
          { label: '緊急維修',   href: '/hardware',         icon: Wrench   },
          { label: '房間登錄',   href: '/rooms',            icon: DoorOpen },
          { label: '硬體管理',   href: '/hardware/admin',   icon: Wrench   },
          { label: '財產清單',   href: '/assets',           icon: Archive  },
        ],
      }

    // ── 房務主管 ──
    case 'housekeeping':
      return {
        primary: [
          { label: '今日任務', href: '/housekeeping',      icon: BedDouble     },
          { label: '派工管理', href: '/housekeeping/plan', icon: ClipboardList },
        ],
        more: [],
      }

    // ── 房務人員 ──
    case 'housekeeper':
      return {
        primary: [
          { label: '今日任務', href: '/housekeeping', icon: BedDouble },
        ],
        more: [
          { label: '說明書',   href: '/manuals',  icon: BookOpen },
          { label: '緊急維修', href: '/hardware', icon: Wrench   },
        ],
      }

    // ── 大夜班 ──
    case 'frontdesk_night':
    case 'nightshift':
      return {
        primary: [
          { label: '大夜班', href: '/nightshift',       icon: Moon        },
          { label: '派工單', href: '/work-orders',      icon: ClipboardList },
        ],
        more: [
          { label: '說明書',   href: '/manuals',           icon: BookOpen   },
          { label: '緊急維修', href: '/hardware',           icon: Wrench     },
          { label: '大夜說明', href: '/nightshift/guide',   icon: HelpCircle },
        ],
      }

    // ── 日班櫃台 / 行政 / 業務 / frontdesk ──
    default:
      return {
        primary: [
          { label: '派工單',   href: '/work-orders',  icon: ClipboardList },
          { label: '今日任務', href: '/housekeeping', icon: BedDouble     },
        ],
        more: [
          { label: '說明書',   href: '/manuals',  icon: BookOpen },
          { label: '緊急維修', href: '/hardware', icon: Wrench   },
          { label: '房間登錄', href: '/rooms',    icon: DoorOpen },
        ],
      }
  }
}

export function MobileNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
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

  const isAdmin = ['admin', 'manager'].includes(role)
  const { primary: primaryNav, more: moreNav } = role
    ? getNavByRole(role, isAdmin)
    : { primary: [], more: [] }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  // 是否需要顯示「更多」按鈕
  const hasMore = moreNav.length > 0

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
            {moreNav.length > 0 && (
              <>
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
                </div>
              </>
            )}

            {/* 登出 */}
            <div className={`${moreNav.length > 0 ? 'mt-4 pt-4 border-t border-gray-100' : ''}`}>
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

          {/* 更多按鈕（有額外項目才顯示） */}
          {hasMore && (
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
          )}

          {/* 沒有更多項目時，登出直接放在 Tab Bar */}
          {!hasMore && (
            <button
              onClick={handleLogout}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-500 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] font-medium">登出</span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
