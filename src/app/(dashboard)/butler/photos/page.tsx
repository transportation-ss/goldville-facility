import { createClient } from '@/lib/supabase/server'
import { getResidents } from '../residents/actions'
import { PhotoLibrary } from './PhotoLibrary'

const DELETE_ROLES = ['admin', 'manager', 'butler_manager', 'sales']

export default async function PhotoLibraryPage() {
  const supabase   = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let canDelete = false
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles').select('role').eq('id', user.id).single()
    canDelete = DELETE_ROLES.includes(profile?.role ?? '')
  }
  const residents  = await getResidents()
  const cloudName  = process.env.CLOUDINARY_CLOUD_NAME ?? ''
  return <PhotoLibrary residents={residents} cloudName={cloudName} canDelete={canDelete} />
}
