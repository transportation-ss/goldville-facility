'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface ConsumableTransactionFormProps {
  consumableId: string
  currentUser: {
    id: string
    display_name: string
    role: string
  } | null
}

export function ConsumableTransactionForm({ consumableId, currentUser }: ConsumableTransactionFormProps) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: 'in' as 'in' | 'out' | 'adjust',
    quantity: '',
    reason: '',
    vendor: 'online' as 'online' | 'onsite' | 'other',
    price: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.quantity) {
      alert('請輸入數量')
      return
    }

    setLoading(true)
    try {
      const quantity = parseInt(form.quantity, 10)

      // 插入交易紀錄
      const txData: any = {
        consumable_id: consumableId,
        type: form.type,
        quantity: quantity,
        created_by: currentUser?.id,
      }

      // 進貨時記錄廠商和價格
      if (form.type === 'in') {
        txData.vendor = form.vendor
        if (form.price) {
          txData.price = parseFloat(form.price)
        }
      }

      // 出貨時記錄原因
      if (form.type === 'out') {
        txData.reason = form.reason || null
      }

      const { error: txError } = await supabase
        .from('consumable_transactions')
        .insert(txData)

      if (txError) throw txError

      // 更新耗材庫存
      const { data: consumable, error: selectError } = await supabase
        .from('consumables')
        .select('current_quantity')
        .eq('id', consumableId)
        .single()

      if (selectError) throw selectError

      if (consumable) {
        const currentQty = consumable.current_quantity
        let newQty = currentQty

        if (form.type === 'in') {
          newQty = currentQty + quantity
        } else if (form.type === 'out') {
          newQty = Math.max(0, currentQty - quantity)
        } else {
          newQty = quantity
        }

        const { error: updateError } = await supabase
          .from('consumables')
          .update({ current_quantity: newQty })
          .eq('id', consumableId)

        if (updateError) throw updateError
      }

      // 重置表單
      setForm({
        type: 'in',
        quantity: '',
        reason: '',
        vendor: 'online',
        price: '',
      })
      setLoading(false)
      router.refresh()
    } catch (error) {
      setLoading(false)
      const errorMsg = error instanceof Error ? error.message : '未知錯誤'
      console.error('提交錯誤：', error)
      alert('提交失敗：' + errorMsg)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">記錄進出</h2>

      <div className="space-y-4">
        {/* Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">交易類型 *</label>
          <div className="flex gap-3">
            {[
              { value: 'in', label: '進貨' },
              { value: 'out', label: '領出' },
              { value: 'adjust', label: '調整' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={opt.value}
                  checked={form.type === opt.value}
                  onChange={(e) => setForm(p => ({ ...p, type: e.target.value as any }))}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">數量 *</label>
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))}
            placeholder="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Vendor and Price for Incoming */}
        {form.type === 'in' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">廠商</label>
              <select
                value={form.vendor}
                onChange={(e) => setForm(p => ({ ...p, vendor: e.target.value as any }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="online">線上購物</option>
                <option value="onsite">現場採買</option>
                <option value="other">其他</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">進貨價格</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </>
        )}

        {/* Reason for Outgoing */}
        {form.type === 'out' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">領出原因</label>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="工務派工編號、維修項目等"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? '記錄中...' : '記錄異動'}
      </button>
    </form>
  )
}
