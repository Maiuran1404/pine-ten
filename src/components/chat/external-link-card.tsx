'use client'

import { ExternalLink, X, Check, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UploadedFile } from './types'

// Provider icon components
function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 2L1 14H8L15 2H8Z" fill="#4285F4" />
      <path d="M15 2L8 14H15L22 2H15Z" fill="#FBBC05" />
      <path d="M1 14L5 22H19L15 14H1Z" fill="#34A853" />
    </svg>
  )
}

function DropboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L6 6L12 10L6 14L12 18L18 14L12 10L18 6L12 2Z" fill="#0061FF" />
    </svg>
  )
}

interface ExternalLinkCardProps {
  file: UploadedFile
  onRemove?: () => void
}

export function ExternalLinkCard({ file, onRemove }: ExternalLinkCardProps) {
  const providerLabel =
    file.provider === 'google_drive'
      ? 'Google Drive'
      : file.provider === 'dropbox'
        ? 'Dropbox'
        : 'External link'

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/50 border border-border/50 group">
      {/* Provider icon */}
      <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center shrink-0 border border-border/50">
        {file.provider === 'google_drive' ? (
          <GoogleDriveIcon className="h-4 w-4" />
        ) : file.provider === 'dropbox' ? (
          <DropboxIcon className="h-4 w-4" />
        ) : (
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <a
          href={file.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-foreground hover:underline truncate block"
        >
          {file.fileName || 'External file'}
        </a>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-muted-foreground">{providerLabel}</span>
          {file.isAccessible !== undefined && (
            <>
              <span className="text-muted-foreground/40">·</span>
              {file.isAccessible ? (
                <span className="flex items-center gap-0.5 text-xs text-ds-success">
                  <Check className="h-3 w-3" />
                  Accessible
                </span>
              ) : (
                <span className="flex items-center gap-0.5 text-xs text-ds-warning">
                  <AlertTriangle className="h-3 w-3" />
                  May require access
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={cn(
            'p-1 text-muted-foreground hover:text-destructive transition-all',
            'opacity-0 group-hover:opacity-100'
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
