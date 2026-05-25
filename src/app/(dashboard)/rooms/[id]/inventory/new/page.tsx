import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { InventoryForm } from './InventoryForm'
import type { RoomInventory } from '@/lib/types'

export default async function NewInventoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: room } = await supabase
    .from('rooms')
    .select('id, name, floor')
    .eq('id', id)
    .single()

  if (!room) notFound()

  // 取最新一筆盤點（用於預填）
  const { data: latest } = await supabase
    .from('room_inventory')
    .select('*')
    .eq('room_id', id)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const hasInitial = !!(await supabase
    .from('room_inventory')
    .select('id')
    .eq('room_id', id)
    .eq('is_initial', true)
    .maybeSingle()
  ).data

  return (
    <InventoryForm
      roomId={id}
      roomName={room.name}
      roomFloor={room.floor ?? ''}
      isInitialMode={!hasInitial}
      prefill={latest as RoomInventory | null}
    />
  )
}
