'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, ClipboardList, Package, Wrench, Menu, X,
  CalendarCheck, Archive, DoorOpen, Droplets, Moon, BedDouble,
  Users, LogOut, BookOpen, History, Sparkles, UserCog, Settings, Layers, Images, BarChart3,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── 型別 ─────────────────────────────────────
type NavItem    = { label: string; href: string; icon: React.ElementType }
type NavSection = { label?: string; items: NavItem[] }
type RoleNav    = { primary: NavItem[]; more: NavSection[] }

// ─── 各身分手機導航設定 ────────────────────────
function getNavByRole(role: string): RoleNav {
  switch (role) {

    // ── 管理員 / 主管 ──────────────────────────
    case 'admin':
    case 'manager':
      return {
        primary: [
          { label: '總覽',       href: '/dashboard',   icon: LayoutDashboard },
          { label: '大夜工作表', href: '/nightshift',   icon: Moon            },
          { label: '房務任務',   href: '/housekeeping', icon: BedDouble       },
          { label: '管家任務',   href: '/butler',       icon: Sparkles        },
        ],
        more: [
          {
            label: '工務',
            items: [
              { label: '工務任務',   href: '/work-orders', icon: ClipboardList },
              { label: '保養提醒',   href: '/maintenance', icon: CalendarCheck },
              { label: '耗材進銷存', href: '/consumables', icon: Package       },
              { label: '水電紀錄',   href: '/utilities',   icon: Droplets      },
            ],
          },
          {
            label: '房務',
            items: [
              { label: '房務派工',     href: '/housekeeping/plan',    icon: ClipboardList },
              { label: '歷史紀錄(房)', href: '/housekeeping/history', icon: History       },
              { label: '使用指引(房)', href: '/housekeeping/guide',   icon: BookOpen      },
            ],
          },
          {
            label: '大夜',
            items: [
              { label: '使用指引(夜)', href: '/nightshift/guide', icon: BookOpen },
            ],
          },
          {
            label: '管家',
            items: [
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
          {
            label: '說明書',
            items: [
              { label: '設備說明書', href: '/manuals',  icon: BookOpen },
              { label: '緊急維修',   href: '/hardware', icon: Wrench   },
            ],
          },
          {
            label: '管理',
            items: [
              { label: '房間登錄', href: '/rooms',            icon: DoorOpen  },
              { label: '帳號管理', href: '/admin/users',      icon: Users     },
              { label: '財產清單', href: '/assets',           icon: Archive   },
              { label: '樓層配置', href: '/butler/floorplan', icon: Layers    },
              { label: '數據後台', href: process.env.NEXT_PUBLIC_USAGE_DASHBOARD_URL || 'http://localhost:3002', icon: BarChart3 },
            ],
          },
        ],
      }

    // ── 工務人員 ────────────────────────────────
    case 'technician':
      return {
        primary: [
          { label: '工務任務', href: '/work-orders', icon: ClipboardList },
          { label: '進銷存',   href: '/consumables', icon: Package       },
          { label: '保養提醒', href: '/maintenance', icon: CalendarCheck },
          { label: '水電紀錄', href: '/utilities',   icon: Droplets      },
        ],
        more: [
          {
            items: [
              { label: '設備說明書',   href: '/manuals',           icon: BookOpen },
              { label: '緊急維修',     href: '/hardware',          icon: Wrench   },
              { label: '房間登錄',     href: '/rooms',             icon: DoorOpen },
              { label: '保養項目管理', href: '/maintenance/admin', icon: Settings },
            ],
          },
        ],
      }

    // ── 工務＋房務 ──────────────────────────────
    case 'tech_housekeeping':
      return {
        primary: [
          { label: '工務任務',   href: '/work-orders', icon: ClipboardList },
          { label: '房務任務',   href: '/housekeeping', icon: BedDouble    },
          { label: '耗材進銷存', href: '/consumables',  icon: Package      },
          { label: '保養提醒',   href: '/maintenance',  icon: CalendarCheck},
        ],
        more: [
          {
            items: [
              { label: '水電紀錄', href: '/utilities',         icon: Droplets  },
              { label: '房間登錄', href: '/rooms',             icon: DoorOpen  },
              { label: '設備說明書', href: '/manuals',         icon: BookOpen  },
              { label: '緊急維修', href: '/hardware',          icon: Wrench    },
              { label: '房務說明', href: '/housekeeping/guide', icon: BookOpen },
            ],
          },
        ],
      }

    // ── 採購人員 ────────────────────────────────
    case 'procurement':
      return {
        primary: [
          { label: '耗材進銷存',   href: '/consumables',    icon: Package  },
          { label: '硬體設備管理', href: '/hardware/admin', icon: Wrench   },
          { label: '財產清單',     href: '/assets',         icon: Archive  },
          { label: '房間登錄',     href: '/rooms',          icon: DoorOpen },
        ],
        more: [
          {
            items: [
              { label: '設備說明書', href: '/manuals',  icon: BookOpen },
              { label: '緊急維修',   href: '/hardware', icon: Wrench   },
            ],
          },
        ],
      }

    // ── 房務 ────────────────────────────────────
    case 'housekeeping':
      return {
        primary: [
          { label: '房務任務',     href: '/housekeeping',         icon: BedDouble     },
          { label: '工務任務',     href: '/work-orders',          icon: ClipboardList },
          { label: '歷史紀錄(房)', href: '/housekeeping/history', icon: History       },
          { label: '使用指引(房)', href: '/housekeeping/guide',   icon: BookOpen      },
        ],
        more: [
          {
            items: [
              { label: '設備說明書', href: '/manuals',  icon: BookOpen },
              { label: '緊急維修',   href: '/hardware', icon: Wrench   },
            ],
          },
        ],
      }

    // ── 大夜班 ──────────────────────────────────
    case 'frontdesk_night':
    case 'nightshift':
      return {
        primary: [
          { label: '大夜工作表', href: '/nightshift',       icon: Moon          },
          { label: '使用指引(夜)', href: '/nightshift/guide', icon: BookOpen    },
          { label: '工務任務',   href: '/work-orders',      icon: ClipboardList },
        ],
        more: [
          {
            items: [
              { label: '設備說明書', href: '/manuals',  icon: BookOpen },
              { label: '緊急維修',   href: '/hardware', icon: Wrench   },
            ],
          },
        ],
      }

    // ── 日班櫃台 ────────────────────────────────
    case 'frontdesk_day':
      return {
        primary: [
          { label: '房務任務', href: '/housekeeping',      icon: BedDouble     },
          { label: '房務派工', href: '/housekeeping/plan', icon: ClipboardList },
          { label: '工務任務', href: '/work-orders',       icon: ClipboardList },
          { label: '房間登錄', href: '/rooms',             icon: DoorOpen      },
        ],
        more: [
          {
            items: [
              { label: '歷史紀錄(房)', href: '/housekeeping/history', icon: History  },
              { label: '使用指引(房)', href: '/housekeeping/guide',   icon: BookOpen },
              { label: '設備說明書',   href: '/manuals',              icon: BookOpen },
              { label: '緊急維修',     href: '/hardware',             icon: Wrench   },
            ],
          },
        ],
      }

    // ── 管家主管 ────────────────────────────────
    case 'butler_manager':
    case 'sales':
      return {
        primary: [
          { label: '管家任務', href: '/butler',      icon: Sparkles      },
          { label: '管家派工', href: '/butler/plan', icon: ClipboardList },
          { label: '管家清單', href: '/butler/staff', icon: UserCog      },
          { label: '服務紀錄', href: '/butler/logs', icon: BookOpen      },
        ],
        more: [
          {
            items: [
              { label: '住戶列表',     href: '/butler/residents', icon: Users     },
              { label: '班表',         href: '/butler/schedule',  icon: History   },
              { label: '照片庫',       href: '/butler/photos',    icon: Images    },
              { label: '使用指引(管)', href: '/butler/guide',     icon: BookOpen  },
              { label: '設備說明書',   href: '/manuals',          icon: BookOpen  },
              { label: '緊急維修',     href: '/hardware',         icon: Wrench    },
            ],
          },
        ],
      }

    // ── 管家 ────────────────────────────────────
    case 'butler':
      return {
        primary: [
          { label: '管家任務', href: '/butler',           icon: Sparkles },
          { label: '服務紀錄', href: '/butler/logs',      icon: BookOpen },
          { label: '住戶列表', href: '/butler/residents', icon: Users    },
          { label: '班表',     href: '/butler/schedule',  icon: History  },
        ],
        more: [
          {
            items: [
              { label: '照片庫',       href: '/butler/photos', icon: Images    },
              { label: '使用指引(管)', href: '/butler/guide',  icon: BookOpen  },
              { label: '設備說明書',   href: '/manuals',       icon: BookOpen  },
              { label: '緊急維修',     href: '/hardware',      icon: Wrench    },
            ],
          },
        ],
      }

    // ── 最小 fallback ───────────────────────────
    default:
      return {
        primary: [],
        more: [
          {
            items: [
              { label: '設備說明書', href: '/manuals',  icon: BookOpen },
              { label: '緊急維修',   href: '/hardware', icon: Wrench   },
            ],
          },
        ],
      }
  }
}

// ─── 主元件 ──────────────────────────────────
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

  const { primary: primaryNav, more: moreSections } = role
    ? getNavByRole(role)
    : { primary: [], more: [] }

  const hasMore = moreSections.some(s => s.items.length > 0)

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
            className="absolute bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 pt-4 pb-5 shadow-lg max-h-[70vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {moreSections.map((section, si) => (
              <div key={si} className={si > 0 ? 'mt-4' : ''}>
                {section.label && (
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    {section.label}
                  </p>
                )}
                <div className="grid grid-cols-4 gap-1">
                  {section.items.map(item => {
                    const Icon       = item.icon
                    const isExternal = item.href.startsWith('http')
                    const active     = !isExternal && isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowMore(false)}
                        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors ${
                          active ? 'bg-emerald-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${active ? 'text-emerald-600' : 'text-gray-500'}`} />
                        <span className={`text-[10px] font-medium leading-tight text-center ${
                          active ? 'text-emerald-600' : 'text-gray-600'
                        }`}>
                          {item.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}

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
            const Icon   = item.icon
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
                <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
              </Link>
            )
          })}

          {/* 更多按鈕 */}
          {hasMore && (
            <button
              onClick={() => setShowMore(o => !o)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                showMore ? 'text-emerald-600' : 'text-gray-500'
              }`}
            >
              {showMore ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              <span className="text-[10px] font-medium">更多</span>
            </button>
          )}

          {/* 無更多項目時，登出直接放 Tab Bar */}
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
