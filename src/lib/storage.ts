import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const BUCKET_NAME = "task-files";

export async function uploadFile(
  file: File,
  path: string
): Promise<{ url: string; path: string; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    logger.error({ err: error }, "Upload error");
    return { url: "", path: "", error: error.message };
  }

  // For private buckets, create a signed URL (valid for 1 hour)
  const { data: signedData, error: signedError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(data.path, 3600);

  if (signedError) {
    logger.error({ err: signedError }, "Signed URL error");
    return { url: "", path: data.path, error: signedError.message };
  }

  return { url: signedData.signedUrl, path: data.path };
}

export async function deleteFile(path: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    logger.error({ err: error }, "Delete error");
    return false;
  }

  return true;
}

export async function getSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);

  if (error) {
    logger.error({ err: error }, "Signed URL error");
    return null;
  }

  return data.signedUrl;
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
}

export function generateFilePath(
  taskId: string,
  userId: string,
  filename: string,
  isDeliverable: boolean = false
): string {
  const timestamp = Date.now();
  const extension = getFileExtension(filename);
  const folder = isDeliverable ? "deliverables" : "attachments";
  return `tasks/${taskId}/${folder}/${userId}_${timestamp}.${extension}`;
}
