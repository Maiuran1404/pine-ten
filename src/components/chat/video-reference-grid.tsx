'use client'

import { useState } from 'react'
import { motion, LayoutGroup } from 'framer-motion'
import { Check, Play, ExternalLink, RefreshCw, Shuffle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface VideoReferenceStyle {
  id: string
  name: string
  description: string | null
  imageUrl: string
  videoUrl: string
  videoThumbnailUrl?: string | null
  videoDuration?: string | null
  videoTags?: string[]
  deliverableType: string
  styleAxis: string
  subStyle?: string | null
  semanticTags?: string[]
  brandMatchScore?: number
  matchReason?: string
  isVideoReference?: boolean
}

interface VideoReferenceGridProps {
  videos: VideoReferenceStyle[]
  onSelectVideo?: (video: VideoReferenceStyle) => void
  onShowMore?: () => void
  onShowDifferent?: () => void
  isLoading?: boolean
  title?: string
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null

  // Try multiple patterns - order matters, try most specific first
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/, // ?v= or &v= parameter
    /youtu\.be\/([a-zA-Z0-9_-]{11})/, // youtu.be shortlinks
    /embed\/([a-zA-Z0-9_-]{11})/, // /embed/ URLs
    /\/v\/([a-zA-Z0-9_-]{11})/, // /v/ URLs
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID itself
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

// Video preview modal — polished YouTube embed viewer
function VideoPreviewModal({
  video,
  onClose,
  onSelect,
  isLoading,
}: {
  video: VideoReferenceStyle
  onClose: () => void
  onSelect?: (video: VideoReferenceStyle) => void
  isLoading?: boolean
}) {
  const videoId = extractYouTubeId(video.videoUrl)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden rounded-2xl border-border/30 shadow-2xl">
        {/* Video embed — flush to top */}
        <div className="aspect-video w-full bg-black relative">
          {videoId ? (
            <iframe
              key={videoId}
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={video.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              className="absolute inset-0 w-full h-full border-0"
              style={{ border: 0 }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center flex-col gap-2">
              <p className="text-white/60">Unable to load video</p>
              {video.videoUrl && (
                <p className="text-white/40 text-xs font-mono max-w-md truncate px-4">
                  URL: {video.videoUrl}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Info section below video */}
        <div className="px-5 pt-4 pb-5 space-y-4">
          {/* Title + description */}
          <DialogHeader className="p-0 space-y-1">
            <DialogTitle className="text-base font-semibold tracking-tight">
              {video.name}
            </DialogTitle>
            {video.description && (
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {video.description}
              </p>
            )}
          </DialogHeader>

          {/* Tags row */}
          {video.videoTags && video.videoTags.length > 0 && (
            <div className="flex gap-1.5 overflow-hidden">
              {video.videoTags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground text-[11px] font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2.5 pt-1">
            {onSelect && (
              <Button
                size="sm"
                onClick={() => {
                  onSelect(video)
                  onClose()
                }}
                disabled={isLoading}
                className="gap-1.5 rounded-full px-4 h-8"
              >
                <Check className="w-3.5 h-3.5" />
                Select this style
              </Button>
            )}
            {video.videoUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(video.videoUrl, '_blank')}
                className="gap-1.5 rounded-full px-3 h-8 text-muted-foreground"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                YouTube
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Individual video card — compact design for 3-column grid
function VideoCard({
  video,
  index,
  isBestMatch,
  onClick,
}: {
  video: VideoReferenceStyle
  index: number
  isBestMatch: boolean
  onClick: () => void
  isLoading?: boolean
}) {
  const videoId = extractYouTubeId(video.videoUrl)
  const thumbnailUrl =
    video.videoThumbnailUrl ||
    video.imageUrl ||
    (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '')

  return (
    <motion.div
      key={video.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        opacity: { duration: 0.2 },
        y: { duration: 0.35, delay: index * 0.08 },
      }}
      className="flex flex-col gap-1.5"
    >
      {/* Thumbnail area */}
      <motion.div
        whileHover={{ scale: 1.03, y: -2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        onClick={onClick}
        className="relative overflow-hidden rounded-2xl cursor-pointer group aspect-video"
      >
        {/* Thumbnail image */}
        <img
          src={thumbnailUrl}
          alt={video.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const img = e.target as HTMLImageElement
            if (videoId && !img.src.includes('hqdefault')) {
              img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            }
          }}
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />

        {/* Play button — hover only */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* Name overlay at bottom — always visible via gradient */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-6">
          <p className="text-white text-xs font-medium truncate">{video.name}</p>
          {video.matchReason && (
            <p className="text-white/70 text-[10px] truncate mt-0.5">{video.matchReason}</p>
          )}
        </div>

        {/* Duration badge */}
        {video.videoDuration && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-black/80 rounded text-[10px] text-white font-medium">
            {video.videoDuration}
          </div>
        )}

        {/* Best match badge */}
        {isBestMatch && (
          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-2 py-0.5 bg-crafted-green rounded-full text-[10px] text-white font-medium">
            <Sparkles className="w-2.5 h-2.5" />
            Best match
          </div>
        )}
      </motion.div>

      {/* Tags below thumbnail — compact, single line with truncation */}
      {video.videoTags && video.videoTags.length > 0 && (
        <div className="flex gap-1 px-0.5 overflow-hidden max-w-full">
          {video.videoTags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-block truncate min-w-0 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] leading-tight"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export function VideoReferenceGrid({
  videos,
  onSelectVideo,
  onShowMore,
  onShowDifferent,
  isLoading,
  title = 'Video Style References',
}: VideoReferenceGridProps) {
  const [fullscreenVideo, setFullscreenVideo] = useState<VideoReferenceStyle | null>(null)

  if (!videos || videos.length === 0) {
    return null
  }

  // Sort by brandMatchScore descending
  const sorted = [...videos].sort((a, b) => (b.brandMatchScore ?? 0) - (a.brandMatchScore ?? 0))
  const displayed = sorted.slice(0, 6)

  // Best match: top-scored card when brandMatchScore >= 70
  const topScore = displayed[0]?.brandMatchScore ?? 0
  const bestMatchId = topScore >= 70 ? displayed[0]?.id : null

  const handleCardClick = (video: VideoReferenceStyle) => {
    setFullscreenVideo(video)
  }

  return (
    <div className="space-y-3">
      {/* Header with discovery buttons inline */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          {onShowMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShowMore}
              disabled={isLoading}
              className="rounded-full gap-1.5 px-3 h-7 text-xs"
            >
              <RefreshCw className="w-3 h-3" />
              More
            </Button>
          )}
          {onShowDifferent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowDifferent}
              disabled={isLoading}
              className="rounded-full gap-1.5 px-3 h-7 text-xs text-muted-foreground"
            >
              <Shuffle className="w-3 h-3" />
              Different
            </Button>
          )}
        </div>
      </div>

      {/* Compact 3-column grid on desktop / horizontal scroll on mobile */}
      <LayoutGroup>
        {/* Mobile: horizontal snap scroll */}
        <div className="flex sm:hidden gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {displayed.map((video, index) => (
            <div key={video.id} className="min-w-[240px] snap-center shrink-0">
              <VideoCard
                video={video}
                index={index}
                isBestMatch={video.id === bestMatchId}
                onClick={() => handleCardClick(video)}
                isLoading={isLoading}
              />
            </div>
          ))}
          <div className="min-w-[32px] shrink-0" aria-hidden />
        </div>

        {/* Desktop: compact 3-column grid */}
        <div className="hidden sm:grid grid-cols-3 gap-3">
          {displayed.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              index={index}
              isBestMatch={video.id === bestMatchId}
              onClick={() => handleCardClick(video)}
              isLoading={isLoading}
            />
          ))}
        </div>
      </LayoutGroup>

      {/* Fullscreen modal — triggered from "Watch fullscreen" inside expanded card */}
      {fullscreenVideo && (
        <VideoPreviewModal
          video={fullscreenVideo}
          onClose={() => setFullscreenVideo(null)}
          onSelect={onSelectVideo}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}
