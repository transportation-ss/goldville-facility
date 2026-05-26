import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 大夜班身分允許存取的路徑前綴
const NIGHTSHIFT_ROLES = ['nightshift', 'frontdesk_night', 'frontdesk_day']
const NIGHTSHIFT_ALLOWED_PATHS = [
  '/nightshift',
  '/work-orders',
  '/manuals',
  '/hardware',   // 緊急維修說明書（唯讀）
  '/api',
]

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

  // 大夜班路由保護：只允許存取指定路徑
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role ?? ''

    if (NIGHTSHIFT_ROLES.includes(role)) {
      const allowed = NIGHTSHIFT_ALLOWED_PATHS.some(p => pathname.startsWith(p))
      // 硬體設備管理頁面不給大夜存取（/hardware/admin）
      const forbidden = pathname.startsWith('/hardware/admin')
      if (!allowed || forbidden) {
        return NextResponse.redirect(new URL('/nightshift', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
