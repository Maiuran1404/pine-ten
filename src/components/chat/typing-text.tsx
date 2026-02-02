"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TypingTextProps {
  content: string;
  /** Speed in milliseconds per word */
  speed?: number;
  /** Whether to animate or show instantly */
  animate?: boolean;
  /** Callback when typing animation completes */
  onComplete?: () => void;
  /** Callback when a list item option is clicked (single option) */
  onOptionClick?: (option: string) => void;
  /** Callback when multiple options are confirmed */
  onOptionsConfirm?: (options: string[]) => void;
  /** Enable multi-select mode for list options */
  multiSelect?: boolean;
  /** Custom className for the container */
  className?: string;
}

/**
 * Capitalizes the first letter of a string.
 * Handles leading whitespace and markdown formatting.
 */
function capitalizeFirstLetter(text: string): string {
  if (!text) return text;

  // Find the first actual letter (skip whitespace, markdown symbols like *, _, etc.)
  const match = text.match(/^([\s*_~`]*)(.)(.*)$/s);
  if (match) {
    const [, prefix, firstChar, rest] = match;
    return prefix + firstChar.toUpperCase() + rest;
  }

  return text;
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
  onOptionsConfirm,
  multiSelect = false,
  className,
}: TypingTextProps) {
  // Simply capitalize the first letter of the content
  const processedContent = capitalizeFirstLetter(content.trim());

  const [displayedContent, setDisplayedContent] = useState(
    animate ? "" : processedContent
  );
  const [isComplete, setIsComplete] = useState(!animate);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const animationRef = useRef<number | null>(null);
  const wordIndexRef = useRef(0);

  useEffect(() => {
    // If not animating, show full content immediately
    if (!animate) {
      setDisplayedContent(processedContent);
      setIsComplete(true);
      return;
    }

    // Reset state when content changes
    setDisplayedContent("");
    setIsComplete(false);
    wordIndexRef.current = 0;
    setSelectedOptions([]);

    // Split content into words while preserving whitespace and newlines
    const words = processedContent.split(/(\s+)/);

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
  }, [content, animate, speed, onComplete, processedContent]);

  // Handle option click for list items
  const handleListItemClick = useCallback(
    (text: string) => {
      if (!isComplete) return;

      if (multiSelect) {
        // Toggle selection
        setSelectedOptions((prev) =>
          prev.includes(text) ? prev.filter((o) => o !== text) : [...prev, text]
        );
      } else if (onOptionClick) {
        onOptionClick(text);
      }
    },
    [onOptionClick, isComplete, multiSelect]
  );

  // Handle confirm for multi-select
  const handleConfirm = useCallback(() => {
    if (selectedOptions.length > 0) {
      if (onOptionsConfirm) {
        onOptionsConfirm(selectedOptions);
      } else if (onOptionClick) {
        // Fallback: send as comma-separated string
        const combinedResponse =
          selectedOptions.length === 1
            ? selectedOptions[0]
            : selectedOptions.join(", ");
        onOptionClick(combinedResponse);
      }
      setSelectedOptions([]);
    }
  }, [selectedOptions, onOptionClick, onOptionsConfirm]);

  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          // Custom list rendering - make items clickable when onOptionClick is provided
          ul: ({ children }) => (
            <ul
              className={cn(
                "space-y-2 my-3 list-none pl-0",
                onOptionClick && isComplete && "list-none pl-0"
              )}
            >
              {children}
            </ul>
          ),
          li: ({ children }) => {
            // Extract text content from children
            const textContent = extractTextFromChildren(children);
            const isSelected = selectedOptions.includes(textContent);

            if (onOptionClick && isComplete) {
              return (
                <li className="list-none">
                  <button
                    onClick={() => handleListItemClick(textContent)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-xl",
                      "border transition-all duration-200",
                      "text-sm",
                      "flex items-center gap-2",
                      "cursor-pointer",
                      multiSelect && isSelected
                        ? "bg-primary/10 border-primary text-foreground"
                        : "bg-muted/50 hover:bg-muted border-border/50 hover:border-primary/30 text-foreground hover:shadow-sm"
                    )}
                  >
                    {multiSelect ? (
                      <span
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                          isSelected
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {isSelected && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                    )}
                    <span>{textContent}</span>
                  </button>
                </li>
              );
            }

            return (
              <li className="text-sm text-foreground list-none">{children}</li>
            );
          },
        }}
      >
        {displayedContent}
      </ReactMarkdown>

      {/* Confirm button for multi-select */}
      {multiSelect && selectedOptions.length > 0 && isComplete && (
        <div className="flex justify-end mt-3">
          <Button onClick={handleConfirm} size="sm" className="gap-2">
            Continue with {selectedOptions.length} selected
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

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
