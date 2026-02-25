/**
 * Hook for managing file uploads with optimistic previews.
 * Files get instant local previews via URL.createObjectURL() and upload
 * in the background — no blocking spinner, no disabled buttons.
 */
'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { type UploadedFile } from '@/components/chat/types'

export interface PendingFile {
  id: string
  file: File
  localPreviewUrl: string
  fileName: string
  fileType: string
  fileSize: number
  status: 'uploading' | 'done' | 'error'
  result?: UploadedFile
  error?: string
}

interface UseFileUploadOptions {
  addFromUpload: (file: UploadedFile) => void
}

export function useFileUpload({ addFromUpload }: UseFileUploadOptions) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  // Track in-flight upload promises so waitForUploads works even after state is cleared
  const uploadPromisesRef = useRef<Map<string, Promise<UploadedFile | null>>>(new Map())

  const uploadFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      if (fileArray.length === 0) return

      // Create pending file entries with local preview URLs immediately
      const newPending: PendingFile[] = fileArray.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        localPreviewUrl: URL.createObjectURL(file),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        status: 'uploading' as const,
      }))

      setPendingFiles((prev) => [...prev, ...newPending])

      // Fire uploads in background — each file uploads independently
      newPending.forEach((pending) => {
        const formData = new FormData()
        formData.append('file', pending.file)
        formData.append('folder', 'attachments')

        const uploadPromise = fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
          .then(async (response) => {
            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error?.message || errorData.message || 'Upload failed')
            }
            const data = await response.json()
            const uploadedFile = (data.data?.file || data.file) as UploadedFile

            if (!uploadedFile?.fileUrl) {
              throw new Error('Upload returned no file URL')
            }

            // Mark this file as done in state
            setPendingFiles((prev) =>
              prev.map((f) =>
                f.id === pending.id ? { ...f, status: 'done' as const, result: uploadedFile } : f
              )
            )

            // Add images to moodboard
            if (uploadedFile.fileType?.startsWith('image/')) {
              addFromUpload(uploadedFile)
            }

            return uploadedFile
          })
          .catch((error) => {
            const errorMsg = error instanceof Error ? error.message : 'Failed to upload file'

            setPendingFiles((prev) =>
              prev.map((f) =>
                f.id === pending.id ? { ...f, status: 'error' as const, error: errorMsg } : f
              )
            )

            toast.error(`Failed to upload ${pending.fileName}: ${errorMsg}`)
            return null
          })
          .finally(() => {
            // Clean up the promise from the tracking map
            uploadPromisesRef.current.delete(pending.id)
          })

        // Track the promise
        uploadPromisesRef.current.set(pending.id, uploadPromise)
      })
    },
    [addFromUpload]
  )

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      uploadFiles(files)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [uploadFiles]
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      dragCounterRef.current = 0

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        uploadFiles(files)
      }
    },
    [uploadFiles]
  )

  const removeFile = useCallback((idOrUrl: string) => {
    setPendingFiles((prev) => {
      const toRemove = prev.find(
        (f) => f.id === idOrUrl || f.localPreviewUrl === idOrUrl || f.result?.fileUrl === idOrUrl
      )
      if (toRemove) {
        URL.revokeObjectURL(toRemove.localPreviewUrl)
        // Remove promise tracking too
        uploadPromisesRef.current.delete(toRemove.id)
      }
      return prev.filter(
        (f) => f.id !== idOrUrl && f.localPreviewUrl !== idOrUrl && f.result?.fileUrl !== idOrUrl
      )
    })
  }, [])

  const addExternalLink = useCallback((file: UploadedFile) => {
    setPendingFiles((prev) => [
      ...prev,
      {
        id: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file: new File([], file.fileName),
        localPreviewUrl: file.fileUrl,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        status: 'done' as const,
        result: file,
      },
    ])
  }, [])

  /**
   * Snapshot current files and clear the pending state.
   * Returns already-completed UploadedFile[] and a promise that resolves
   * with ALL files (including those still uploading) once they finish.
   * This allows clearing previews from the input immediately while still
   * awaiting in-flight uploads.
   */
  const collectAndClear = useCallback((): {
    alreadyDone: UploadedFile[]
    allUploadsPromise: Promise<UploadedFile[]>
    hasInFlight: boolean
  } => {
    // Snapshot what we need from current state
    let snapshotDone: UploadedFile[] = []
    let hasInFlight = false

    setPendingFiles((prev) => {
      snapshotDone = prev.filter((f) => f.status === 'done' && f.result).map((f) => f.result!)
      hasInFlight = prev.some((f) => f.status === 'uploading')

      // Revoke blob URLs
      prev.forEach((f) => {
        if (f.localPreviewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(f.localPreviewUrl)
        }
      })
      return []
    })

    // Capture all in-flight promises before they self-clean
    const inFlightPromises = Array.from(uploadPromisesRef.current.values())

    const allUploadsPromise =
      inFlightPromises.length > 0
        ? Promise.all(inFlightPromises).then((results) => {
            const uploaded = results.filter((r): r is UploadedFile => r !== null)
            return [...snapshotDone, ...uploaded]
          })
        : Promise.resolve(snapshotDone)

    return { alreadyDone: snapshotDone, allUploadsPromise, hasInFlight }
  }, [])

  const clearPendingFiles = useCallback(() => {
    setPendingFiles((prev) => {
      prev.forEach((f) => {
        if (f.localPreviewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(f.localPreviewUrl)
        }
      })
      return []
    })
  }, [])

  // Backward-compatible: derive uploadedFiles from pending files that are done
  const uploadedFiles: UploadedFile[] = pendingFiles
    .filter((f) => f.status === 'done' && f.result)
    .map((f) => f.result!)

  // Backward-compatible: isUploading is true if any file is still uploading
  const isUploading = pendingFiles.some((f) => f.status === 'uploading')

  // Whether there are any files (uploading or done) — used for send button enablement
  const hasFiles = pendingFiles.length > 0

  return {
    pendingFiles,
    setPendingFiles,
    uploadedFiles,
    isUploading,
    hasFiles,
    isDragging,
    fileInputRef,
    uploadFiles,
    handleFileUpload,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    removeFile,
    addExternalLink,
    clearPendingFiles,
    collectAndClear,
    // Backward-compatible alias
    setUploadedFiles: setPendingFiles as unknown as React.Dispatch<
      React.SetStateAction<UploadedFile[]>
    >,
    clearUploadedFiles: clearPendingFiles,
  }
}
