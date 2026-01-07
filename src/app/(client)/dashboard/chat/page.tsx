"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";
import { getDrafts, deleteDraft, generateDraftId, type ChatDraft } from "@/lib/chat-drafts";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const initializedRef = useRef(false);

  // Initialize drafts directly (only runs once on mount due to lazy initializer)
  const [drafts, setDrafts] = useState<ChatDraft[]>(() => {
    if (typeof window === "undefined") return [];
    return getDrafts();
  });

  // Get current URL params
  const draftParam = searchParams.get("draft");
  const messageParam = searchParams.get("message");

  // Initialize state based on URL
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(() => {
    if (draftParam) return draftParam;
    if (messageParam) return generateDraftId();
    return null;
  });

  const [showDrafts, setShowDrafts] = useState(() => !draftParam && !messageParam);
  const [initialMessage, setInitialMessage] = useState<string | null>(() => messageParam);
  const [isTransitioning, setIsTransitioning] = useState(() => !!draftParam || !!messageParam);

  // Handle URL changes after initial mount using startTransition for non-blocking updates
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return; // Skip first run as state was already initialized
    }

    // URL changed, update state accordingly using startTransition to avoid the sync setState warning
    if (draftParam) {
      startTransition(() => {
        setCurrentDraftId(draftParam);
        setShowDrafts(false);
        setIsTransitioning(true);
      });
    } else if (messageParam) {
      startTransition(() => {
        setInitialMessage(messageParam);
        setIsTransitioning(true);
        const newId = generateDraftId();
        setCurrentDraftId(newId);
        setShowDrafts(false);
      });
    }
  }, [draftParam, messageParam]);

  const handleStartNew = () => {
    const newId = generateDraftId();
    setCurrentDraftId(newId);
    setShowDrafts(false);
  };

  const handleContinueDraft = (draftId: string) => {
    setCurrentDraftId(draftId);
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

  // If no draft is selected and there are drafts, show selection UI
  if (showDrafts && drafts.length > 0 && !currentDraftId) {
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

      <div className={cn(
        "relative z-10",
        isTransitioning ? "flex flex-col px-4 sm:px-8 lg:px-16 pt-8 h-[calc(100vh-4rem)] pb-6" : "p-6 space-y-6 h-full"
      )}>
        {/* Header - only show when not using modern design */}
        {!isTransitioning && (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">New Design Request</h1>
              <p className="text-muted-foreground mt-1">
                Tell us what you need and we&apos;ll help create the perfect brief.
              </p>
            </div>
            {drafts.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentDraftId(null);
                  setShowDrafts(true);
                }}
                className="cursor-pointer"
              >
                <Clock className="h-4 w-4 mr-2" />
                View Drafts ({drafts.length})
              </Button>
            )}
          </div>
        )}

        {/* Horizontal scroll of drafts when in chat mode - only show when not using modern design */}
        {drafts.length > 0 && currentDraftId && !isTransitioning && (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartNew}
                className="shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
              {drafts.slice(0, 5).map((draft) => (
                <Button
                  key={draft.id}
                  variant={draft.id === currentDraftId ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleContinueDraft(draft.id)}
                  className={cn(
                    "shrink-0 max-w-[200px] cursor-pointer",
                    draft.id === currentDraftId
                      ? ""
                      : ""
                  )}
                >
                  <MessageSquare className="h-4 w-4 mr-1 shrink-0" />
                  <span className="truncate">{draft.title}</span>
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        <div className="w-full flex-1 flex flex-col min-h-0">
          <ChatInterface
            draftId={currentDraftId || generateDraftId()}
            onDraftUpdate={handleDraftUpdate}
            initialMessage={initialMessage}
            seamlessTransition={isTransitioning}
          />
        </div>
      </div>
    </div>
  );
}
