"use client";

import { useState } from "react";
import { Check, Play, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface VideoReferenceStyle {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  videoUrl: string;
  videoThumbnailUrl?: string | null;
  videoDuration?: string | null;
  videoTags?: string[];
  deliverableType: string;
  styleAxis: string;
  subStyle?: string | null;
  semanticTags?: string[];
  brandMatchScore?: number;
  matchReason?: string;
  isVideoReference?: boolean;
}

interface VideoReferenceGridProps {
  videos: VideoReferenceStyle[];
  selectedVideos?: string[];
  onSelectVideo?: (video: VideoReferenceStyle) => void;
  onShowMore?: () => void;
  isLoading?: boolean;
  title?: string;
}

// Extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

// Video preview modal with YouTube embed
function VideoPreviewModal({
  video,
  onClose,
}: {
  video: VideoReferenceStyle;
  onClose: () => void;
}) {
  const videoId = extractYouTubeId(video.videoUrl);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-lg font-medium">
            {video.name}
          </DialogTitle>
          {video.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {video.description}
            </p>
          )}
        </DialogHeader>
        <div className="aspect-video w-full bg-black">
          {videoId ? (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={video.name}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-white/60">Unable to load video</p>
            </div>
          )}
        </div>
        <div className="p-4 flex items-center justify-between border-t">
          <div className="flex flex-wrap gap-2">
            {video.videoTags?.slice(0, 5).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(video.videoUrl, "_blank")}
            className="gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open on YouTube
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VideoReferenceGrid({
  videos,
  selectedVideos = [],
  onSelectVideo,
  onShowMore,
  isLoading,
  title = "Video Style References",
}: VideoReferenceGridProps) {
  const [previewVideo, setPreviewVideo] = useState<VideoReferenceStyle | null>(
    null
  );
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);

  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {videos.length > 4 && onShowMore && (
          <button
            onClick={onShowMore}
            className="text-xs text-primary hover:underline"
          >
            View more
          </button>
        )}
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {videos.map((video) => {
          const isSelected = selectedVideos.includes(video.id);
          const isHovered = hoveredVideoId === video.id;
          const videoId = extractYouTubeId(video.videoUrl);
          const thumbnailUrl =
            video.videoThumbnailUrl ||
            video.imageUrl ||
            (videoId
              ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
              : "");

          return (
            <div
              key={video.id}
              className={cn(
                "relative aspect-video rounded-xl overflow-hidden cursor-pointer transition-all duration-200 group",
                isHovered && "scale-105 z-10 shadow-2xl",
                isSelected
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl"
                  : isHovered &&
                      "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
              )}
              onMouseEnter={() => setHoveredVideoId(video.id)}
              onMouseLeave={() => setHoveredVideoId(null)}
              onClick={() => {
                if (onSelectVideo) {
                  onSelectVideo(video);
                } else {
                  setPreviewVideo(video);
                }
              }}
            >
              {/* Thumbnail */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnailUrl}
                alt={video.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to hqdefault if maxres fails
                  const img = e.target as HTMLImageElement;
                  if (videoId && !img.src.includes("hqdefault")) {
                    img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                  }
                }}
              />

              {/* Play button overlay */}
              <div
                className={cn(
                  "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity",
                  isHovered || isSelected
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                )}
              >
                <div
                  className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewVideo(video);
                  }}
                >
                  <Play className="w-7 h-7 text-black fill-black ml-1" />
                </div>
              </div>

              {/* Duration badge */}
              {video.videoDuration && (
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-[10px] text-white font-medium">
                  {video.videoDuration}
                </div>
              )}

              {/* Name overlay on hover */}
              {(isHovered || isSelected) && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                  <p className="text-white text-sm font-medium truncate">
                    {video.name}
                  </p>
                  {video.matchReason && (
                    <p className="text-white/70 text-xs truncate">
                      {video.matchReason}
                    </p>
                  )}
                </div>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              )}

              {/* Tags - show on hover */}
              {isHovered && video.videoTags && video.videoTags.length > 0 && (
                <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[80%]">
                  {video.videoTags.slice(0, 2).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 bg-black/60 text-white border-0"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground text-center">
        Click to preview • These videos show the style direction for your
        project
      </p>

      {/* Video preview modal */}
      {previewVideo && (
        <VideoPreviewModal
          video={previewVideo}
          onClose={() => setPreviewVideo(null)}
        />
      )}
    </div>
  );
}
