import sharp from "sharp";

export interface OptimizedImage {
  buffer: Buffer;
  contentType: "image/webp";
  width: number;
  height: number;
  size: number;
}

export interface ImageVariants {
  /** Full size image, max 1600px on longest side */
  full: OptimizedImage;
  /** Preview size, 800px on longest side */
  preview: OptimizedImage;
  /** Thumbnail, 400x400 cover crop */
  thumbnail: OptimizedImage;
}

const SIZES = {
  full: { width: 1600, height: 1600 },
  preview: { width: 800, height: 800 },
  thumbnail: { width: 400, height: 400 },
} as const;

const QUALITY = {
  full: 85,
  preview: 80,
  thumbnail: 75,
} as const;

/**
 * Optimizes an image buffer into WebP format at multiple sizes
 * - Converts to WebP for ~30% smaller files
 * - Generates 3 variants: full (1600px), preview (800px), thumbnail (400px)
 * - Strips metadata to reduce file size
 */
export async function optimizeImage(
  input: Buffer | ArrayBuffer
): Promise<ImageVariants> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  // Get original metadata
  const metadata = await sharp(buffer).metadata();
  const originalWidth = metadata.width || 1600;
  const originalHeight = metadata.height || 1600;

  // Process all variants in parallel
  const [full, preview, thumbnail] = await Promise.all([
    // Full size - fit within bounds, maintain aspect ratio
    sharp(buffer)
      .resize(SIZES.full.width, SIZES.full.height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY.full })
      .toBuffer({ resolveWithObject: true }),

    // Preview - fit within bounds, maintain aspect ratio
    sharp(buffer)
      .resize(SIZES.preview.width, SIZES.preview.height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY.preview })
      .toBuffer({ resolveWithObject: true }),

    // Thumbnail - cover crop to exact dimensions
    sharp(buffer)
      .resize(SIZES.thumbnail.width, SIZES.thumbnail.height, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: QUALITY.thumbnail })
      .toBuffer({ resolveWithObject: true }),
  ]);

  return {
    full: {
      buffer: full.data,
      contentType: "image/webp",
      width: full.info.width,
      height: full.info.height,
      size: full.info.size,
    },
    preview: {
      buffer: preview.data,
      contentType: "image/webp",
      width: preview.info.width,
      height: preview.info.height,
      size: preview.info.size,
    },
    thumbnail: {
      buffer: thumbnail.data,
      contentType: "image/webp",
      width: thumbnail.info.width,
      height: thumbnail.info.height,
      size: thumbnail.info.size,
    },
  };
}

/**
 * Optimizes a single image to WebP at a specific max dimension
 * Useful for simple single-variant optimization
 */
export async function optimizeSingleImage(
  input: Buffer | ArrayBuffer,
  maxDimension: number = 1600,
  quality: number = 85
): Promise<OptimizedImage> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);

  const result = await sharp(buffer)
    .resize(maxDimension, maxDimension, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: result.data,
    contentType: "image/webp",
    width: result.info.width,
    height: result.info.height,
    size: result.info.size,
  };
}

/**
 * Get image dimensions without processing
 */
export async function getImageMetadata(
  input: Buffer | ArrayBuffer
): Promise<{ width: number; height: number; format: string }> {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const metadata = await sharp(buffer).metadata();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
  };
}

// Re-export client-safe utils for backward compatibility
export { getImageVariantUrls } from "./utils";
