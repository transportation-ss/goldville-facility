'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, Send, CheckCircle2, DollarSign, Edit2, Trash2 } from 'lucide-react'

interface Props {
  orderId: string
  currentStatus: string
  userRole: string
  technicians: { id: string; display_name: string }[]
  requiresBudget: boolean
  orderData?: {
    description: string
    location: string
    priority: string
    special_notes?: string
    deadline?: string
    assigned_to?: string
  }
}

export function WorkOrderActions({ orderId, currentStatus, userRole, technicians, requiresBudget, orderData }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [showCompleteForm, setShowCompleteForm] = useState(false)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [completeForm, setCompleteForm] = useState({
    completion_notes: '',
    actual_cost: '',
  })

  const [budgetForm, setBudgetForm] = useState({
    estimated_cost: '',
    budget_notes: '',
  })

  const [editForm, setEditForm] = useState({
    description: orderData?.description || '',
    location: orderData?.location || '',
    priority: orderData?.priority || 'normal',
    special_notes: orderData?.special_notes || '',
    deadline: orderData?.deadline || '',
    assigned_to: orderData?.assigned_to || '',
  })

  const isTechOrAbove = ['technician', 'manager', 'admin'].includes(userRole)
  const isManager = ['manager', 'admin'].includes(userRole)
  const isCompleted = currentStatus === 'completed'
  const isCancelled = currentStatus === 'cancelled'

  const sendReply = async () => {
    if (!replyContent.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('work_order_replies').insert({
      work_order_id: orderId,
      replied_by: user?.id,
      role_at_time: userRole,
      content: replyContent.trim(),
    })
    setReplyContent('')
    setLoading(false)
    router.refresh()
  }

  const updateStatus = async (status: string, extraData = {}) => {
    setLoading(true)
    await supabase.from('work_orders').update({
      status,
      ...(status === 'in_progress' ? {} : {}),
      ...extraData,
    }).eq('id', orderId)
    setLoading(false)
    router.refresh()
  }

  const assignToMe = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('work_orders').update({
      assigned_to: user?.id,
      status: 'assigned',
    }).eq('id', orderId)
    setLoading(false)
    router.refresh()
  }

  const submitComplete = async () => {
    setLoading(true)
    await supabase.from('work_orders').update({
      status: 'completed',
      completion_notes: completeForm.completion_notes,
      actual_cost: completeForm.actual_cost ? parseFloat(completeForm.actual_cost) : null,
      completed_at: new Date().toISOString(),
    }).eq('id', orderId)
    setShowCompleteForm(false)
    setLoading(false)
    router.refresh()
  }

  const submitBudget = async () => {
    setLoading(true)
    await supabase.from('work_orders').update({
      requires_budget: true,
      estimated_cost: budgetForm.estimated_cost ? parseFloat(budgetForm.estimated_cost) : null,
      budget_notes: budgetForm.budget_notes,
    }).eq('id', orderId)
    setShowBudgetForm(false)
    setLoading(false)
    router.refresh()
  }

  const submitEdit = async () => {
    setLoading(true)
    await supabase.from('work_orders').update({
      description: editForm.description,
      location: editForm.location,
      priority: editForm.priority,
      special_notes: editForm.special_notes || null,
      deadline: editForm.deadline || null,
      assigned_to: editForm.assigned_to || null,
    }).eq('id', orderId)
    setShowEditForm(false)
    setLoading(false)
    router.refresh()
  }

  const deleteOrder = async () => {
    setLoading(true)
    try {
      // 刪除相關的照片、回覆和工單
      await supabase.from('work_order_replies').delete().eq('work_order_id', orderId)
      await supabase.from('work_order_photos').delete().eq('work_order_id', orderId)
      await supabase.from('work_orders').delete().eq('id', orderId)
      setLoading(false)
      router.push('/work-orders')
    } catch (error) {
      setLoading(false)
      alert('刪除失敗：' + (error instanceof Error ? error.message : '未知錯誤'))
    }
  }

  if (isCompleted || isCancelled) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm text-gray-400 text-center">
          此工單已{isCompleted ? '完成' : '取消'}
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">操作</h2>

      {/* 工務人員操作 */}
      {isTechOrAbove && (
        <div className="flex flex-wrap gap-2">
          {currentStatus === 'pending' && (
            <button
              onClick={assignToMe}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              接單（指派給我）
            </button>
          )}
          {currentStatus === 'assigned' && (
            <button
              onClick={() => updateStatus('in_progress')}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              開始處理
            </button>
          )}
          {['assigned', 'in_progress'].includes(currentStatus) && (
            <>
              <button
                onClick={() => setShowCompleteForm(!showCompleteForm)}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                回報完工
              </button>
              <button
                onClick={() => setShowBudgetForm(!showBudgetForm)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5" />
                需要費用
              </button>
            </>
          )}
          {isManager && (
            <>
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={loading}
                className="px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消工單
              </button>
              <button
                onClick={() => setShowEditForm(!showEditForm)}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                編輯
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                刪除
              </button>
            </>
          )}
        </div>
      )}

      {/* 完工表單 */}
      {showCompleteForm && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-green-800">完工回報</p>
          <textarea
            rows={3}
            value={completeForm.completion_notes}
            onChange={(e) => setCompleteForm(p => ({ ...p, completion_notes: e.target.value }))}
            placeholder="完工說明..."
            className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white resize-none"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">實際費用 NT$</span>
            <input
              type="number"
              value={completeForm.actual_cost}
              onChange={(e) => setCompleteForm(p => ({ ...p, actual_cost: e.target.value }))}
              placeholder="0"
              className="w-28 px-3 py-1.5 border border-green-300 rounded-lg text-sm focus:outline-none bg-white"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCompleteForm(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600">取消</button>
            <button onClick={submitComplete} disabled={loading} className="px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {loading ? '送出中...' : '確認完工'}
            </button>
          </div>
        </div>
      )}

      {/* 費用表單 */}
      {showBudgetForm && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800">費用申請</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">預估費用 NT$</span>
            <input
              type="number"
              value={budgetForm.estimated_cost}
              onChange={(e) => setBudgetForm(p => ({ ...p, estimated_cost: e.target.value }))}
              placeholder="0"
              className="w-28 px-3 py-1.5 border border-amber-300 rounded-lg text-sm focus:outline-none bg-white"
            />
          </div>
          <textarea
            rows={2}
            value={budgetForm.budget_notes}
            onChange={(e) => setBudgetForm(p => ({ ...p, budget_notes: e.target.value }))}
            placeholder="費用說明..."
            className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none bg-white resize-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowBudgetForm(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600">取消</button>
            <button onClick={submitBudget} disabled={loading} className="px-4 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">
              {loading ? '送出中...' : '送出申請'}
            </button>
          </div>
        </div>
      )}

      {/* 編輯表單 */}
      {showEditForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-blue-800">編輯工單</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600">工單描述</label>
              <input
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none bg-white mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">地點</label>
              <input
                type="text"
                value={editForm.location}
                onChange={(e) => setEditForm(p => ({ ...p, location: e.target.value }))}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none bg-white mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">優先級</label>
              <select
                value={editForm.priority}
                onChange={(e) => setEditForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none bg-white mt-1"
              >
                <option value="normal">一般</option>
                <option value="urgent">急件</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">截止日期</label>
              <input
                type="date"
                value={editForm.deadline ? editForm.deadline.split('T')[0] : ''}
                onChange={(e) => setEditForm(p => ({ ...p, deadline: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none bg-white mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">指派人員</label>
              <select
                value={editForm.assigned_to || ''}
                onChange={(e) => setEditForm(p => ({ ...p, assigned_to: e.target.value }))}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none bg-white mt-1"
              >
                <option value="">未指派</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>{tech.display_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600">特殊需求</label>
              <textarea
                rows={2}
                value={editForm.special_notes}
                onChange={(e) => setEditForm(p => ({ ...p, special_notes: e.target.value }))}
                placeholder="特殊需求..."
                className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none bg-white resize-none mt-1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowEditForm(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600">取消</button>
            <button onClick={submitEdit} disabled={loading} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? '保存中...' : '保存編輯'}
            </button>
          </div>
        </div>
      )}

      {/* 刪除確認對話框 */}
      {showDeleteConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-red-800">確認刪除工單</p>
          <p className="text-sm text-red-700">此操作將刪除工單及所有相關資料（照片、留言），無法恢復。</p>
          <div className="flex gap-2">
            <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600">取消</button>
            <button onClick={deleteOrder} disabled={loading} className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {loading ? '刪除中...' : '確認刪除'}
            </button>
          </div>
        </div>
      )}

      {/* 留言框 */}
      <div>
        <p className="text-xs text-gray-500 mb-2">新增留言</p>
        <div className="flex gap-2">
          <textarea
            rows={2}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="輸入留言或補充說明..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
          <button
            onClick={sendReply}
            disabled={loading || !replyContent.trim()}
            className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
