"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface TypingTextProps {
  content: string;
  /** Speed in milliseconds per word */
  speed?: number;
  /** Whether to animate or show instantly */
  animate?: boolean;
  /** Callback when typing animation completes */
  onComplete?: () => void;
  /** Callback when a list item option is clicked */
  onOptionClick?: (option: string) => void;
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
  onOptionClick,
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

  // Custom renderer for list items to make them clickable
  const handleListItemClick = useCallback((text: string) => {
    if (onOptionClick && isComplete) {
      onOptionClick(text);
    }
  }, [onOptionClick, isComplete]);

  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          // Custom list rendering - make items clickable when onOptionClick is provided
          ul: ({ children }) => (
            <ul className={cn(
              "space-y-2 my-3",
              onOptionClick && isComplete && "list-none pl-0"
            )}>
              {children}
            </ul>
          ),
          li: ({ children }) => {
            // Extract text content from children
            const textContent = extractTextFromChildren(children);

            if (onOptionClick && isComplete) {
              return (
                <li className="list-none">
                  <button
                    onClick={() => handleListItemClick(textContent)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-xl",
                      "bg-muted/50 hover:bg-muted",
                      "border border-border/50 hover:border-primary/30",
                      "transition-all duration-200",
                      "text-sm text-foreground",
                      "flex items-center gap-2",
                      "hover:shadow-sm",
                      "cursor-pointer"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                    <span>{textContent}</span>
                  </button>
                </li>
              );
            }

            return <li className="text-sm text-foreground">{children}</li>;
          },
        }}
      >
        {displayedContent}
      </ReactMarkdown>
      {/* Blinking cursor while typing */}
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 bg-foreground/70 ml-0.5 animate-pulse" />
      )}
    </div>
  );
}

// Helper function to extract text from React children
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === "string") {
    return children;
  }
  if (typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join("");
  }
  if (children && typeof children === "object") {
    // Check if it's a React element with props
    const element = children as { props?: { children?: React.ReactNode } };
    if (element.props && "children" in element.props) {
      return extractTextFromChildren(element.props.children);
    }
  }
  return "";
}
