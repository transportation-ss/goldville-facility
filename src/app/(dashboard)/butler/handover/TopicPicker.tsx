'use client'

import { HANDOVER_TOPICS } from './topics'

/** 主題單選：一排 chip，點一下選、再點同一個取消（取消只在 allowEmpty 時有效） */
export function TopicPicker({ value, onChange, allowEmpty = false }: {
  value: string
  onChange: (v: string) => void
  allowEmpty?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-gray-400">主題{allowEmpty ? '' : ' *'}</span>
      {HANDOVER_TOPICS.map(t => (
        <button key={t} type="button"
          onClick={() => onChange(value === t && allowEmpty ? '' : t)}
          className={`text-xs rounded-full px-2.5 py-1 border ${
            value === t
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
          }`}>
          {t}
        </button>
      ))}
    </div>
  )
}
