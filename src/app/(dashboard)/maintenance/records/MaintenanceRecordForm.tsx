'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface Item {
  id: string
  name: string
}

interface MaintenanceRecordFormProps {
  items: Item[]
  currentUser: {
    id: string
    name: string
  }
  defaultItemId?: string
}

export function MaintenanceRecordForm({ items, currentUser, defaultItemId }: MaintenanceRecordFormProps) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    maintenance_item_id: defaultItemId || '',
    completed_date: new Date().toISOString().split('T')[0],
    executed_by_name: currentUser.name,
    vendor_name: '',
    cost: '',
    tax: '',
    service_fee: '',
    invoice_date: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.maintenance_item_id) {
      alert('請選擇保養項目')
      return
    }

    setLoading(true)
    try {
      const { data: record } = await supabase
        .from('maintenance_records')
        .insert({
          maintenance_item_id: form.maintenance_item_id,
          completed_date: form.completed_date,
          executed_by: currentUser.id,
          executed_by_name: form.executed_by_name,
          vendor_name: form.vendor_name || null,
          cost: form.cost ? parseFloat(form.cost) : null,
          tax: form.tax ? parseFloat(form.tax) : null,
          service_fee: form.service_fee ? parseFloat(form.service_fee) : null,
          invoice_date: form.invoice_date || null,
          description: form.description || null,
        })
        .select()
        .single()

      if (record) {
        const nextDate = new Date(form.completed_date)
        nextDate.setMonth(nextDate.getMonth() + 1)
        const reminderDate = new Date(nextDate)
        reminderDate.setDate(reminderDate.getDate() - 14)

        const { data: schedule } = await supabase
          .from('maintenance_schedule')
          .select()
          .eq('maintenance_item_id', form.maintenance_item_id)
          .single()

        if (schedule) {
          await supabase
            .from('maintenance_schedule')
            .update({
              last_completed_date: form.completed_date,
              next_scheduled_date: nextDate.toISOString().split('T')[0],
              next_reminder_date: reminderDate.toISOString().split('T')[0],
            })
            .eq('id', schedule.id)
        } else {
          await supabase
            .from('maintenance_schedule')
            .insert({
              maintenance_item_id: form.maintenance_item_id,
              last_completed_date: form.completed_date,
              next_scheduled_date: nextDate.toISOString().split('T')[0],
              next_reminder_date: reminderDate.toISOString().split('T')[0],
            })
        }
      }

      setLoading(false)
      router.push('/maintenance')
    } catch (error) {
      setLoading(false)
      alert('提交失敗')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">保養項目 *</label>
        <select
          value={form.maintenance_item_id}
          onChange={(e) => setForm(p => ({ ...p, maintenance_item_id: e.target.value }))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">選擇保養項目</option>
          {items.map(item => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">保養日期 *</label>
          <input
            type="date"
            value={form.completed_date}
            onChange={(e) => setForm(p => ({ ...p, completed_date: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">執行人</label>
          <input
            type="text"
            value={form.executed_by_name}
            onChange={(e) => setForm(p => ({ ...p, executed_by_name: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">廠商名稱</label>
          <input
            type="text"
            value={form.vendor_name}
            onChange={(e) => setForm(p => ({ ...p, vendor_name: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">發票日期</label>
          <input
            type="date"
            value={form.invoice_date}
            onChange={(e) => setForm(p => ({ ...p, invoice_date: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">費用</label>
          <input
            type="number"
            step="0.01"
            value={form.cost}
            onChange={(e) => setForm(p => ({ ...p, cost: e.target.value }))}
            placeholder="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">稅金</label>
          <input
            type="number"
            step="0.01"
            value={form.tax}
            onChange={(e) => setForm(p => ({ ...p, tax: e.target.value }))}
            placeholder="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">手續費</label>
          <input
            type="number"
            step="0.01"
            value={form.service_fee}
            onChange={(e) => setForm(p => ({ ...p, service_fee: e.target.value }))}
            placeholder="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">保養描述</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="記錄保養細節..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? '提交中...' : '提交保養紀錄'}
        </button>
      </div>
    </form>
  )
}
