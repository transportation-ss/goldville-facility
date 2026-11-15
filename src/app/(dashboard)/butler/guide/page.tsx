'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, LogIn, Users, ClipboardList, BookOpen,
  History, Images, Sparkles, FileText, Brush, CalendarDays,
  KeyRound, Download, ShieldCheck, User,
} from 'lucide-react'
import { Section, Step, Tip } from '@/components/guide/GuideKit'

// ── 一般版（管家）：圖示教學 V1.0，內容來自「管家平台操作手冊_圖示版」 ──
type Color = 'emerald' | 'blue' | 'amber' | 'gray' | 'orange' | 'teal' | 'purple'
type GuideStep = { text: React.ReactNode; img?: string }
type Chapter = {
  icon: React.ElementType
  title: string
  color: Color
  steps: GuideStep[]
  tip?: string
  extra?: React.ReactNode
}

const IMG_BASE = '/docs/butler-guide'

const STAFF_CHAPTERS: Chapter[] = [
  {
    icon: Sparkles, title: '一、今日任務：查看與完成', color: 'emerald',
    steps: [
      { text: <>進入「<strong>管家任務</strong>」，確認待完成項目、服務時間與負責人。</>, img: 'image1.jpg' },
      { text: <>點選任務左側圓圈，進入「完成確認」，可填寫備註並視需要附上照片。</>, img: 'image2.jpg' },
      { text: <>儲存後，確認任務移至「已完成」，完成率同步更新。</>, img: 'image3.jpg' },
    ],
    tip: '若需更正，依畫面提示點選已完成任務取消；備註應記錄實際觀察，避免未經確認的判斷。',
  },
  {
    icon: BookOpen, title: '二、管家交接本：新增與查閱', color: 'teal',
    steps: [
      { text: <>點選底部「<strong>管家交接本</strong>」，可透過月曆查看當日交接。</>, img: 'image4.jpg' },
      { text: <>選擇日期，往下查看交接卡片；可看到標題、內文及關聯住民。</>, img: 'image5.jpg' },
      {
        text: <>在「今天值得一提」輸入標題、內容；需要時填寫關聯住民，再按「<strong>加入管家交接本</strong>」。
          在標題或留言中提到某個「人名」或「房號」，系統會在連結住戶上方跳出提示，要不要連結到住戶，點選連結即可。</>,
        img: 'image4.jpg',
      },
    ],
    tip: '交接內容建議寫清楚「發生什麼事、已做什麼、下一班需注意什麼」。',
  },
  {
    icon: FileText, title: '三、服務紀錄：個人服務', color: 'teal',
    steps: [
      { text: <>進入「服務紀錄」，點選右上「<strong>新增紀錄</strong>」。</>, img: 'image6.jpg' },
      { text: <>選擇「個人紀錄」。</>, img: 'image7.jpg' },
      { text: <>搜尋姓名或房號，選擇正確住民。</>, img: 'image8.jpg' },
      { text: <>選擇日／週／月／自訂區間，填寫服務摘要；依需要新增用藥、清潔、陪伴、運動或活動模組，完成後儲存。</>, img: 'image9.jpg' },
    ],
    tip: '請先核對住民與日期；同時記錄其他住民時，須確認內容確實相同。',
  },
  {
    icon: Users, title: '四、服務紀錄：多人活動', color: 'blue',
    steps: [
      { text: <>點選「新增紀錄」後選擇「<strong>多人活動</strong>」。</>, img: 'image7.jpg' },
      { text: <>填入活動日期、標題，新增參與住民與管家，記錄活動摘要後儲存。</>, img: 'image10.jpg' },
    ],
    tip: '參與名單應以實際出席為準；照片與文字紀錄依園館內部規範使用。',
  },
  {
    icon: Brush, title: '五、清潔值班', color: 'orange',
    steps: [
      { text: <>點選底部「<strong>清潔值班</strong>」，查看本週各日清潔安排與上午、下午人員。</>, img: 'image11.jpg' },
    ],
    tip: '畫面有「同步住戶清單」「產生本週未排的值班」「產生本週清潔任務」等功能；批次產生前，先確認是否已有安排，避免重複。',
  },
  {
    icon: ClipboardList, title: '六、住戶列表與住民服務資訊', color: 'blue',
    steps: [
      { text: <>進入「<strong>住戶列表</strong>」，可依入住狀態篩選住民。</>, img: 'image12.jpg' },
      { text: <>點選住民卡片，查看受服務列表、相關交接與服務安排。</>, img: 'image13.jpg' },
      { text: <>往下查看歷史服務紀錄。</>, img: 'image14.jpg' },
    ],
    tip: '住民資料僅供工作必要使用，不應轉傳到非工作用途的群組或個人帳號。',
  },
  {
    icon: CalendarDays, title: '七、活動月曆', color: 'purple',
    steps: [
      { text: <>點選畫面下方「<strong>更多</strong>」，在功能選單中選擇「活動月曆」。</>, img: 'image15.jpg' },
      { text: <>進入「活動月曆」後，可切換月份，查看每日活動名稱及時間；需要紙本時，可點選「匯出 PDF」。</>, img: 'image16.jpg' },
    ],
    tip: '活動月曆為「僅檢視」，如需異動請依園館現行活動安排流程辦理。',
    extra: (
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-3 space-y-1.5 text-xs text-gray-600">
        <p className="font-semibold text-gray-700">臨時活動紀錄說明</p>
        <p>若有臨時安排或未列入活動月曆的活動，可至「服務紀錄」→「新增紀錄」，依實際參與情形選擇「多人活動」或「個人紀錄」。</p>
        <p><strong>多人活動</strong>：適用於多位住民共同參與的活動。填寫活動日期、名稱、參與住民與管家、活動摘要，並視需要新增照片。</p>
        <p><strong>個人紀錄</strong>：適用於單一住民的個別活動或服務。先選擇住民，再填寫日期、服務內容與相關紀錄，並視需要新增照片。</p>
        <p className="text-gray-400">活動月曆用於查看既定活動安排；臨時活動則可透過服務紀錄留存實際執行情形，方便後續查閱與交接。</p>
      </div>
    ),
  },
  {
    icon: Images, title: '八、回診表單與照片庫', color: 'teal',
    steps: [
      { text: <>在「更多」開啟「<strong>回診表單</strong>」，以月曆查看回診進度與狀態。</>, img: 'image17.jpg' },
      { text: <>進入「<strong>照片庫</strong>」，可選擇住民照片或群組活動。</>, img: 'image18.jpg' },
      { text: <>選擇住民後，可依月份瀏覽照片。</>, img: 'image19.jpg' },
    ],
    tip: '回診申請需通知主管於 LINE 群組登記；照片瀏覽及分享須遵守住民隱私與授權規範。',
  },
]

function Shot({ file }: { file: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${IMG_BASE}/${file}`}
      alt="操作畫面"
      loading="lazy"
      className="mx-auto w-full max-w-[240px] rounded-xl border border-gray-200"
    />
  )
}

function StaffGuide() {
  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-700 font-medium">
        適用身分：管家（butler）・圖示教學版 V1.0（2026 年 11 月）
      </div>

      {STAFF_CHAPTERS.map(ch => (
        <Section key={ch.title} icon={ch.icon} title={ch.title} color={ch.color}>
          {ch.steps.map((s, i) => (
            <div key={i} className="space-y-2">
              <Step n={i + 1}>{s.text}</Step>
              {s.img && <Shot file={s.img} />}
            </div>
          ))}
          {ch.extra}
          {ch.tip && <Tip>{ch.tip}</Tip>}
        </Section>
      ))}

      <Section icon={KeyRound} title="九、登入與修改密碼" color="gray">
        <Step n={1}>開啟瀏覽器，前往系統網址（可請主管提供），輸入電子郵件與密碼後點擊「登入」。</Step>
        <Step n={2}>更換密碼：底部「更多」→「<strong>修改密碼</strong>」，輸入目前密碼與新密碼（至少 6 個字元），送出後生效。</Step>
        <Tip>第一次登入請用預設密碼，登入後請立即更換。</Tip>
      </Section>

      <div className="text-center text-xs text-gray-400 pt-2">如有問題請聯絡主管・好好園館 管理系統</div>
    </div>
  )
}

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

      {tab === 'staff' && <StaffGuide />}
    </div>
  )
}
