import { BookOpen } from 'lucide-react'

export default function ManualsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <BookOpen className="w-16 h-16 text-gray-200 mb-6" />
      <h1 className="text-4xl font-bold text-gray-300">施工中</h1>
      <p className="text-gray-400 mt-2 text-sm">使用說明書功能即將推出</p>
    </div>
  )
}
