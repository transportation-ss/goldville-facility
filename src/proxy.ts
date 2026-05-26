import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─── 身分群組 ──────────────────────────────────
const ADMIN_ROLES      = ['admin', 'manager']
const NIGHTSHIFT_ROLES = ['frontdesk_night']
const TECHNICIAN_ROLES = ['technician']
const GENERAL_ROLES    = ['frontdesk_day', 'housekeeper', 'admin_staff', 'sales']

// ─── 各身分允許的路徑前綴 ────────────────────
const NIGHTSHIFT_ALLOWED = ['/nightshift', '/work-orders', '/manuals', '/hardware', '/api']
const TECHNICIAN_ALLOWED = ['/work-orders', '/maintenance', '/consumables', '/utilities', '/manuals', '/hardware', '/rooms', '/api']
const GENERAL_ALLOWED    = ['/work-orders', '/manuals', '/hardware', '/rooms', '/api']

// 禁止存取的子路徑（所有非 admin 均不可）
const ADMIN_ONLY_PATHS   = ['/admin', '/maintenance/admin', '/hardware/admin', '/assets']

export async function proxy(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // 未登入 → 導向登入頁
  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/register') && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 已登入 → 從 /login 導向 dashboard
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 路由保護（依身分限制可存取頁面）
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles').select('role').eq('id', user.id).single()
    const role = profile?.role ?? ''

    // 管理員不限制
    if (ADMIN_ROLES.includes(role)) return supabaseResponse

    // 非管理員都不能進 admin-only 路徑
    if (ADMIN_ONLY_PATHS.some(p => pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // 大夜班
    if (NIGHTSHIFT_ROLES.includes(role)) {
      const allowed = NIGHTSHIFT_ALLOWED.some(p => pathname.startsWith(p))
      const forbidden = pathname.startsWith('/hardware/admin')
      if (!allowed || forbidden) return NextResponse.redirect(new URL('/nightshift', request.url))
    }

    // 工務
    if (TECHNICIAN_ROLES.includes(role)) {
      const allowed = TECHNICIAN_ALLOWED.some(p => pathname.startsWith(p))
      const forbidden = pathname.startsWith('/hardware/admin') || pathname.startsWith('/maintenance/admin')
      if (!allowed || forbidden) return NextResponse.redirect(new URL('/work-orders', request.url))
    }

    // 一般身分
    if (GENERAL_ROLES.includes(role)) {
      const allowed = GENERAL_ALLOWED.some(p => pathname.startsWith(p))
      const forbidden = pathname.startsWith('/hardware/admin')
      if (!allowed || forbidden) return NextResponse.redirect(new URL('/work-orders', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
