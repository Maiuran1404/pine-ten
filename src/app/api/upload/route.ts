import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getAdminStorageClient } from "@/lib/supabase/server";
import { withErrorHandling, successResponse, Errors } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { config } from "@/lib/config";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Allowed MIME types for upload
 * SECURITY: Removed application/octet-stream to prevent arbitrary file uploads
 */
const ALLOWED_TYPES: Record<string, { extensions: string[]; maxSize?: number }> = {
  // Images
  "image/jpeg": { extensions: ["jpg", "jpeg"] },
  "image/png": { extensions: ["png"] },
  "image/gif": { extensions: ["gif"] },
  "image/webp": { extensions: ["webp"] },
  "image/svg+xml": { extensions: ["svg"], maxSize: 5 * 1024 * 1024 }, // 5MB max for SVG (prevents XML bombs)
  "image/tiff": { extensions: ["tiff", "tif"] },
  "image/bmp": { extensions: ["bmp"] },
  // Documents
  "application/pdf": { extensions: ["pdf"] },
  // Archives
  "application/zip": { extensions: ["zip"] },
  "application/x-zip-compressed": { extensions: ["zip"] },
  // Videos
  "video/mp4": { extensions: ["mp4"] },
  "video/quicktime": { extensions: ["mov"] },
  "video/webm": { extensions: ["webm"] },
  "video/x-msvideo": { extensions: ["avi"] },
  // Office
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    extensions: ["pptx"],
  },
  "application/vnd.ms-powerpoint": { extensions: ["ppt"] },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extensions: ["docx"],
  },
  "application/msword": { extensions: ["doc"] },
  // Design files - specific types only
  "application/postscript": { extensions: ["ai", "eps"] },
  "image/vnd.adobe.photoshop": { extensions: ["psd"] },
};

const MAX_FILE_SIZE = config.uploads.maxFileSizeMB * 1024 * 1024;

/**
 * Validate file magic bytes (first few bytes of file)
 * This prevents MIME type spoofing attacks
 */
const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/gif": [0x47, 0x49, 0x46],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header
  "application/pdf": [0x25, 0x50, 0x44, 0x46], // %PDF
  "application/zip": [0x50, 0x4b, 0x03, 0x04], // PK
  "application/x-zip-compressed": [0x50, 0x4b, 0x03, 0x04],
  "video/mp4": [0x00, 0x00, 0x00], // ftyp box (varies)
};

function validateMagicBytes(
  buffer: Buffer,
  mimeType: string
): boolean {
  const magicBytes = MAGIC_BYTES[mimeType];
  if (!magicBytes) {
    // No magic bytes check available for this type - allow
    return true;
  }

  for (let i = 0; i < magicBytes.length; i++) {
    if (buffer[i] !== magicBytes[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Validate file extension matches MIME type
 */
function validateExtension(filename: string, mimeType: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return false;

  const typeConfig = ALLOWED_TYPES[mimeType];
  if (!typeConfig) return false;

  return typeConfig.extensions.includes(ext);
}

/**
 * Sanitize filename to prevent directory traversal and other attacks
 */
function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = filename.split(/[/\\]/).pop() || "file";

  // Remove dangerous characters, keep only safe ones
  const sanitized = basename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".") // Remove multiple dots
    .replace(/^\./, "_") // Don't start with dot
    .substring(0, 100); // Limit length

  return sanitized || "file";
}

export async function POST(request: NextRequest) {
  // Check rate limit first (100 req/min for API)
  const { limited, remaining, resetIn } = checkRateLimit(request, "api", config.rateLimits.api);
  if (limited) {
    const response = NextResponse.json(
      { error: "Too many requests. Please try again later.", retryAfter: resetIn },
      { status: 429 }
    );
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set("X-RateLimit-Reset", String(resetIn));
    response.headers.set("Retry-After", String(resetIn));
    return response;
  }

  return withErrorHandling(async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw Errors.unauthorized();
    }

    // Verify content type is multipart/form-data
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      logger.warn({ contentType }, "Invalid content type for file upload");
      throw Errors.badRequest("Invalid request format. Expected multipart/form-data.");
    }

    // Parse FormData with better error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      logger.error({ err: parseError }, "Failed to parse FormData");
      throw Errors.badRequest("Failed to process file upload. Please try again.");
    }
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "attachments";

    // Validate folder name (prevent directory traversal)
    const allowedFolders = ["attachments", "deliverables", "brand", "avatars"];
    if (!allowedFolders.includes(folder)) {
      throw Errors.badRequest("Invalid folder specified");
    }

    if (!file) {
      throw Errors.badRequest("No file provided");
    }

    // Validate file type
    if (!ALLOWED_TYPES[file.type]) {
      logger.warn(
        { userId: session.user.id, fileType: file.type },
        "Rejected upload with disallowed file type"
      );
      throw Errors.badRequest(
        "File type not allowed. Allowed types: images, PDFs, videos, Office documents, and design files."
      );
    }

    // Check type-specific max size
    const typeConfig = ALLOWED_TYPES[file.type];
    const effectiveMaxSize = typeConfig.maxSize || MAX_FILE_SIZE;

    if (file.size > effectiveMaxSize) {
      throw Errors.badRequest(
        `File too large. Maximum size is ${Math.round(effectiveMaxSize / 1024 / 1024)}MB for this file type.`
      );
    }

    // Validate file extension matches MIME type
    if (!validateExtension(file.name, file.type)) {
      logger.warn(
        { userId: session.user.id, fileName: file.name, fileType: file.type },
        "Rejected upload with mismatched extension"
      );
      throw Errors.badRequest("File extension does not match file type");
    }

    // Convert File to Buffer for magic bytes check
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes (file signature)
    if (!validateMagicBytes(buffer, file.type)) {
      logger.warn(
        { userId: session.user.id, fileType: file.type },
        "Rejected upload with invalid magic bytes"
      );
      throw Errors.badRequest("File content does not match declared type");
    }

    // Generate secure filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const sanitizedName = sanitizeFilename(file.name);
    const fileName = `${timestamp}-${randomStr}-${sanitizedName}`;
    const filePath = `${folder}/${session.user.id}/${fileName}`;

    // Upload to Supabase Storage
    const supabase = getAdminStorageClient();
    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      logger.error({ err: error, userId: session.user.id }, "Supabase upload failed");
      throw Errors.internal("Failed to upload file");
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("uploads").getPublicUrl(data.path);

    logger.info(
      {
        userId: session.user.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        path: data.path,
      },
      "File uploaded successfully"
    );

    return successResponse({
      file: {
        fileName: file.name,
        fileUrl: publicUrl,
        fileType: file.type,
        fileSize: file.size,
        path: data.path,
      },
    });
  }, { endpoint: "POST /api/upload" });
}
