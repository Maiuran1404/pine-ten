'use client'

import Image from 'next/image'
import { FileIcon, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TaskFile } from '@/components/task-detail/types'

interface AttachmentsListProps {
  files: TaskFile[]
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export function AttachmentsList({ files }: AttachmentsListProps) {
  if (files.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Attachments ({files.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {files.map((file) => {
          const isImage = file.fileType.startsWith('image/')

          return (
            <a
              key={file.id}
              href={file.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-muted/50"
            >
              {/* Thumbnail or file icon */}
              <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                {isImage ? (
                  <Image
                    src={file.fileUrl}
                    alt={file.fileName}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <FileIcon className="size-5 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* File info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.fileName}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</p>
              </div>

              {/* External link icon */}
              <ExternalLink className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          )
        })}
      </CardContent>
    </Card>
  )
}
