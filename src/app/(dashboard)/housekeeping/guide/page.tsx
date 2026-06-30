import Link from 'next/link'
import {
  ArrowLeft, LogIn, BedDouble, CheckSquare, BarChart3,
  ClipboardList, Plus, History, KeyRound,
} from 'lucide-react'
import { Section, Step, Tip } from '@/components/guide/GuideKit'

export default function HousekeepingGuidePage() {
  return (
    <div className="max-w-xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/housekeeping" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">房務系統使用說明</h1>
          <p className="text-sm text-gray-400 mt-0.5">好好園館大平台</p>
        </div>
      </div>

      <div className="space-y-4">

        {/* 1. 登入 */}
        <Section icon={LogIn} title="一、登入系統" color="emerald">
          <Step n={1}>開啟瀏覽器，前往系統網址（可請主管提供）。</Step>
          <Step n={2}>輸入你的 <strong>電子郵件</strong> 與 <strong>密碼</strong>，點擊「登入」。</Step>
          <Step n={3}>登入成功後，側欄／底部選單點選「<strong>今日任務</strong>」即可進入今日房務頁面。</Step>
          <Tip>第一次登入請用預設密碼，登入後記得到「修改密碼」換成自己的密碼。</Tip>
        </Section>

        {/* 2. 今日房務 */}
        <Section icon={BedDouble} title="二、查看今日任務" color="blue">
          <Step n={1}>「今日房務」頁面會顯示今天的所有任務，分成三大區塊：<strong>客房</strong>、<strong>公共空間</strong>、<strong>臨時派工</strong>。</Step>
          <Step n={2}>每個區塊標題會顯示完成進度（例：3/10），點擊區塊標題可以<strong>展開／收合</strong>。</Step>
          <Step n={3}>每個區塊內，<strong>尚未完成的任務排在上面</strong>，已完成的任務會自動排到下面並變淡。</Step>
          <Step n={4}>任務上標示「緊急」紅色標籤的，請優先處理。</Step>
          <Tip>頁面上方的進度條會顯示今日整體完成比例，方便掌握進度。</Tip>
        </Section>

        {/* 3. 標記完成 */}
        <Section icon={CheckSquare} title="三、標記完成 / 取消完成" color="emerald">
          <Step n={1}>完成一項任務後，點擊該項目左側的<strong>圓圈</strong>。</Step>
          <Step n={2}>會跳出「標記完成」視窗，可選填<strong>完成備註</strong>（例：補換備品、客人有特殊要求），填完點「確認完成」。</Step>
          <Step n={3}>完成後該項目會顯示<strong>完成人姓名與時間</strong>，方便追蹤。</Step>
          <Step n={4}>若不小心點錯，可再點一次圓圈，系統會跳出確認視窗，確認後才會<strong>移除完成狀態</strong>（連同完成記錄一併清除）。</Step>
          <Tip>移除完成狀態前一定要再次確認，避免誤觸刪除已記錄的完成資訊。</Tip>
        </Section>

        {/* 4. 臨時派工 */}
        <Section icon={Plus} title="四、臨時派工" color="orange">
          <Step n={1}>「臨時派工」區塊顯示當天額外加派的任務，每筆都會標示「<strong>派工時間</strong>」，方便了解任務何時新增。</Step>
          <Step n={2}>操作方式與一般任務相同：點圓圈標記完成、填寫完成備註。</Step>
          <Tip>若臨時派工沒有出現在你的清單上，請聯絡管理員確認指派對象。</Tip>
        </Section>

        {/* 5. 統計卡 */}
        <Section icon={BarChart3} title="五、今日統計" color="teal">
          <Step n={1}>「今日任務」頁面最上方會顯示三張統計卡，分別是<strong>客房、公共空間、臨時任務</strong>的完成數／總數與百分比，一目了然今日整體進度。</Step>
        </Section>

        {/* 6. 歷史紀錄 */}
        <Section icon={History} title="六、歷史紀錄" color="purple">
          <Step n={1}>點擊側欄「<strong>歷史紀錄</strong>」可查詢過去的派工單與完成狀況。</Step>
        </Section>

        {/* 7. 派工管理（主管／工務＋房務權限） */}
        <Section icon={ClipboardList} title="七、派工管理（主管權限）" color="amber">
          <Step n={1}>有派工權限者，點擊「<strong>派工管理</strong>」進入今日派工單編輯頁面。</Step>
          <Step n={2}>尚未建立派工單時，可填寫班別備註後點「建立今日派工單」。</Step>
          <Step n={3}>建立後為<strong>草稿</strong>狀態，此時可點「新增任務」加入客房或公共空間的清潔任務，並可勾選「批次」一次指定多個空間。</Step>
          <Step n={4}>確認任務內容無誤後，點「<strong>發布</strong>」，房務人員即可在「今日房務」看到任務。</Step>
          <Step n={5}>
            <strong>發布後，固定任務不能再新增</strong>，只能點進任務<strong>編輯</strong>（類型、優先度、指定人員、備註），或刪除單一任務。
          </Step>
          <Step n={6}>若有突發需求，請使用「<strong>新增臨時派工</strong>」，填寫任務名稱、類型、空間、指定人員後送出，房務人員的清單會立即顯示並標註派工時間。</Step>
          <Step n={7}>若整天派工單需要全部重來，可點右上角垂圾桶圖示<strong>刪除整日派工單</strong>，此操作無法復原，會跳出確認視窗。</Step>
          <Tip>固定任務發布後不可新增，是為了避免房務人員清單在工作中途被大量更動。若有新需求，一律走「新增臨時派工」。</Tip>
        </Section>

        {/* 8. 修改密碼 */}
        <Section icon={KeyRound} title="八、修改密碼" color="blue">
          <Step n={1}>點擊側欄底部的「<strong>修改密碼</strong>」。</Step>
          <Step n={2}>輸入目前密碼、新密碼（至少 6 個字元）、確認新密碼後送出。</Step>
          <Step n={3}>更新成功後，下次登入即使用新密碼。</Step>
        </Section>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pt-2">
          如有問題請聯絡主管・好好園館大平台
        </div>

      </div>
    </div>
  )
}
