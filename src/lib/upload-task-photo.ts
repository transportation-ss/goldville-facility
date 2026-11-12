// 任務完成照片：先在瀏覽器壓縮，再傳到 Cloudinary，只回傳網址（不再把 base64 塞進 server action／資料庫）
function compressImage(file: File, maxWidth = 1600, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('照片壓縮失敗'))), 'image/jpeg', quality)
    }
    img.onerror = () => reject(new Error('無法讀取這張照片'))
    img.src = url
  })
}

export async function uploadTaskPhoto(file: File, taskDate: string): Promise<string> {
  const compressed = await compressImage(file)
  const form = new FormData()
  form.append('file', new File([compressed], 'task.jpg', { type: 'image/jpeg' }))
  form.append('residentName', '任務回報')
  form.append('logDate', taskDate)
  const res = await fetch('/api/butler/upload-photo', { method: 'POST', body: form })
  if (!res.ok) {
    let msg = ''
    try { msg = (await res.json()).error } catch { msg = await res.text().catch(() => '') }
    throw new Error(`照片上傳失敗（${res.status}）${msg ? '：' + String(msg).slice(0, 80) : ''}`)
  }
  return (await res.json()).url as string
}
