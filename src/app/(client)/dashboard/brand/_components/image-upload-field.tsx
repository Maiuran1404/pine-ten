'use client'

import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploadFieldProps {
  label: string
  value: string | null
  onChange: (url: string | null) => void
  folder?: string
}

export function ImageUploadField({
  label,
  value,
  onChange,
  folder = 'brand',
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      const result = await response.json()
      onChange(result.data.file.fileUrl)
    } catch {
      console.error('Upload failed')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleUrlPaste = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim())
      setUrlInput('')
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-sm">{label}</Label>

      {value ? (
        <div className="flex items-center gap-3">
          <img
            src={value}
            alt={label}
            className="w-16 h-16 rounded-lg border border-border object-contain bg-muted"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            'flex items-center justify-center gap-2 w-full h-20 rounded-lg border-2 border-dashed border-border',
            'text-muted-foreground text-sm hover:border-ring hover:text-foreground transition-colors',
            isUploading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-5 w-5" />
              <span>Click to upload</span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex gap-2">
        <Input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Or paste image URL..."
          className="flex-1 h-9 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleUrlPaste()
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleUrlPaste}
          disabled={!urlInput.trim()}
          className="h-9"
        >
          <Upload className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
