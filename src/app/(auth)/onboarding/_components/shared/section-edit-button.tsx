'use client'

import { Check } from 'lucide-react'

export function SectionEditButton({
  section,
  isActive,
  onToggle,
}: {
  section: 'name' | 'colors' | 'typography' | 'style' | 'tone'
  isActive: boolean
  onToggle: (
    section: 'name' | 'colors' | 'typography' | 'style' | 'tone',
    isActive: boolean
  ) => void
}) {
  return (
    <button
      onClick={() => onToggle(section, isActive)}
      className={`p-1.5 rounded-lg transition-all ${
        isActive
          ? 'bg-crafted-olive/20 text-crafted-olive'
          : 'text-white/30 hover:text-white/60 hover:bg-white/5'
      }`}
      title={isActive ? 'Done' : 'Edit'}
    >
      {isActive ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      )}
    </button>
  )
}
