import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { db } from '@/db'
import { deliverableStyleReferences } from '@/db/schema'
import { eq, isNotNull, and } from 'drizzle-orm'

// Helper to extract YouTube video ID from various URL formats
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Get YouTube thumbnail URL from video ID
function getYouTubeThumbnailUrl(
  videoId: string,
  quality: 'maxres' | 'hq' | 'mq' | 'default' = 'maxres'
): string {
  const qualityMap = {
    maxres: 'maxresdefault',
    hq: 'hqdefault',
    mq: 'mqdefault',
    default: 'default',
  }
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
}

// GET - List all video references
export async function GET(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { searchParams } = new URL(request.url)
      const tag = searchParams.get('tag')
      const deliverableType = searchParams.get('deliverableType')

      // Build query conditions
      const conditions = [isNotNull(deliverableStyleReferences.videoUrl)]

      if (deliverableType) {
        conditions.push(eq(deliverableStyleReferences.deliverableType, deliverableType))
      }

      let videos = await db
        .select()
        .from(deliverableStyleReferences)
        .where(and(...conditions))
        .orderBy(deliverableStyleReferences.featuredOrder, deliverableStyleReferences.createdAt)

      // Filter by tag if provided (done in JS since jsonb contains is complex)
      if (tag) {
        videos = videos.filter(
          (v) => v.videoTags && Array.isArray(v.videoTags) && v.videoTags.includes(tag)
        )
      }

      // Get all unique tags for filtering UI
      const allTags = new Set<string>()
      videos.forEach((v) => {
        if (v.videoTags && Array.isArray(v.videoTags)) {
          v.videoTags.forEach((t) => allTags.add(t))
        }
      })

      return successResponse({
        videos,
        tags: Array.from(allTags).sort(),
        total: videos.length,
      })
    },
    { endpoint: 'GET /api/admin/video-references' }
  )
}

// POST - Add a new video reference
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const {
        videoUrl,
        name,
        description,
        deliverableType = 'launch_video',
        styleAxis = 'bold',
        videoTags = [],
        videoDuration,
        featuredOrder = 0,
      } = body

      if (!videoUrl) {
        throw Errors.badRequest('Video URL is required')
      }

      // Extract YouTube video ID
      const videoId = extractYouTubeVideoId(videoUrl)
      if (!videoId) {
        throw Errors.badRequest('Invalid YouTube URL. Please provide a valid YouTube video URL.')
      }

      // Normalize the YouTube URL
      const normalizedVideoUrl = `https://www.youtube.com/watch?v=${videoId}`

      // Check if this video already exists
      const existing = await db
        .select({ id: deliverableStyleReferences.id })
        .from(deliverableStyleReferences)
        .where(eq(deliverableStyleReferences.videoUrl, normalizedVideoUrl))
        .limit(1)

      if (existing.length > 0) {
        throw Errors.badRequest('This video has already been added to the reference library.')
      }

      // Get thumbnail URL (try maxres first, will fallback in UI if not available)
      const thumbnailUrl = getYouTubeThumbnailUrl(videoId, 'maxres')

      // Create the video reference
      const [newVideo] = await db
        .insert(deliverableStyleReferences)
        .values({
          name: name || `Video Reference ${videoId}`,
          description: description || null,
          imageUrl: thumbnailUrl,
          videoUrl: normalizedVideoUrl,
          videoThumbnailUrl: thumbnailUrl,
          videoTags: videoTags,
          videoDuration: videoDuration || null,
          deliverableType,
          styleAxis,
          featuredOrder,
          displayOrder: 0,
          isActive: true,
          semanticTags: [],
        })
        .returning()

      return successResponse({ video: newVideo }, 201)
    },
    { endpoint: 'POST /api/admin/video-references' }
  )
}

// PATCH - Update a video reference
export async function PATCH(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const body = await request.json()
      const { id, ...updates } = body

      if (!id) {
        throw Errors.badRequest('Video ID is required')
      }

      // If videoUrl is being updated, re-extract thumbnail
      if (updates.videoUrl) {
        const videoId = extractYouTubeVideoId(updates.videoUrl)
        if (videoId) {
          updates.videoUrl = `https://www.youtube.com/watch?v=${videoId}`
          updates.videoThumbnailUrl = getYouTubeThumbnailUrl(videoId, 'maxres')
          updates.imageUrl = updates.videoThumbnailUrl
        }
      }

      const [updated] = await db
        .update(deliverableStyleReferences)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(deliverableStyleReferences.id, id))
        .returning()

      if (!updated) {
        throw Errors.notFound('Video reference not found')
      }

      return successResponse({ video: updated })
    },
    { endpoint: 'PATCH /api/admin/video-references' }
  )
}

// DELETE - Remove a video reference
export async function DELETE(request: NextRequest) {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')

      if (!id) {
        throw Errors.badRequest('Video ID is required')
      }

      await db.delete(deliverableStyleReferences).where(eq(deliverableStyleReferences.id, id))

      return successResponse({ success: true })
    },
    { endpoint: 'DELETE /api/admin/video-references' }
  )
}
