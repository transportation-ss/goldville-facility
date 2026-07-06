'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, LogIn, Moon, FileText, History,
  KeyRound, AlertTriangle, Download, ShieldCheck, User,
} from 'lucide-react'
import { Section, Step, Tip } from '@/components/guide/GuideKit'

export default function NightshiftGuidePage() {
  const [tab, setTab] = useState<'admin' | 'staff'>('staff')

  return (
    <div className="max-w-xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/nightshift" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">大夜班功能說明書</h1>
          <p className="text-sm text-gray-400 mt-0.5">好好園館 管理系統</p>
        </div>
        <a href="/docs/nightshift-guide.docx" download
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors shrink-0">
          <Download className="w-4 h-4" />
          下載
        </a>
      </div>

      {/* Tab 切換 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        <button onClick={() => setTab('admin')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'admin' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <ShieldCheck className="w-4 h-4" /> 管理版
        </button>
        <button onClick={() => setTab('staff')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'staff' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <User className="w-4 h-4" /> 一般版
        </button>
      </div>

      {tab === 'admin' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-700 font-medium">
            適用身分：管理員（admin）、主管（manager）
          </div>

          <Section icon={LogIn} title="一、登入系統" color="blue">
            <Step n={1}>開啟瀏覽器，輸入系統網址。</Step>
            <Step n={2}>輸入電子郵件帳號與密碼，點選「登入」。</Step>
            <Step n={3}>系統自動導向功能首頁，左側側欄顯示可用功能。</Step>
          </Section>

          <Section icon={Moon} title="二、大夜工作表管理" color="purple">
            <Step n={1}>點選側欄「<strong>大夜工作表</strong>」查看所有人員的值班紀錄。</Step>
            <Step n={2}>可依日期查詢歷史紀錄，點選任一筆查看詳情。</Step>
            <Step n={3}>如發現異常或遺漏，可聯繫相關人員補填。</Step>
          </Section>

          <Section icon={History} title="三、查看歷史紀錄" color="purple">
            <Step n={1}>在大夜工作表頁面選擇日期，查看指定日期的值班紀錄。</Step>
            <Step n={2}>紀錄包含：值班事項、設備異常、來電來訪、交接注意事項。</Step>
          </Section>

          <Section icon={KeyRound} title="四、修改密碼" color="gray">
            <Step n={1}>點選側欄底部「<strong>修改密碼</strong>」。</Step>
            <Step n={2}>輸入目前密碼與新密碼（至少 6 個字元），送出後生效。</Step>
          </Section>

          <div className="text-center text-xs text-gray-400 pt-2">如有問題請聯絡主管・好好園館 管理系統</div>
        </div>
      )}

      {tab === 'staff' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-2.5 text-xs text-purple-700 font-medium">
            適用身分：大夜班（frontdesk_night / nightshift）
          </div>

          <Section icon={LogIn} title="一、登入系統" color="blue">
            <Step n={1}>開啟瀏覽器，前往系統網址（可請主管提供）。</Step>
            <Step n={2}>輸入電子郵件與密碼，點擊「登入」。</Step>
            <Step n={3}>登入後底部導覽列點選「<strong>大夜工作表</strong>」。</Step>
            <Tip>建議每次接班後立即開啟系統確認前一班次交接事項。</Tip>
          </Section>

          <Section icon={FileText} title="二、填寫大夜工作表" color="purple">
            <Step n={1}>點選右上角「<strong>新增今日紀錄</strong>」。</Step>
            <Step n={2}>依照欄位填寫值班事項，包含房況、設備異常、來電來訪。</Step>
            <Step n={3}>如有照片，可透過照片欄位上傳。</Step>
            <Step n={4}>填寫完成後點選「<strong>儲存</strong>」。</Step>
            <Tip>值班期間如有重要事件，請即時填寫，避免遺漏。</Tip>
          </Section>

          <Section icon={History} title="三、查看歷史紀錄" color="purple">
            <Step n={1}>在大夜工作表頁面選擇日期查詢。</Step>
            <Step n={2}>可查看自己或其他班次的值班紀錄作為參考。</Step>
          </Section>

          <Section icon={AlertTriangle} title="四、緊急狀況處理" color="orange">
            <Step n={1}>底部更多 → 「<strong>緊急維修</strong>」查閱緊急維修處理流程。</Step>
            <Step n={2}>底部更多 → 「<strong>設備說明書</strong>」查看各設備操作說明。</Step>
            <Tip>遇到無法處理的緊急狀況，請立即聯繫值班主管。</Tip>
          </Section>

          <Section icon={KeyRound} title="五、修改密碼" color="gray">
            <Step n={1}>點選更多 → 「<strong>修改密碼</strong>」。</Step>
            <Step n={2}>輸入目前密碼與新密碼（至少 6 個字元），送出後生效。</Step>
          </Section>

          <div className="text-center text-xs text-gray-400 pt-2">如有問題請聯絡主管・好好園館 管理系統</div>
        </div>
      )}
    </div>
  )
}
