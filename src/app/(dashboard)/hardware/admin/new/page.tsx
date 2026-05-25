import { ManualForm } from '../ManualForm'

export default async function NewManualPage({
  searchParams,
}: {
  searchParams: Promise<{ floor?: string; loc?: string; eq?: string }>
}) {
  const { floor, loc, eq } = await searchParams
  return (
    <ManualForm
      defaultFloor={floor}
      defaultLoc={loc}
      defaultEq={eq}
    />
  )
}
