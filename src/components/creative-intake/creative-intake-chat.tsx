"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCreativeIntake } from "@/lib/hooks/use-creative-intake";
import type { IntakeData, ServiceType, IntakeMessage } from "@/lib/creative-intake/types";
import { SERVICE_DEFINITIONS } from "@/lib/creative-intake/types";

import { ServiceSelector } from "./service-selector";
import { GroupedQuestionCard, QuickOptions } from "./grouped-question-card";
import { IntakeSummaryCard, IntakeProgress } from "./intake-summary";

interface CreativeIntakeChatProps {
  onComplete?: (data: IntakeData) => void;
  onCancel?: () => void;
  className?: string;
}

export function CreativeIntakeChat({
  onComplete,
  onCancel,
  className,
}: CreativeIntakeChatProps) {
  const {
    state,
    isLoading,
    error,
    selectService,
    sendMessage,
    submitGroupedAnswers,
    submitQuickOption,
    confirmSummary,
    editSummaryField,
    reset,
    currentStep,
    progress,
  } = useCreativeIntake({ onComplete });

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  // Focus input when stage changes
  useEffect(() => {
    if (state.stage !== "service_select" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.stage]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const serviceDefinition = state.serviceType
    ? SERVICE_DEFINITIONS[state.serviceType]
    : null;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {state.serviceType && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h2 className="font-medium text-foreground">
                {state.serviceType
                  ? serviceDefinition?.label
                  : "What do you need?"}
              </h2>
              {state.serviceType && (
                <p className="text-xs text-muted-foreground">
                  {state.stage === "complete"
                    ? "Complete"
                    : `Step ${Math.ceil(progress / 25)} of ${serviceDefinition?.estimatedQuestions || 4}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state.serviceType && state.stage !== "complete" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Start over
              </Button>
            )}
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {state.serviceType && state.stage !== "complete" && (
          <div className="mt-3">
            <IntakeProgress
              serviceType={state.serviceType}
              currentStep={Math.ceil(progress / 25)}
              totalSteps={serviceDefinition?.estimatedQuestions || 4}
            />
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Service selection */}
        {state.stage === "service_select" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-center space-y-2 mb-6">
              <h3 className="text-lg font-medium">
                What can we help you create?
              </h3>
              <p className="text-sm text-muted-foreground">
                Select a service to get started. We'll ask a few quick questions.
              </p>
            </div>
            <ServiceSelector onSelect={selectService} />
          </motion.div>
        )}

        {/* Chat messages */}
        <AnimatePresence mode="popLayout">
          {state.messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onGroupedSubmit={submitGroupedAnswers}
              onQuickSelect={submitQuickOption}
              onSummaryConfirm={confirmSummary}
              onSummaryEdit={editSummaryField}
              isLoading={isLoading}
            />
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </motion.div>
        )}

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        {/* Completion message */}
        {state.stage === "complete" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8 space-y-4"
          >
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-3xl">✓</span>
            </div>
            <div>
              <h3 className="text-lg font-medium">Brief submitted</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We'll start working on your {serviceDefinition?.label.toLowerCase()} right away.
              </p>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area (only show for open questions) */}
      {state.stage !== "service_select" &&
        state.stage !== "complete" &&
        !hasInteractiveElement(state.messages[state.messages.length - 1]) && (
          <div className="shrink-0 border-t border-border p-4">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your response..."
                disabled={isLoading}
                className="min-h-[44px] max-h-[120px] resize-none"
                rows={1}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
                className="shrink-0 h-[44px] w-[44px]"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
    </div>
  );
}

// Helper to check if message has interactive elements
function hasInteractiveElement(message?: IntakeMessage): boolean {
  if (!message) return false;
  return !!(
    message.groupedQuestions?.length ||
    message.quickOptions?.length ||
    message.summary
  );
}

// Message bubble component
interface MessageBubbleProps {
  message: IntakeMessage;
  onGroupedSubmit: (answers: Record<string, string | string[]>) => void;
  onQuickSelect: (value: string) => void;
  onSummaryConfirm: () => void;
  onSummaryEdit: (field: string, value: string | string[]) => void;
  isLoading: boolean;
}

function MessageBubble({
  message,
  onGroupedSubmit,
  onQuickSelect,
  onSummaryConfirm,
  onSummaryEdit,
  isLoading,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] space-y-3",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Message text */}
        {message.content && (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5",
              isUser
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            )}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {/* Grouped questions */}
        {message.groupedQuestions && message.groupedQuestions.length > 0 && (
          <GroupedQuestionCard
            questions={message.groupedQuestions}
            onSubmit={onGroupedSubmit}
            disabled={isLoading}
          />
        )}

        {/* Quick options */}
        {message.quickOptions && message.quickOptions.length > 0 && (
          <QuickOptions
            options={message.quickOptions.map((opt) => ({
              label: opt.label,
              value: opt.value,
              recommended: opt.variant === "recommended",
            }))}
            onSelect={onQuickSelect}
            disabled={isLoading}
          />
        )}

        {/* Summary */}
        {message.summary && (
          <IntakeSummaryCard
            summary={message.summary}
            onConfirm={onSummaryConfirm}
            onEdit={onSummaryEdit}
            disabled={isLoading}
          />
        )}
      </div>
    </motion.div>
  );
}

export default CreativeIntakeChat;
