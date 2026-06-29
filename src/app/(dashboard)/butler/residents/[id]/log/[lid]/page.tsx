import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2, Calendar, User } from 'lucide-react'
import { getServiceLog, getResident, deleteServiceLog } from '../../../actions'
import { LogViewer } from './LogViewer'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function LogDetailPage({ params }: { params: { id: string; lid: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('user_profiles').select('role').eq('id', user!.id).single()

  const log = await getServiceLog(params.lid)
  if (!log || log.resident_id !== params.id) notFound()

  const canEdit = ['admin', 'manager', 'butler_manager'].includes(profile?.role ?? '') ||
                  log.author_id === user!.id

  return (
    <LogViewer
      log={log}
      residentId={params.id}
      canEdit={canEdit}
    />
  )
}
