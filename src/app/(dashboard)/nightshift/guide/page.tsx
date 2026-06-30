import Link from 'next/link'
import {
  ArrowLeft, LogIn, CheckSquare, ClipboardList, FileText,
  Lock, QrCode, KeyRound, AlertTriangle, ChevronRight,
} from 'lucide-react'

function Section({
  icon: Icon,
  title,
  children,
  color = 'emerald',
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
  color?: 'emerald' | 'blue' | 'amber' | 'gray'
}) {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue:    'bg-blue-50 border-blue-200 text-blue-700',
    amber:   'bg-amber-50 border-amber-200 text-amber-700',
    gray:    'bg-gray-50 border-gray-200 text-gray-500',
  }
  const iconColors = {
    emerald: 'text-emerald-600',
    blue:    'text-blue-500',
    amber:   'text-amber-500',
    gray:    'text-gray-400',
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

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <p className="leading-relaxed">{children}</p>
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-amber-800 text-xs">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
      <span>{children}</span>
    </div>
  )
}

export default function NightshiftGuidePage() {
  return (
    <div className="max-w-xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/nightshift" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">大夜班記錄表使用說明</h1>
          <p className="text-sm text-gray-400 mt-0.5">好好園館大平台</p>
        </div>
      </div>

      <div className="space-y-4">

        {/* 1. 登入 */}
        <Section icon={LogIn} title="一、登入系統" color="emerald">
          <Step n={1}>開啟瀏覽器，前往系統網址（可請主管提供）。</Step>
          <Step n={2}>輸入你的 <strong>電子郵件</strong> 與 <strong>密碼</strong>，點擊「登入」。</Step>
          <Step n={3}>登入成功後，左側側欄點選「<strong>大夜工作表</strong>」進入本班記錄頁面。</Step>
          <Tip>第一次登入請用預設密碼，登入後記得到側欄底部「修改密碼」換成自己的密碼。</Tip>
        </Section>

        {/* 2. 簽到 */}
        <Section icon={CheckSquare} title="二、到班簽到" color="blue">
          <Step n={1}>進入大夜工作表後，找到頁面上方的「<strong>到班簽到</strong>」區塊。</Step>
          <Step n={2}>點擊「<strong>我已到班，點此簽到</strong>」按鈕，系統會記錄你的姓名與簽到時間。</Step>
          <Step n={3}>簽到後按鈕會消失，並顯示你的姓名與時間，代表簽到成功。</Step>
          <Tip>一班最多 3 人簽到。若按鈕不見，可能已有 3 人簽到或你已簽過了。</Tip>
        </Section>

        {/* 3. 工作記錄 */}
        <Section icon={ClipboardList} title="三、工作項目記錄" color="emerald">
          <Step n={1}>工作表依照時段排列各項任務，找到對應時段的工作項目。</Step>
          <Step n={2}>完成一項工作後，點擊該項目左側的 <strong>圓圈</strong>，圓圈變成綠色打勾代表已完成，同時記錄你的名字。</Step>
          <Step n={3}>若需在工作項目補充說明，可點擊「新增備註」輸入後儲存。</Step>
          <Tip>點擊「已完成」的項目時，系統會跳出確認視窗，確認後才會取消完成狀態，避免誤觸。</Tip>
        </Section>

        {/* 4. 工務派工 */}
        <Section icon={AlertTriangle} title="四、設備故障通報" color="amber">
          <Step n={1}>若發現設備故障或需要維修，點擊左側側欄「<strong>工務任務</strong>」。</Step>
          <Step n={2}>點擊右上角「<strong>新增通報</strong>」，填寫地點、問題說明後送出。</Step>
          <Step n={3}>送出後工務同仁可以看到，會安排處理時間。</Step>
        </Section>

        {/* 5. 交接說明 */}
        <Section icon={FileText} title="五、填寫交接說明" color="blue">
          <Step n={1}>班次接近尾聲時，找到工作表底部的「<strong>交接說明</strong>」文字框。</Step>
          <Step n={2}>填入本班的重要事項、待處理事務或需要告知下一班的資訊。</Step>
          <Step n={3}>點擊「<strong>儲存</strong>」後，管理員與下一班人員可看到你的留言。</Step>
        </Section>

        {/* 6. 結束班次 */}
        <Section icon={Lock} title="六、結束班次" color="emerald">
          <Step n={1}>工作全部完成、交接說明填好後，點擊頁面底部「<strong>結束班次</strong>」。</Step>
          <Step n={2}>確認送出後，本班記錄將鎖定，不可再修改。</Step>
          <Step n={3}>系統也會在 <strong>早上 07:30</strong> 自動鎖定未結單的班次。</Step>
          <Tip>鎖定後如需修改，請聯絡管理員解鎖。</Tip>
        </Section>

        {/* 7. 修改密碼 */}
        <Section icon={KeyRound} title="七、修改密碼" color="blue">
          <Step n={1}>點擊左側側欄最底部的「<strong>修改密碼</strong>」。</Step>
          <Step n={2}>輸入目前密碼、新密碼（至少 6 個字元）、確認新密碼後送出。</Step>
          <Step n={3}>更新成功後，下次登入即使用新密碼。</Step>
        </Section>

        {/* 8. QR 施工中 */}
        <Section icon={QrCode} title="八、區域巡查 QR Code（施工中）" color="gray">
          <p className="text-gray-500">各樓層/區域的巡查 QR Code 功能目前正在規劃施工中。</p>
          <p className="text-gray-500">未來掃描 QR Code 後將自動記錄巡查時間與人員，敬請期待。</p>
          <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 mt-1">
            <QrCode className="w-4 h-4 shrink-0" />
            <span>QR Code 掃描功能即將上線</span>
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pt-2">
          如有問題請聯絡主管・好好園館大平台
        </div>

      </div>
    </div>
  )
}
