'use client'

import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CloudUpload, Link2, Loader2, X, FileIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AssetRequest, UploadedFile } from './types'
import { ExternalLinkCard } from './external-link-card'

// Map acceptTypes from AI to file input accept attribute
const ACCEPT_TYPE_MAP: Record<string, string> = {
  image: 'image/*',
  video: 'video/*',
  pdf: '.pdf',
  design: '.ai,.eps,.psd,.sketch,.fig,.xd',
}

function buildAcceptString(acceptTypes: string[]): string {
  return acceptTypes
    .map((t) => ACCEPT_TYPE_MAP[t])
    .filter(Boolean)
    .join(',')
}

function getAcceptLabel(acceptTypes: string[]): string {
  const labels: string[] = []
  if (acceptTypes.includes('image')) labels.push('Images')
  if (acceptTypes.includes('video')) labels.push('Videos')
  if (acceptTypes.includes('pdf')) labels.push('PDFs')
  if (acceptTypes.includes('design')) labels.push('Design files')
  return labels.join(', ') || 'Files'
}

// Detect Google Drive or Dropbox links
function detectExternalLink(
  url: string
): { provider: 'google_drive' | 'dropbox' | 'other'; isValid: boolean } | null {
  const trimmed = url.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return null
  try {
    const parsed = new URL(trimmed)
    if (
      parsed.hostname.includes('drive.google.com') ||
      parsed.hostname.includes('docs.google.com')
    ) {
      return { provider: 'google_drive', isValid: true }
    }
    if (
      parsed.hostname.includes('dropbox.com') ||
      parsed.hostname.includes('dl.dropboxusercontent.com')
    ) {
      return { provider: 'dropbox', isValid: true }
    }
    // Any other URL
    return { provider: 'other', isValid: true }
  } catch {
    return null
  }
}

interface InlineUploadZoneProps {
  assetRequest: AssetRequest
  onUpload: (files: FileList | File[]) => void
  isUploading: boolean
  uploadedFiles: UploadedFile[]
  onRemoveFile: (fileUrl: string) => void
  onAddExternalLink: (file: UploadedFile) => void
}

export function InlineUploadZone({
  assetRequest,
  onUpload,
  isUploading,
  uploadedFiles,
  onRemoveFile,
  onAddExternalLink,
}: InlineUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const [isValidatingLink, setIsValidatingLink] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  const acceptString = buildAcceptString(assetRequest.acceptTypes)
  const acceptLabel = getAcceptLabel(assetRequest.acceptTypes)

  // Filter to show only files relevant to this zone (non-external uploads)
  const directUploads = uploadedFiles.filter((f) => !f.isExternalLink)
  const externalLinks = uploadedFiles.filter((f) => f.isExternalLink)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      dragCounter.current = 0
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await onUpload(e.dataTransfer.files)
      }
    },
    [onUpload]
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        await onUpload(e.target.files)
        e.target.value = ''
      }
    },
    [onUpload]
  )

  const handleLinkSubmit = useCallback(async () => {
    const detected = detectExternalLink(linkInput)
    if (!detected) return

    setIsValidatingLink(true)
    try {
      const res = await fetch('/api/validate-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkInput.trim(), provider: detected.provider }),
      })

      const data = res.ok ? await res.json() : null
      const validationResult = data?.data

      const externalFile: UploadedFile = {
        fileName:
          validationResult?.fileName ||
          new URL(linkInput.trim()).pathname.split('/').pop() ||
          'External file',
        fileUrl: linkInput.trim(),
        fileType: validationResult?.fileType || 'application/octet-stream',
        fileSize: 0,
        isExternalLink: true,
        provider: detected.provider,
        isAccessible: validationResult?.isAccessible ?? undefined,
      }

      onAddExternalLink(externalFile)
      setLinkInput('')
      setShowLinkInput(false)
    } catch {
      // Still add the link even if validation fails
      const externalFile: UploadedFile = {
        fileName: new URL(linkInput.trim()).pathname.split('/').pop() || 'External file',
        fileUrl: linkInput.trim(),
        fileType: 'application/octet-stream',
        fileSize: 0,
        isExternalLink: true,
        provider: detected.provider,
        isAccessible: undefined,
      }
      onAddExternalLink(externalFile)
      setLinkInput('')
      setShowLinkInput(false)
    } finally {
      setIsValidatingLink(false)
    }
  }, [linkInput, onAddExternalLink])

  const hasFiles = directUploads.length > 0 || externalLinks.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-4"
    >
      {/* Main dropzone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative rounded-xl border-2 border-dashed p-6 cursor-pointer transition-all',
          'bg-crafted-green/5',
          isDragOver
            ? 'border-crafted-green bg-crafted-green/10 scale-[1.01]'
            : 'border-crafted-green/30 hover:border-crafted-green/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptString}
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center text-center gap-2">
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-crafted-green dark:text-crafted-green-light animate-spin" />
          ) : (
            <CloudUpload className="h-8 w-8 text-crafted-green dark:text-crafted-green-light" />
          )}
          <p className="text-sm font-medium text-foreground">{assetRequest.prompt}</p>
          <p className="text-xs text-muted-foreground">
            {isDragOver ? 'Drop files here' : `Drag files here or click to browse`}
          </p>
          <p className="text-xs text-muted-foreground/70">{acceptLabel}</p>
        </div>
      </div>

      {/* Link input toggle */}
      {!showLinkInput && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setShowLinkInput(true)
          }}
          className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Link2 className="h-3.5 w-3.5" />
          Or share a Google Drive / Dropbox link
        </button>
      )}

      {/* Link input field */}
      {showLinkInput && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-2 flex items-center gap-2"
        >
          <div className="flex-1 relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="url"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleLinkSubmit()
                }
                if (e.key === 'Escape') {
                  setShowLinkInput(false)
                  setLinkInput('')
                }
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Paste a Google Drive or Dropbox link"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-crafted-green"
            />
          </div>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleLinkSubmit()
            }}
            disabled={!linkInput.trim() || isValidatingLink || !detectExternalLink(linkInput)}
            className="h-9 bg-crafted-green hover:bg-crafted-forest text-white"
          >
            {isValidatingLink ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}
          </Button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowLinkInput(false)
              setLinkInput('')
            }}
            className="p-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}

      {/* Uploaded file previews */}
      {hasFiles && (
        <div className="mt-3 space-y-2">
          {/* Direct uploads */}
          {directUploads.map((file) => (
            <div
              key={file.fileUrl}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 group"
              onClick={(e) => e.stopPropagation()}
            >
              {file.fileType?.startsWith('image/') ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={file.fileUrl}
                  alt={file.fileName}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <FileIcon className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm flex-1 truncate">{file.fileName}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveFile(file.fileUrl)
                }}
                className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* External links */}
          {externalLinks.map((file) => (
            <div key={file.fileUrl} onClick={(e) => e.stopPropagation()}>
              <ExternalLinkCard file={file} onRemove={() => onRemoveFile(file.fileUrl)} />
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}
