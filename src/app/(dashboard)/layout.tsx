import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 md:ml-56 overflow-y-auto">
        <div className="p-4 md:p-6 pb-24 md:pb-6">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
