'use client'

import { Textarea } from '@/components/ui/textarea'

interface NotesInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
}

export function NotesInput({
  value,
  onChange,
  placeholder = 'Anything else we should know about your website?',
  maxLength = 2000,
}: NotesInputProps) {
  return (
    <div className="space-y-1">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="min-h-[80px] resize-none"
      />
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  )
}
