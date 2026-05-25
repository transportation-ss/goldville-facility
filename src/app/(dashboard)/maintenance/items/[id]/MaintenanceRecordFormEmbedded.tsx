'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface MaintenanceRecordFormEmbeddedProps {
  itemId: string
  itemName: string
  currentUser: {
    id: string
    name: string
  }
}

export function MaintenanceRecordFormEmbedded({
  itemId,
  itemName,
  currentUser,
}: MaintenanceRecordFormEmbeddedProps) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
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
    setLoading(true)
    try {
      const { data: record } = await supabase
        .from('maintenance_records')
        .insert({
          maintenance_item_id: itemId,
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
          .eq('maintenance_item_id', itemId)
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
              maintenance_item_id: itemId,
              last_completed_date: form.completed_date,
              next_scheduled_date: nextDate.toISOString().split('T')[0],
              next_reminder_date: reminderDate.toISOString().split('T')[0],
            })
        }
      }

      setForm({
        completed_date: new Date().toISOString().split('T')[0],
        executed_by_name: currentUser.name,
        vendor_name: '',
        cost: '',
        tax: '',
        service_fee: '',
        invoice_date: '',
        description: '',
      })
      setLoading(false)
      router.refresh()
    } catch (error) {
      setLoading(false)
      alert('提交失敗：' + (error instanceof Error ? error.message : '未知錯誤'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">保養日期 *</label>
        <input
          type="date"
          value={form.completed_date}
          onChange={(e) => setForm(p => ({ ...p, completed_date: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">執行人</label>
        <input
          type="text"
          value={form.executed_by_name}
          onChange={(e) => setForm(p => ({ ...p, executed_by_name: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">廠商名稱</label>
        <input
          type="text"
          value={form.vendor_name}
          onChange={(e) => setForm(p => ({ ...p, vendor_name: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">費用</label>
          <input
            type="number"
            step="0.01"
            value={form.cost}
            onChange={(e) => setForm(p => ({ ...p, cost: e.target.value }))}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">稅金</label>
          <input
            type="number"
            step="0.01"
            value={form.tax}
            onChange={(e) => setForm(p => ({ ...p, tax: e.target.value }))}
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">手續費</label>
        <input
          type="number"
          step="0.01"
          value={form.service_fee}
          onChange={(e) => setForm(p => ({ ...p, service_fee: e.target.value }))}
          placeholder="0"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">發票日期</label>
        <input
          type="date"
          value={form.invoice_date}
          onChange={(e) => setForm(p => ({ ...p, invoice_date: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">保養描述</label>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="記錄保養細節..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? '提交中...' : '提交保養紀錄'}
      </button>
    </form>
  )
}
