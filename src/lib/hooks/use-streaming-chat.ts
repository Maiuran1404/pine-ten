"use client";

import { useState, useCallback, useRef } from "react";

interface StreamingChatOptions {
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useStreamingChat(options: StreamingChatOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamChat = useCallback(
    async (messages: Message[]) => {
      // Cancel any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsStreaming(true);
      setStreamedContent("");

      let fullText = "";

      try {
        const response = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.error) {
                  throw new Error(data.error);
                }

                if (data.done) {
                  break;
                }

                if (data.text) {
                  fullText += data.text;
                  setStreamedContent(fullText);
                  options.onToken?.(data.text);
                }
              } catch (parseError) {
                // Skip malformed JSON
                console.debug("Parse error:", parseError);
              }
            }
          }
        }

        options.onComplete?.(fullText);
        return fullText;
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return fullText;
        }
        options.onError?.(error as Error);
        throw error;
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [options]
  );

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return {
    streamChat,
    cancelStream,
    isStreaming,
    streamedContent,
  };
}
