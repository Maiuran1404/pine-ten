"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";
import { getDrafts, deleteDraft, generateDraftId, type ChatDraft } from "@/lib/chat-drafts";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Trash2, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const initializedRef = useRef(false);

  // Get current URL params
  const draftParam = searchParams.get("draft");
  const messageParam = searchParams.get("message");

  // Initialize drafts directly (only runs once on mount due to lazy initializer)
  const [drafts, setDrafts] = useState<ChatDraft[]>(() => {
    if (typeof window === "undefined") return [];
    return getDrafts();
  });

  // Initialize state based on URL - always generate a draftId to avoid regenerating on every render
  const [currentDraftId, setCurrentDraftId] = useState<string>(() => {
    if (draftParam) return draftParam;
    // Always generate a stable ID upfront
    return generateDraftId();
  });

  // Always use seamless transition (full-width) layout when there are params
  // This prevents the flash of the smaller layout during hydration
  const hasUrlParams = !!draftParam || !!messageParam;
  const [showDrafts, setShowDrafts] = useState(() => !hasUrlParams);
  const [initialMessage, setInitialMessage] = useState<string | null>(() => messageParam);

  // Handle initial mount and URL changes
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;

      // On first mount, handle the messageParam if it exists
      // This is needed because useSearchParams may not be available during SSR
      if (messageParam && !initialMessage) {
        setInitialMessage(messageParam);
      }

      // If no URL params and there are drafts, show draft selection
      // But DON'T check hasUrlParams here because it might be wrong during SSR
      // We'll set this after a small delay to ensure hydration is complete
      return;
    }

    // URL changed, update state accordingly using startTransition to avoid the sync setState warning
    if (draftParam) {
      startTransition(() => {
        setCurrentDraftId(draftParam);
        setShowDrafts(false);
      });
    } else if (messageParam && messageParam !== initialMessage) {
      // Only regenerate draftId if it's a NEW message (URL actually changed)
      startTransition(() => {
        setInitialMessage(messageParam);
        const newId = generateDraftId();
        setCurrentDraftId(newId);
        setShowDrafts(false);
      });
    }
  }, [draftParam, messageParam, hasUrlParams, drafts.length, initialMessage]);

  // Separate effect to handle showing drafts - runs after a delay to ensure URL params are loaded
  useEffect(() => {
    // If we have URL params, never show drafts selection
    if (hasUrlParams) {
      setShowDrafts(false);
      return;
    }

    // Wait for hydration to complete before deciding to show drafts
    const timer = setTimeout(() => {
      if (!draftParam && !messageParam && drafts.length > 0) {
        setShowDrafts(true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [hasUrlParams, draftParam, messageParam, drafts.length]);

  const handleStartNew = () => {
    const newId = generateDraftId();
    setCurrentDraftId(newId);
    setShowDrafts(false);
  };

  const handleContinueDraft = (draftIdToLoad: string) => {
    setCurrentDraftId(draftIdToLoad);
    setShowDrafts(false);
  };

  const handleDeleteDraft = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    deleteDraft(draftId);
    setDrafts(getDrafts());
  };

  const handleDraftUpdate = () => {
    setDrafts(getDrafts());
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // If user wants to see drafts and there are drafts, show selection UI
  if (showDrafts && drafts.length > 0) {
    return (
      <div className="min-h-full bg-background relative overflow-hidden">
        {/* Curtain light effect - only in dark mode */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[600px] pointer-events-none dark:opacity-100 opacity-0"
          style={{
            background: `radial-gradient(ellipse 70% 55% at 50% 0%,
              rgba(13, 148, 136, 0.08) 0%,
              rgba(13, 148, 136, 0.04) 20%,
              rgba(13, 148, 136, 0.02) 40%,
              rgba(13, 148, 136, 0.01) 60%,
              transparent 80%
            )`,
            filter: "blur(40px)",
          }}
        />

        <div className="relative z-10 p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">New Design Request</h1>
              <p className="text-muted-foreground mt-1">
                Continue a previous request or start fresh
              </p>
            </div>
            <Button
              onClick={handleStartNew}
              className="cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start New Request
            </Button>
          </div>

          {/* Recent Drafts */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Continue where you left off
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  onClick={() => handleContinueDraft(draft.id)}
                  className={cn(
                    "group relative rounded-xl overflow-hidden border border-border hover:border-border/80 transition-all cursor-pointer p-4 bg-card",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground truncate">{draft.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(draft.updatedAt)}
                      </p>
                      {draft.pendingTask && (
                        <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                          <Sparkles className="h-3 w-3" />
                          Ready to submit
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                      onClick={(e) => handleDeleteDraft(e, draft.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground line-clamp-2">
                    {draft.messages.filter(m => m.role === "user").slice(-1)[0]?.content || "No messages yet"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show chat interface
  return (
    <div className="min-h-full bg-background relative overflow-hidden">
      {/* Curtain light effect - only in dark mode */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[600px] pointer-events-none dark:opacity-100 opacity-0"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 0%,
            rgba(13, 148, 136, 0.08) 0%,
            rgba(13, 148, 136, 0.04) 20%,
            rgba(13, 148, 136, 0.02) 40%,
            rgba(13, 148, 136, 0.01) 60%,
            transparent 80%
          )`,
          filter: "blur(40px)",
        }}
      />

      {/* Always use seamless full-width layout to prevent flash during navigation */}
      <div className="relative z-10 flex flex-col px-4 sm:px-8 lg:px-16 pt-8 h-[calc(100vh-4rem)] pb-6">
        <div className="w-full flex-1 flex flex-col min-h-0">
          <ChatInterface
            draftId={currentDraftId}
            onDraftUpdate={handleDraftUpdate}
            initialMessage={initialMessage}
            seamlessTransition={true}
          />
        </div>
      </div>
    </div>
  );
}
