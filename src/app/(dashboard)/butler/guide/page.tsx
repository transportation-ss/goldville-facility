'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, LogIn, Users, ClipboardList, BookOpen,
  History, Images, Sparkles, FileText, Camera,
  KeyRound, Download, ShieldCheck, User,
} from 'lucide-react'
import { Section, Step, Tip } from '@/components/guide/GuideKit'

export default function ButlerGuidePage() {
  const [tab, setTab] = useState<'admin' | 'staff'>('staff')

  return (
    <div className="max-w-xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/butler" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">管家功能說明書</h1>
          <p className="text-sm text-gray-400 mt-0.5">好好園館 管理系統</p>
        </div>
        <a href="/docs/butler-guide.docx" download
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
            tab === 'staff' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <User className="w-4 h-4" /> 一般版
        </button>
      </div>

      {tab === 'admin' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-xs text-blue-700 font-medium">
            適用身分：管理員（admin）、主管（manager）、管家主管（butler_manager）、業務（sales）
          </div>

          <Section icon={LogIn} title="一、登入系統" color="blue">
            <Step n={1}>開啟瀏覽器，輸入系統網址。</Step>
            <Step n={2}>輸入電子郵件帳號與密碼，點選「登入」。</Step>
            <Step n={3}>系統自動導向功能首頁，左側側欄顯示可用功能。</Step>
          </Section>

          <Section icon={Users} title="二、住戶列表管理" color="blue">
            <Step n={1}>點選側欄「<strong>住戶列表</strong>」查看所有住戶。</Step>
            <Step n={2}>點選「新增住戶」，填入姓名、暱稱、房號、入住日期、合約期間後儲存。</Step>
            <Step n={3}>點選住戶卡片可查看詳情、服務紀錄及合約狀態。</Step>
            <Step n={4}>點選住戶卡片右側「照片」按鈕，進入該住戶的個人照片牆。</Step>
          </Section>

          <Section icon={ClipboardList} title="三、管家派工" color="amber">
            <Step n={1}>點選側欄「<strong>管家派工</strong>」進入派工頁面。</Step>
            <Step n={2}>選擇住戶與服務項目，指定執行管家與預計時間。</Step>
            <Step n={3}>點選「確認派工」，管家端即可收到任務通知。</Step>
          </Section>

          <Section icon={BookOpen} title="四、服務紀錄查看" color="teal">
            <Step n={1}>點選側欄「<strong>服務紀錄</strong>」依住戶、日期或管家篩選紀錄。</Step>
            <Step n={2}>點選任一筆紀錄查看詳情，包含文字內容與照片。</Step>
            <Step n={3}>管理版可編輯或刪除紀錄（需有對應權限）。</Step>
          </Section>

          <Section icon={History} title="五、班表管理" color="purple">
            <Step n={1}>點選側欄「<strong>班表管理</strong>」查看並調整管家人員排班。</Step>
            <Step n={2}>設定每日值班管家，確保住戶服務銜接不中斷。</Step>
          </Section>

          <Section icon={Images} title="六、照片庫" color="teal">
            <Step n={1}>點選側欄「<strong>照片庫</strong>」進入照片瀏覽頁。</Step>
            <Step n={2}>「住民照片」分頁：依住民分類，點選住民名稱進入個人照片牆，可依月份篩選。</Step>
            <Step n={3}>「群組活動」分頁：依活動名稱分組，顯示各活動照片集。</Step>
            <Step n={4}>點選照片放大檢視，右上角可下載原圖。</Step>
          </Section>

          <Section icon={KeyRound} title="七、修改密碼" color="gray">
            <Step n={1}>點選側欄底部「<strong>修改密碼</strong>」。</Step>
            <Step n={2}>輸入目前密碼與新密碼（至少 6 個字元），送出後生效。</Step>
          </Section>

          <div className="text-center text-xs text-gray-400 pt-2">如有問題請聯絡主管・好好園館 管理系統</div>
        </div>
      )}

      {tab === 'staff' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-700 font-medium">
            適用身分：管家（butler）
          </div>

          <Section icon={LogIn} title="一、登入系統" color="emerald">
            <Step n={1}>開啟瀏覽器，前往系統網址（可請主管提供）。</Step>
            <Step n={2}>輸入電子郵件與密碼，點擊「登入」。</Step>
            <Step n={3}>登入後底部導覽列點選「<strong>管家任務</strong>」。</Step>
            <Tip>第一次登入請用預設密碼，登入後至「修改密碼」更換。</Tip>
          </Section>

          <Section icon={Sparkles} title="二、今日管家任務" color="emerald">
            <Step n={1}>「管家任務」頁面顯示今日指派給您的服務任務清單。</Step>
            <Step n={2}>點選任務卡片查看住戶需求與備註。</Step>
            <Step n={3}>完成服務後點選「<strong>標記完成</strong>」。</Step>
          </Section>

          <Section icon={FileText} title="三、新增個人服務紀錄" color="teal">
            <Step n={1}>底部導覽列點選「<strong>服務紀錄</strong>」。</Step>
            <Step n={2}>進入住戶列表，點選對應住戶，點選「新增紀錄」。</Step>
            <Step n={3}>選擇記錄類型（日／週／月記錄）及日期範圍，填寫標題。</Step>
            <Step n={4}>在內容區塊中新增文字、小標題或照片。</Step>
            <Step n={5}>完成後點選「<strong>儲存</strong>」。</Step>
          </Section>

          <Section icon={Users} title="四、新增群組活動紀錄" color="blue">
            <Step n={1}>點選「服務紀錄」頁面右上角「新增群組活動」。</Step>
            <Step n={2}>填入活動名稱、日期。</Step>
            <Step n={3}>選擇參與住民與管家人員。</Step>
            <Step n={4}>填寫活動內容，上傳活動照片。</Step>
            <Step n={5}>點選「儲存」完成。</Step>
          </Section>

          <Section icon={Camera} title="五、照片上傳說明" color="teal">
            <Step n={1}>在服務紀錄編輯頁面，點選「<strong>照片</strong>」按鈕。</Step>
            <Step n={2}>可一次選取多張照片批量上傳（建議在 Wi-Fi 環境下操作）。</Step>
            <Step n={3}>照片依「日期-序號」格式命名（例：20260706-01），自動插入紀錄中。</Step>
            <Step n={4}>可在照片下方填寫說明文字。</Step>
            <Tip>上傳的照片會同步出現在住戶個人照片牆，管理版可在照片庫查看。</Tip>
          </Section>

          <Section icon={KeyRound} title="六、修改密碼" color="gray">
            <Step n={1}>底部更多 → 「<strong>修改密碼</strong>」。</Step>
            <Step n={2}>輸入目前密碼與新密碼（至少 6 個字元），送出後生效。</Step>
          </Section>

          <div className="text-center text-xs text-gray-400 pt-2">如有問題請聯絡主管・好好園館 管理系統</div>
        </div>
      )}
    </div>
  )
}
