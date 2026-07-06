'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, LogIn, BedDouble, CheckSquare, ClipboardList,
  Plus, History, KeyRound, BarChart3, Download, ShieldCheck, User,
} from 'lucide-react'
import { Section, Step, Tip } from '@/components/guide/GuideKit'

export default function HousekeepingGuidePage() {
  const [tab, setTab] = useState<'admin' | 'staff'>('staff')

  return (
    <div className="max-w-xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Link href="/housekeeping" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">房務功能說明書</h1>
          <p className="text-sm text-gray-400 mt-0.5">好好園館 管理系統</p>
        </div>
        <a href="/docs/housekeeping-guide.docx" download
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
            適用身分：管理員（admin）、主管（manager）、日班櫃台（frontdesk_day）
          </div>

          <Section icon={LogIn} title="一、登入系統" color="blue">
            <Step n={1}>開啟瀏覽器，輸入系統網址。</Step>
            <Step n={2}>輸入電子郵件帳號與密碼，點選「登入」。</Step>
            <Step n={3}>系統自動導向功能首頁，左側側欄顯示可用功能。</Step>
            <Tip>如忘記密碼，請聯繫系統管理員重設。</Tip>
          </Section>

          <Section icon={BarChart3} title="二、今日任務總覽" color="blue">
            <Step n={1}>點選側欄「<strong>房務任務</strong>」進入今日任務頁面。</Step>
            <Step n={2}>頁面頂部顯示三張統計卡：<strong>客房、公共空間、臨時派工</strong>各自的完成數與百分比。</Step>
            <Step n={3}>任務依「任務類型 → 樓層 → 房號」順序排列，已完成項目沉至底部。</Step>
          </Section>

          <Section icon={ClipboardList} title="三、房務派工" color="amber">
            <Step n={1}>點選側欄「<strong>房務派工</strong>」進入派工管理頁面。</Step>
            <Step n={2}>點選「新增任務」，選擇房間、任務類型、日期，視需要勾選「緊急」。</Step>
            <Step n={3}>如需批量派工，點選「批量新增」，勾選多個房間後統一設定類型與日期。</Step>
            <Step n={4}>確認後點「發布」，房務人員端即可看到任務。</Step>
            <Tip>發布後固定任務不可再新增，突發需求請使用「新增臨時派工」。</Tip>
          </Section>

          <Section icon={Plus} title="四、新增臨時派工" color="orange">
            <Step n={1}>在派工管理頁面點選「新增臨時派工」。</Step>
            <Step n={2}>填寫任務名稱、類型、空間、指定人員。</Step>
            <Step n={3}>送出後，房務人員清單立即顯示並標註派工時間。</Step>
          </Section>

          <Section icon={History} title="五、歷史紀錄" color="purple">
            <Step n={1}>點選側欄「<strong>歷史紀錄(房)</strong>」查詢過去任務紀錄。</Step>
            <Step n={2}>可依日期範圍篩選，查看任務類型、執行人員、完成時間及備註。</Step>
          </Section>

          <Section icon={KeyRound} title="六、修改密碼" color="gray">
            <Step n={1}>點選側欄底部「<strong>修改密碼</strong>」。</Step>
            <Step n={2}>輸入目前密碼與新密碼（至少 6 個字元），送出後生效。</Step>
          </Section>

          <div className="text-center text-xs text-gray-400 pt-2">如有問題請聯絡主管・好好園館 管理系統</div>
        </div>
      )}

      {tab === 'staff' && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-700 font-medium">
            適用身分：房務主管（housekeeping）、工務房務（tech_housekeeping）
          </div>

          <Section icon={LogIn} title="一、登入系統" color="emerald">
            <Step n={1}>開啟瀏覽器，前往系統網址（可請主管提供）。</Step>
            <Step n={2}>輸入電子郵件與密碼，點擊「登入」。</Step>
            <Step n={3}>登入後底部導覽列點選「<strong>房務任務</strong>」進入今日任務頁面。</Step>
            <Tip>第一次登入請用預設密碼，登入後至「修改密碼」更換。</Tip>
          </Section>

          <Section icon={BedDouble} title="二、查看今日任務" color="blue">
            <Step n={1}>頁面顯示今日所有任務，分成<strong>客房、公共空間、臨時派工</strong>三區塊。</Step>
            <Step n={2}>任務依類型→樓層→房號排列，標示「緊急」的請優先處理。</Step>
            <Step n={3}>頁面頂部統計卡顯示各區塊完成進度。</Step>
          </Section>

          <Section icon={CheckSquare} title="三、標記完成 / 取消完成" color="emerald">
            <Step n={1}>完成任務後，點擊任務左側的<strong>圓圈</strong>。</Step>
            <Step n={2}>跳出視窗可選填完成備註，填完點「確認完成」。</Step>
            <Step n={3}>完成後顯示完成人姓名與時間，任務移至底部。</Step>
            <Step n={4}>若誤點，再點一次圓圈，確認後移除完成狀態（紀錄一併清除）。</Step>
            <Tip>移除完成狀態前請再次確認，避免誤刪已記錄的資訊。</Tip>
          </Section>

          <Section icon={Plus} title="四、臨時派工" color="orange">
            <Step n={1}>「臨時派工」區塊顯示當天額外加派的任務，標示派工時間。</Step>
            <Step n={2}>操作方式與一般任務相同：點圓圈標記完成、填寫備註。</Step>
            <Tip>若清單上未出現應有的任務，請聯絡管理員確認。</Tip>
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
