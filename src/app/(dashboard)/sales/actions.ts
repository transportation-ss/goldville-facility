'use server'

import { syncFunnelEntriesToDb } from '@/lib/sales-funnel-sync'
import { revalidatePath } from 'next/cache'

export async function syncSalesFunnelData() {
  const result = await syncFunnelEntriesToDb()
  revalidatePath('/sales')
  revalidatePath('/sales/trend')
  revalidatePath('/sales/funnel')
  return result
}
