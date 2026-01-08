"use client";

import React, { useRef, useEffect, useId } from 'react';
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame
} from "framer-motion";
import { cn } from '@/lib/utils';

/**
 * Helper component for the SVG grid pattern.
 */
const GridPattern = ({ offsetX, offsetY, size, patternId }: { offsetX: any; offsetY: any; size: number; patternId: string }) => {
  return (
    <svg className="w-full h-full">
      <defs>
        <motion.pattern
          id={patternId}
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d={`M ${size} 0 L 0 0 0 ${size}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-muted-foreground"
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
};

interface InfiniteGridProps {
  /** Grid cell size in pixels */
  gridSize?: number;
  /** Animation speed for X axis */
  speedX?: number;
  /** Animation speed for Y axis */
  speedY?: number;
  /** Radius of the mouse spotlight effect */
  spotlightRadius?: number;
  /** Opacity of the background grid (0-1) */
  backgroundOpacity?: number;
  /** Opacity of the highlighted grid (0-1) */
  highlightOpacity?: number;
  /** Whether to show decorative blur spheres */
  showBlurSpheres?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Children to render on top of the grid */
  children?: React.ReactNode;
}

/**
 * The Infinite Grid Component
 * Displays a scrolling background grid that reveals an active layer on mouse hover.
 */
export const InfiniteGrid = ({
  gridSize = 40,
  speedX = 0.5,
  speedY = 0.5,
  spotlightRadius = 300,
  backgroundOpacity = 0.05,
  highlightOpacity = 0.4,
  showBlurSpheres = true,
  className,
  children,
}: InfiniteGridProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const patternId = useId();
  const bgPatternId = `bg-${patternId}`;
  const hlPatternId = `hl-${patternId}`;

  // Track mouse position with Motion Values for performance (avoids React re-renders)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Use window-level mouse tracking since the grid has pointer-events-none
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Grid offsets for infinite scroll animation
  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  useAnimationFrame(() => {
    const currentX = gridOffsetX.get();
    const currentY = gridOffsetY.get();
    // Reset offset at pattern width to simulate infinity
    gridOffsetX.set((currentX + speedX) % gridSize);
    gridOffsetY.set((currentY + speedY) % gridSize);
  });

  // Create a dynamic radial mask for the "flashlight" effect
  const maskImage = useMotionTemplate`radial-gradient(${spotlightRadius}px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none z-0",
        className
      )}
    >
      {/* Layer 1: Subtle background grid (always visible) */}
      <div
        className="absolute inset-0"
        style={{ opacity: backgroundOpacity }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} size={gridSize} patternId={bgPatternId} />
      </div>

      {/* Layer 2: Highlighted grid (revealed by mouse mask) */}
      <motion.div
        className="absolute inset-0"
        style={{
          maskImage,
          WebkitMaskImage: maskImage,
          opacity: highlightOpacity
        }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} size={gridSize} patternId={hlPatternId} />
      </motion.div>

      {/* Decorative Blur Spheres */}
      {showBlurSpheres && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute right-[-20%] top-[-20%] w-[40%] h-[40%] rounded-full bg-orange-500/40 dark:bg-orange-600/20 blur-[120px]" />
          <div className="absolute right-[10%] top-[-10%] w-[20%] h-[20%] rounded-full bg-primary/30 blur-[100px]" />
          <div className="absolute left-[-10%] bottom-[-20%] w-[40%] h-[40%] rounded-full bg-blue-500/40 dark:bg-blue-600/20 blur-[120px]" />
        </div>
      )}

      {/* Children content */}
      {children && (
        <div className="relative z-10 w-full h-full">
          {children}
        </div>
      )}
    </div>
  );
};

export default InfiniteGrid;
