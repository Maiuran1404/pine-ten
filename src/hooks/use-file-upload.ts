/**
 * Hook for managing file uploads and drag-and-drop.
 * Handles uploading files to the server, drag/drop events,
 * and managing the uploaded file list.
 */
'use client'

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { type UploadedFile } from '@/components/chat/types'

interface UseFileUploadOptions {
  addFromUpload: (file: UploadedFile) => void
}

export function useFileUpload({ addFromUpload }: UseFileUploadOptions) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      if (fileArray.length === 0) return

      setIsUploading(true)

      try {
        const uploadPromises = fileArray.map(async (file) => {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('folder', 'attachments')

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error?.message || errorData.message || 'Upload failed')
          }

          const data = await response.json()
          return (data.data?.file || data.file) as UploadedFile
        })

        const newFiles = await Promise.all(uploadPromises)
        const validFiles = newFiles.filter((f): f is UploadedFile => !!f && !!f.fileUrl)
        setUploadedFiles((prev) => [...prev, ...validFiles])

        validFiles.forEach((file) => {
          if (file.fileType?.startsWith('image/')) {
            addFromUpload(file)
          }
        })

        toast.success(`${validFiles.length} file(s) uploaded`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to upload files')
      } finally {
        setIsUploading(false)
      }
    },
    [addFromUpload]
  )

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      await uploadFiles(files)
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
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      dragCounterRef.current = 0

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        await uploadFiles(files)
      }
    },
    [uploadFiles]
  )

  const removeFile = useCallback((fileUrl: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.fileUrl !== fileUrl))
  }, [])

  const addExternalLink = useCallback((file: UploadedFile) => {
    setUploadedFiles((prev) => [...prev, file])
  }, [])

  const clearUploadedFiles = useCallback(() => {
    setUploadedFiles([])
  }, [])

  return {
    uploadedFiles,
    setUploadedFiles,
    isUploading,
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
    clearUploadedFiles,
  }
}
