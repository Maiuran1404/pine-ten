"use client";

import { useState, useEffect } from "react";
import { ChatInterface } from "@/components/chat/chat-interface";
import { getDrafts, deleteDraft, generateDraftId, type ChatDraft } from "@/lib/chat-drafts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const [drafts, setDrafts] = useState<ChatDraft[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [showDrafts, setShowDrafts] = useState(true);

  useEffect(() => {
    // Load drafts on mount
    setDrafts(getDrafts());
  }, []);

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
    // Refresh drafts list when a draft is updated
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">New Design Request</h1>
            <p className="text-muted-foreground">
              Continue a previous request or start fresh
            </p>
          </div>
          <Button onClick={handleStartNew} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Start New Request
          </Button>
        </div>

        {/* Recent Drafts */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Continue where you left off
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft) => (
              <Card
                key={draft.id}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary hover:shadow-md group"
                )}
                onClick={() => handleContinueDraft(draft.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium truncate">{draft.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(draft.updatedAt)}
                      </p>
                      {draft.pendingTask && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          Ready to submit
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={(e) => handleDeleteDraft(e, draft.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground line-clamp-2">
                    {draft.messages.filter(m => m.role === "user").slice(-1)[0]?.content || "No messages yet"}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show chat interface
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Design Request</h1>
          <p className="text-muted-foreground">
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

      {/* Horizontal scroll of drafts when in chat mode */}
      {drafts.length > 0 && currentDraftId && (
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
                className="shrink-0 max-w-[200px] cursor-pointer"
              >
                <MessageSquare className="h-4 w-4 mr-1 shrink-0" />
                <span className="truncate">{draft.title}</span>
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <ChatInterface
        draftId={currentDraftId || generateDraftId()}
        onDraftUpdate={handleDraftUpdate}
      />
    </div>
  );
}
