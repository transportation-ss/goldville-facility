import { getResidents } from '../residents/actions'
import { PhotoLibrary } from './PhotoLibrary'

export default async function PhotoLibraryPage() {
  const residents  = await getResidents()
  const cloudName  = process.env.CLOUDINARY_CLOUD_NAME ?? ''
  return <PhotoLibrary residents={residents} cloudName={cloudName} />
}
