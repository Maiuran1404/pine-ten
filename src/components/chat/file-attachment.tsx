"use client";

import { FileIcon, XCircle } from "lucide-react";
import { UploadedFile } from "./types";

interface FileAttachmentProps {
  file: UploadedFile;
  showPreview?: boolean;
  onRemove?: () => void;
}

/**
 * Displays a file attachment with preview for images
 */
export function FileAttachment({ file, showPreview = true, onRemove }: FileAttachmentProps) {
  const isImage = file.fileType.startsWith("image/");
  const fileSizeKB = (file.fileSize / 1024).toFixed(1);

  if (isImage && showPreview) {
    return (
      <div className="relative group">
        <a
          href={file.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <img
            src={file.fileUrl}
            alt={file.fileName}
            className="max-w-[200px] max-h-[150px] rounded object-cover"
          />
        </a>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-2 -right-2 p-0.5 bg-background rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Remove ${file.fileName}`}
          >
            <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded bg-background/50 group">
      <a
        href={file.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm hover:underline flex-1"
      >
        <FileIcon className="h-4 w-4" aria-hidden="true" />
        <span className="truncate">{file.fileName}</span>
        <span className="text-xs text-muted-foreground">
          ({fileSizeKB} KB)
        </span>
      </a>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={`Remove ${file.fileName}`}
        >
          <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

interface FileAttachmentListProps {
  files: UploadedFile[];
  showPreview?: boolean;
  onRemove?: (index: number) => void;
}

/**
 * Displays a list of file attachments
 */
export function FileAttachmentList({ files, showPreview = true, onRemove }: FileAttachmentListProps) {
  if (files.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {files.map((file, idx) => (
        <FileAttachment
          key={idx}
          file={file}
          showPreview={showPreview}
          onRemove={onRemove ? () => onRemove(idx) : undefined}
        />
      ))}
    </div>
  );
}
