"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/shared/loading";
import { Send, Coins, Clock, Check, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  styleReferences?: StyleReference[];
  taskProposal?: TaskProposal;
}

interface StyleReference {
  category: string;
  name: string;
  imageUrl: string;
}

interface TaskProposal {
  title: string;
  description: string;
  category: string;
  estimatedHours: number;
  creditsRequired: number;
  deadline?: string;
}

export function ChatInterface() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm here to help you create a design request. What kind of design do you need today? For example, you could say:\n\n- \"I need static ads for a 7-day Instagram campaign\"\n- \"Create a 30-second video ad for our product launch\"\n- \"Design social media content for our new brand\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTask, setPendingTask] = useState<TaskProposal | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedStyles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        styleReferences: data.styleReferences,
        taskProposal: data.taskProposal,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.taskProposal) {
        setPendingTask(data.taskProposal);
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStyleSelect = (styleName: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleName)
        ? prev.filter((s) => s !== styleName)
        : [...prev, styleName]
    );
  };

  const handleConfirmTask = async () => {
    if (!pendingTask) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pendingTask,
          chatHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          })),
          styleReferences: selectedStyles,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create task");
      }

      const data = await response.json();
      toast.success("Task created successfully!");
      router.push(`/dashboard/tasks/${data.taskId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create task");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectTask = () => {
    setPendingTask(null);
    const clarifyMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content:
        "No problem! What would you like to change? I can adjust the scope, timeline, or any other details.",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, clarifyMessage]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Messages */}
      <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
        <div className="space-y-4 pb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-4 py-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {/* Style References */}
                {message.styleReferences && message.styleReferences.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">
                      Select styles you prefer:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {message.styleReferences.map((style) => (
                        <div
                          key={style.name}
                          className={cn(
                            "rounded-lg border-2 p-2 cursor-pointer transition-all",
                            selectedStyles.includes(style.name)
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-transparent bg-background/50 hover:border-muted-foreground/50"
                          )}
                          onClick={() => handleStyleSelect(style.name)}
                        >
                          <div className="aspect-video bg-muted rounded flex items-center justify-center mb-1">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-xs font-medium text-center truncate">
                            {style.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Task Proposal */}
                {message.taskProposal && (
                  <Card className="mt-4 bg-background">
                    <CardContent className="p-4">
                      <h4 className="font-semibold mb-2">Task Summary</h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {message.taskProposal.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Coins className="h-3 w-3" />
                          {message.taskProposal.creditsRequired} credits
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          ~{message.taskProposal.estimatedHours}h
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <p className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3">
                <LoadingSpinner size="sm" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Task Confirmation Bar */}
      {pendingTask && (
        <div className="border-t bg-muted/50 p-4 mb-4 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-medium">Ready to submit this task?</p>
              <p className="text-sm text-muted-foreground">
                {pendingTask.creditsRequired} credits will be deducted from your
                balance
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRejectTask}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Make Changes
              </Button>
              <Button onClick={handleConfirmTask} disabled={isLoading}>
                {isLoading ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Confirm & Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t pt-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Describe your design needs..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[60px] w-[60px]"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
