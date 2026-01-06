"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  quality?: number;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
  showSkeleton?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Optimized image component with loading states and error handling
 * Uses Next.js Image with sensible defaults for performance
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className,
  containerClassName,
  quality = 85,
  placeholder,
  blurDataURL,
  sizes,
  onLoad,
  onError,
  showSkeleton = true,
  fallback,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // Default sizes for responsive images
  const defaultSizes = fill
    ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    : undefined;

  if (hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          fill && "absolute inset-0",
          containerClassName
        )}
        style={!fill ? { width, height } : undefined}
      >
        {fallback || (
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">Failed to load</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative", containerClassName)}>
      {showSkeleton && isLoading && (
        <Skeleton
          className={cn(
            "absolute inset-0",
            fill ? "w-full h-full" : undefined
          )}
          style={!fill ? { width, height } : undefined}
        />
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        priority={priority}
        quality={quality}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        sizes={sizes || defaultSizes}
        className={cn(
          isLoading && "opacity-0",
          "transition-opacity duration-300",
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

/**
 * Avatar image with fallback initials
 */
interface AvatarImageProps {
  src?: string | null;
  alt: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const avatarSizes = {
  sm: { width: 32, height: 32, text: "text-xs" },
  md: { width: 40, height: 40, text: "text-sm" },
  lg: { width: 64, height: 64, text: "text-lg" },
  xl: { width: 96, height: 96, text: "text-xl" },
};

export function AvatarImage({
  src,
  alt,
  name,
  size = "md",
  className,
}: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);
  const { width, height, text } = avatarSizes[size];

  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-primary/10 text-primary font-medium",
          text,
          className
        )}
        style={{ width, height }}
      >
        {initials || alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className={cn("relative rounded-full overflow-hidden", className)}
      style={{ width, height }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

/**
 * Thumbnail image for galleries/grids
 */
interface ThumbnailProps {
  src: string;
  alt: string;
  aspectRatio?: "square" | "video" | "portrait";
  className?: string;
  onClick?: () => void;
}

const aspectRatioClasses = {
  square: "aspect-square",
  video: "aspect-video",
  portrait: "aspect-[3/4]",
};

export function Thumbnail({
  src,
  alt,
  aspectRatio = "square",
  className,
  onClick,
}: ThumbnailProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted",
        aspectRatioClasses[aspectRatio],
        onClick && "cursor-pointer hover:opacity-90 transition-opacity",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, 25vw"
      />
    </div>
  );
}
