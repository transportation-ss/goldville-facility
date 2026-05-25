import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ManualForm } from '../ManualForm'

export default async function EditManualPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: item } = await supabase
    .from('emergency_manuals')
    .select('*')
    .eq('id', id)
    .single()

  if (!item) notFound()

  return <ManualForm item={item as any} />
}
