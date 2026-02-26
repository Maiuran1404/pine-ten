'use client'

import { useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Link2, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface UrlInputProps {
  onSubmit: (url: string) => void
  isLoading?: boolean
}

export function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState('')

  const handleSubmit = useCallback(() => {
    const trimmed = url.trim()
    if (!trimmed) return

    try {
      new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
      onSubmit(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
      setUrl('')
    } catch {
      toast.error('Please enter a valid URL')
    }
  }, [url, onSubmit])

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a website URL..."
          className="pl-9"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          disabled={isLoading}
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!url.trim() || isLoading}
        size="sm"
        className="bg-crafted-green hover:bg-crafted-forest text-white"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
      </Button>
    </div>
  )
}
