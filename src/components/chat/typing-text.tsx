"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface TypingTextProps {
  content: string;
  /** Speed in milliseconds per word */
  speed?: number;
  /** Whether to animate or show instantly */
  animate?: boolean;
  /** Callback when typing animation completes */
  onComplete?: () => void;
  /** Custom className for the container */
  className?: string;
}

/**
 * A component that renders text with a typing animation effect.
 * Reveals text word-by-word to create a ChatGPT-like experience.
 */
export function TypingText({
  content,
  speed = 30,
  animate = true,
  onComplete,
  className,
}: TypingTextProps) {
  const [displayedContent, setDisplayedContent] = useState(animate ? "" : content);
  const [isComplete, setIsComplete] = useState(!animate);
  const animationRef = useRef<number | null>(null);
  const wordIndexRef = useRef(0);

  useEffect(() => {
    // If not animating, show full content immediately
    if (!animate) {
      setDisplayedContent(content);
      setIsComplete(true);
      return;
    }

    // Reset state when content changes
    setDisplayedContent("");
    setIsComplete(false);
    wordIndexRef.current = 0;

    // Split content into words while preserving whitespace and newlines
    const words = content.split(/(\s+)/);

    const animateWords = () => {
      if (wordIndexRef.current < words.length) {
        // Add next word
        setDisplayedContent((prev) => prev + words[wordIndexRef.current]);
        wordIndexRef.current++;

        // Schedule next word
        animationRef.current = window.setTimeout(animateWords, speed);
      } else {
        // Animation complete
        setIsComplete(true);
        onComplete?.();
      }
    };

    // Start animation after a brief delay
    animationRef.current = window.setTimeout(animateWords, 100);

    // Cleanup
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [content, animate, speed, onComplete]);

  return (
    <div className={className}>
      <ReactMarkdown>{displayedContent}</ReactMarkdown>
      {/* Blinking cursor while typing */}
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 bg-foreground/70 ml-0.5 animate-pulse" />
      )}
    </div>
  );
}
