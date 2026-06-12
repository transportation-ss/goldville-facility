import { AlertTriangle } from 'lucide-react'

export function Section({
  icon: Icon,
  title,
  children,
  color = 'emerald',
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
  color?: 'emerald' | 'blue' | 'amber' | 'gray' | 'orange' | 'teal' | 'purple'
}) {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue:    'bg-blue-50 border-blue-200 text-blue-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
    gray:    'bg-gray-50 border-gray-200 text-gray-500',
    orange:  'bg-orange-50 border-orange-200 text-orange-700',
    teal:    'bg-teal-50 border-teal-200 text-teal-700',
    purple:  'bg-purple-50 border-purple-200 text-purple-700',
  }
  const iconColors = {
    emerald: 'text-emerald-600',
    blue:    'text-blue-500',
    amber:   'text-amber-500',
    gray:    'text-gray-400',
    orange:  'text-orange-500',
    teal:    'text-teal-500',
    purple:  'text-purple-500',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b ${colors[color]}`}>
        <Icon className={`w-5 h-5 shrink-0 ${iconColors[color]}`} />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="px-5 py-4 text-sm text-gray-700 space-y-2.5">
        {children}
      </div>
    </div>
  )
}

export function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <p className="leading-relaxed">{children}</p>
    </div>
  )
}

export function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-amber-800 text-xs">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
      <span>{children}</span>
    </div>
  )
}
