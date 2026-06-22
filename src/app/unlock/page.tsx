'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UnlockPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const router   = useRouter()
  const [flash, setFlash] = useState(false)

  function handleEnded() {
    setFlash(true)
    setTimeout(() => router.replace('/login'), 400)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <video
        ref={videoRef}
        src="/unlock.mp4"
        autoPlay
        muted
        playsInline
        onEnded={handleEnded}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: '#fff',
        opacity: flash ? 1 : 0,
        transition: flash ? 'opacity 0.3s ease-in' : 'none',
        pointerEvents: 'none',
      }} />
    </div>
  )
}
