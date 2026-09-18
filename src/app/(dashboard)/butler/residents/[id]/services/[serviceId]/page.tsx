import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getResidentService, getServiceItems, getServiceItemTitleSuggestions, getButlerOptions } from '../../../actions'
import { createClient } from '@/lib/supabase/server'
import { ServiceItemsView } from './ServiceItemsView'

export const dynamic = 'force-dynamic'

export default async function ServiceItemsPage({
  params,
}: {
  params: Promise<{ id: string; serviceId: string }>
}) {
  const { id, serviceId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  if (['frontdesk_day', 'frontdesk_night'].includes(profile?.role ?? '')) {
    redirect('/butler/residents')
  }
  const canManage = ['admin', 'manager', 'butler_manager'].includes(profile?.role ?? '')

  const [service, items, titleSuggestions, butlerOptions] = await Promise.all([
    getResidentService(serviceId),
    getServiceItems(serviceId),
    getServiceItemTitleSuggestions(),
    getButlerOptions(),
  ])
  if (!service || service.resident_id !== id) notFound()

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link href={`/butler/residents/${id}`} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
        <ArrowLeft className="w-4 h-4" /> {service.resident?.name}
      </Link>
      <h1 className="text-lg font-bold text-gray-900">
        {service.service_catalog?.name}
      </h1>
      <p className="text-xs text-gray-400 mb-4">
        {service.resident?.name}{service.resident?.room ? `（${service.resident.room}）` : ''} · 服務細項規劃
      </p>

      <ServiceItemsView
        residentId={id}
        residentServiceId={serviceId}
        catalogName={service.service_catalog?.name ?? ''}
        items={items}
        titleSuggestions={titleSuggestions}
        butlerOptions={butlerOptions}
        canManage={canManage}
      />
    </div>
  )
}
