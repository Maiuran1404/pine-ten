import { createClient, getAdminStorageClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const BUCKET_NAME = 'task-files'

/**
 * Upload a file to Supabase Storage with automatic bucket creation.
 * If the bucket doesn't exist, it creates a public bucket and retries the upload.
 * Returns the public URL of the uploaded file.
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  body: Buffer | File,
  options?: { contentType?: string; upsert?: boolean }
): Promise<string> {
  const supabase = getAdminStorageClient()

  const uploadOptions = {
    contentType: options?.contentType,
    upsert: options?.upsert ?? false,
  }

  const { error } = await supabase.storage.from(bucket).upload(path, body, uploadOptions)

  if (error) {
    if (error.message.includes('not found')) {
      await supabase.storage.createBucket(bucket, { public: true })
      const { error: retryError } = await supabase.storage
        .from(bucket)
        .upload(path, body, uploadOptions)
      if (retryError) throw retryError
    } else {
      throw error
    }
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)

  return urlData.publicUrl
}

export async function uploadFile(
  file: File,
  path: string
): Promise<{ url: string; path: string; error?: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    logger.error({ err: error }, 'Upload error')
    return { url: '', path: '', error: error.message }
  }

  // For private buckets, create a signed URL (valid for 1 hour)
  const { data: signedData, error: signedError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(data.path, 3600)

  if (signedError) {
    logger.error({ err: signedError }, 'Signed URL error')
    return { url: '', path: data.path, error: signedError.message }
  }

  return { url: signedData.signedUrl, path: data.path }
}

export async function deleteFile(path: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])

  if (error) {
    logger.error({ err: error }, 'Delete error')
    return false
  }

  return true
}

export async function getSignedUrl(path: string, expiresIn: number = 3600): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, expiresIn)

  if (error) {
    logger.error({ err: error }, 'Signed URL error')
    return null
  }

  return data.signedUrl
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2)
}

export function generateFilePath(
  taskId: string,
  userId: string,
  filename: string,
  isDeliverable: boolean = false
): string {
  const timestamp = Date.now()
  const extension = getFileExtension(filename)
  const folder = isDeliverable ? 'deliverables' : 'attachments'
  return `tasks/${taskId}/${folder}/${userId}_${timestamp}.${extension}`
}
