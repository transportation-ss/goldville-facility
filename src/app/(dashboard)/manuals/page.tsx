import {
  BookOpen, ClipboardList, CalendarCheck, Package, Droplets,
  DoorOpen, Wrench, KeyRound,
} from 'lucide-react'
import { Section, Step, Tip } from '@/components/guide/GuideKit'

export default function ManualsPage() {
  return (
    <div className="max-w-xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gray-100">
          <BookOpen className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">工務系統使用說明</h1>
          <p className="text-sm text-gray-400 mt-0.5">好好園館大平台</p>
        </div>
      </div>

      <div className="space-y-4">

        {/* 1. 工務任務 */}
        <Section icon={ClipboardList} title="一、工務任務（派工單）" color="emerald">
          <Step n={1}>側欄點選「<strong>工務任務</strong>」可看到所有工單列表，依狀態分頁：<strong>全部、待處理、已指派、處理中、已完成</strong>。</Step>
          <Step n={2}>每張工單會顯示通報人／單位、地點、優先程度（<strong>急件</strong>會以紅色標示）與目前狀態。</Step>
          <Step n={3}>點擊右上角「<strong>新增通報</strong>」可建立新工單，填寫：
            <br />・需求程度（普通件／急件）
            <br />・通報人姓名、通報單位（房務部、產品部、大廈、餐廳等）
            <br />・工務需求地點（例：園館607、健身房外公廁）
            <br />・發生狀況說明（必填）
            <br />・特殊需求說明（選填）
            <br />・現場照片（最多 5 張）
          </Step>
          <Step n={4}>點進工單詳情頁，可查看通報資訊、處理進度、現場照片與溝通記錄。負責處理的工務人員可在此填寫處理人、截止日期、費用、完工備註，並上傳完工照片。</Step>
          <Tip>急件請務必填寫清楚地點與狀況說明，方便工務人員快速判斷優先順序。</Tip>
        </Section>

        {/* 2. 保養提醒 */}
        <Section icon={CalendarCheck} title="二、保養提醒" color="blue">
          <Step n={1}>側欄點選「<strong>保養提醒</strong>」，可看到所有保養項目卡片，標示分類（設備／設施／車輛／景觀／法規申報／其他）與保養頻率（每週／每月／每季／半年／每年）。</Step>
          <Step n={2}>每張卡片顯示<strong>上次保養日期</strong>與<strong>下次保養日期</strong>，逾期項目會以紅色標示剩餘天數，並列在頁面上方「待保養」警示框。</Step>
          <Step n={3}>完成保養後，點「<strong>新增保養紀錄</strong>」，選擇保養項目，填寫保養日期、執行人、廠商（選填）、費用／稅金／手續費，以及保養內容說明後送出。</Step>
          <Tip>「待保養」警示框會列出所有今日已逾期的項目，建議優先處理，完成後系統會自動更新下次保養日期。</Tip>
        </Section>

        {/* 3. 耗材進銷存 */}
        <Section icon={Package} title="三、耗材進銷存" color="amber">
          <Step n={1}>側欄點選「<strong>耗材進銷存</strong>」，依分類（電材、水材、燈類、五金、無障礙裝備、藥劑、其他）顯示所有耗材卡片，每張顯示單價與目前庫存。</Step>
          <Step n={2}>庫存數量過低時會以<strong>紅字</strong>顯示並標註「庫存不足」。</Step>
          <Step n={3}>點擊耗材卡片進入詳情頁，可看到規格、存放位置、廠商聯絡方式與進出貨歷史紀錄。</Step>
          <Step n={4}>在詳情頁的「進出交易」表單，選擇交易類型：
            <br />・<strong>進貨</strong>：填寫數量、廠商（線上購物／現場採買／其他）、進貨價格
            <br />・<strong>領出</strong>：填寫數量、領出原因（選填）
            <br />・<strong>調整</strong>：直接修正庫存數量
          </Step>
          <Tip>每次領用耗材都請記錄「領出」，系統才能即時反映庫存量，避免缺料。</Tip>
        </Section>

        {/* 4. 水電紀錄 */}
        <Section icon={Droplets} title="四、水電紀錄" color="teal">
          <Step n={1}>側欄點選「<strong>水電紀錄</strong>」，可看到本月抄表狀態。每月 25 日前若未填報，會顯示<strong>提醒</strong>；超過 25 日仍未填報則顯示<strong>逾期</strong>警示。</Step>
          <Step n={2}>若最新一次抄表有異常用量，頁面上方會出現紅色警示框，列出異常表計，逐筆點「<strong>已確認</strong>」表示已查看。</Step>
          <Step n={3}>點「<strong>新增抄表</strong>」進入填報頁面，依樓層／區域分區塊填寫各水表、電表讀數，系統會自動計算用量，若用量異常（超過歷史平均或低於上次讀數）會以紅底標示提醒再次確認。</Step>
          <Step n={4}>填寫到一半可先按「<strong>儲存草稿</strong>」，全部填完後按「<strong>完成送出</strong>」。</Step>
        </Section>

        {/* 5. 房間登錄 */}
        <Section icon={DoorOpen} title="五、房間登錄" color="purple">
          <Step n={1}>側欄點選「<strong>房間登錄</strong>」，依樓層（2F～7F）顯示所有客房，每間房會標示是否已完成<strong>初始盤點</strong>，以及是否有後續<strong>變動紀錄</strong>。</Step>
          <Step n={2}>尚未盤點的房間點進去後，點「<strong>建立初始盤點</strong>」，逐項填寫房內設備（床型、家具、電器、無障礙設施等）。</Step>
          <Step n={3}>已盤點的房間若有設備更換或新增，點「<strong>記錄變動</strong>」，系統會自動比對並顯示舊值與新值的差異，方便日後追蹤每間房的設備異動歷史。</Step>
        </Section>

        {/* 6. 緊急維修說明書 */}
        <Section icon={Wrench} title="六、緊急維修說明書" color="gray">
          <Step n={1}>側欄點選「<strong>緊急維修說明書</strong>」，可依設備名稱或樓層搜尋／篩選。</Step>
          <Step n={2}>點開項目後可看到常見問題、簡易排除步驟，以及廠商聯絡電話，方便現場立即處理或聯繫廠商。</Step>
          <Step n={3}>點進設備詳情頁，可查看設備狀態（正常運作／狀況尚可／待維修／已汰除）、品牌型號、序號、保固期限等基本資訊。</Step>
          <Tip>遇到設備故障時，先查詢此說明書是否有簡易排除步驟，無法排除再透過「工務任務」建立通報。</Tip>
        </Section>

        {/* 7. 修改密碼 */}
        <Section icon={KeyRound} title="七、修改密碼" color="emerald">
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
