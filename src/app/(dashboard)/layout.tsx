import { Suspense } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { RouteLoadingBar } from '@/components/layout/RouteLoadingBar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles').select('role, display_name').eq('id', user.id).single()
  const role = profile?.role ?? ''
  const displayName = profile?.display_name ?? ''

  return (
    <div className="flex h-full">
      <Suspense fallback={null}>
        <RouteLoadingBar />
      </Suspense>
      <Sidebar role={role} displayName={displayName} />
      <main className="flex-1 md:ml-56 overflow-y-auto">
        <div className="p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </div>
      </main>
      <MobileNav role={role} />
    </div>
  )
}
