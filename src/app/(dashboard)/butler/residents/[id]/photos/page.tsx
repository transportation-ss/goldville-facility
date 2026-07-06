import { notFound } from 'next/navigation'
import { getResident } from '../../actions'
import { PhotoWall } from './PhotoWall'

export default async function ResidentPhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resident = await getResident(id)
  if (!resident) notFound()

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? ''

  return <PhotoWall resident={resident} cloudName={cloudName} />
}
