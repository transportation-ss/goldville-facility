# 從 Excel 財產盤點表匯出為 JSON
# 執行方式：powershell -File scripts/export-hardware-excel.ps1

$file = "C:\D槽的東西\桌面資料歸類\工作報告表單\保管組業務_產編\NEWs\有本產編-依設備分類及統整_250203_會計科目.xlsx"
$outFile = "C:\claude_code_SY\goldville-facility\scripts\hardware-export.json"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $excel.Workbooks.Open($file)

# 工作表 → 標籤對應
$sheetTagMap = @{
  '住宅設備'     = @('住宅設備')
  '電子電器設備' = @('電子電器設備')
  '事務設備'     = @('事務設備')
  '廚房設備'     = @('廚房設備')
  '雜項設備'     = @('雜項設備')
}

$allRecords = @()

foreach ($sheetName in $sheetTagMap.Keys) {
  Write-Host "讀取工作表：$sheetName"
  $ws = $wb.Sheets.Item($sheetName)
  $lastRow = $ws.UsedRange.Rows.Count
  $tags = $sheetTagMap[$sheetName]

  # 讀第一列確認欄位位置
  # 固定欄位：[1]名稱 [2]會計類型 [3]品名 [4]數量 [5]類別 [6]位置 [7]設備編號 [8]備註 ([9]使用者)
  $currentGroup = ''
  $count = 0

  for ($r = 2; $r -le $lastRow; $r++) {
    $colName    = $ws.Cells.Item($r, 1).Text.Trim()
    $colAcct    = $ws.Cells.Item($r, 2).Text.Trim()
    $colPinName = $ws.Cells.Item($r, 3).Text.Trim()
    $colQty     = $ws.Cells.Item($r, 4).Text.Trim()
    $colCat     = $ws.Cells.Item($r, 5).Text.Trim()
    $colLoc     = $ws.Cells.Item($r, 6).Text.Trim()
    $colAsset   = $ws.Cells.Item($r, 7).Text.Trim()
    $colNote    = $ws.Cells.Item($r, 8).Text.Trim()
    $colUser    = $ws.Cells.Item($r, 9).Text.Trim()

    # 全空跳過
    if (-not $colAsset -and -not $colPinName -and -not $colName) { continue }

    # 合併儲存格 fill-down：有新名稱就更新，否則沿用上一個
    if ($colName) { $currentGroup = $colName }

    # 品名：優先用品名欄，若空就用群組名稱
    $itemName = if ($colPinName) { $colPinName } else { $currentGroup }
    if (-not $itemName) { continue }

    # 備註整合使用者
    $notes = $colNote
    if ($colUser) { $notes = ($notes + " 使用者:$colUser").Trim() }

    $record = [PSCustomObject]@{
      item_group = $currentGroup
      name       = $itemName
      category   = $sheetName
      tags       = $tags
      location   = $colLoc
      asset_no   = $colAsset
      notes      = $notes
      condition  = 'good'
      is_active  = $true
    }
    $allRecords += $record
    $count++
  }
  Write-Host "  → $count 筆"
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null

# 輸出 JSON
$json = $allRecords | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($outFile, $json, [System.Text.Encoding]::UTF8)
Write-Host "`n✅ 匯出完成：$($allRecords.Count) 筆 → $outFile"
