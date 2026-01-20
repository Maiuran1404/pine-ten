"use client";

import { useState, ReactNode } from "react";
import { motion } from "framer-motion";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { type ChatStage, type MoodboardItem } from "./types";
import { TopProgressBar } from "./progress-stepper";
import { MoodboardPanel } from "./moodboard/moodboard-panel";

interface ChatLayoutProps {
  children: ReactNode;
  // Progress stepper props
  currentStage: ChatStage;
  completedStages: ChatStage[];
  progressPercentage: number;
  // Moodboard props
  moodboardItems: MoodboardItem[];
  onRemoveMoodboardItem: (id: string) => void;
  onClearMoodboard?: () => void;
  // Optional customization
  showProgress?: boolean;
  showMoodboard?: boolean;
  className?: string;
}

export function ChatLayout({
  children,
  currentStage,
  completedStages,
  progressPercentage,
  moodboardItems,
  onRemoveMoodboardItem,
  onClearMoodboard,
  showProgress = true,
  showMoodboard = true,
  className,
}: ChatLayoutProps) {
  const [isMoodboardOpen, setIsMoodboardOpen] = useState(false);

  return (
    <div className={cn("flex flex-col h-full relative", className)}>
      {/* Top Progress Bar - Subtle, takes minimal space */}
      {showProgress && (
        <TopProgressBar
          currentStage={currentStage}
          completedStages={completedStages}
          progressPercentage={progressPercentage}
        />
      )}

      {/* Main Content Area - Chat + Moodboard */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Center - Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Mobile Header with Moodboard Toggle */}
          <div className="lg:hidden shrink-0 px-4 py-2 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-end">
            {/* Mobile Moodboard Toggle */}
            {showMoodboard && (
              <Sheet open={isMoodboardOpen} onOpenChange={setIsMoodboardOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                  >
                    <Palette className="h-4 w-4" />
                    <span className="text-xs">
                      {moodboardItems.length > 0 ? moodboardItems.length : ""}
                    </span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-0">
                  <MoodboardPanel
                    items={moodboardItems}
                    onRemoveItem={onRemoveMoodboardItem}
                    onClearAll={onClearMoodboard}
                  />
                </SheetContent>
              </Sheet>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-h-0">{children}</div>
        </div>

        {/* Right Panel - Moodboard (Desktop) */}
        {showMoodboard && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="hidden lg:flex w-80 xl:w-96 shrink-0 border-l border-border"
          >
            <MoodboardPanel
              items={moodboardItems}
              onRemoveItem={onRemoveMoodboardItem}
              onClearAll={onClearMoodboard}
              className="w-full"
            />
          </motion.div>
        )}

        {/* Tablet Moodboard - Bottom Drawer Toggle */}
        {showMoodboard && (
          <div className="hidden md:flex lg:hidden fixed bottom-4 right-4 z-50">
            <Sheet open={isMoodboardOpen} onOpenChange={setIsMoodboardOpen}>
              <SheetTrigger asChild>
                <Button
                  size="lg"
                  className="rounded-full shadow-lg gap-2"
                >
                  <Palette className="h-5 w-5" />
                  Moodboard
                  {moodboardItems.length > 0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-primary-foreground/20 text-xs">
                      {moodboardItems.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[60vh] p-0 rounded-t-xl">
                <MoodboardPanel
                  items={moodboardItems}
                  onRemoveItem={onRemoveMoodboardItem}
                  onClearAll={onClearMoodboard}
                />
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simple two-column layout variant (no progress stepper)
 */
interface SimpleChatLayoutProps {
  children: ReactNode;
  moodboardItems: MoodboardItem[];
  onRemoveMoodboardItem: (id: string) => void;
  onClearMoodboard?: () => void;
  showMoodboard?: boolean;
  className?: string;
}

export function SimpleChatLayout({
  children,
  moodboardItems,
  onRemoveMoodboardItem,
  onClearMoodboard,
  showMoodboard = true,
  className,
}: SimpleChatLayoutProps) {
  const [isMoodboardOpen, setIsMoodboardOpen] = useState(false);

  return (
    <div className={cn("flex h-full relative", className)}>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">{children}</div>

      {/* Moodboard Panel (Desktop) */}
      {showMoodboard && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="hidden lg:flex w-80 xl:w-96 shrink-0 border-l border-border"
        >
          <MoodboardPanel
            items={moodboardItems}
            onRemoveItem={onRemoveMoodboardItem}
            onClearAll={onClearMoodboard}
            className="w-full"
          />
        </motion.div>
      )}

      {/* Mobile/Tablet Moodboard Toggle */}
      {showMoodboard && (
        <div className="lg:hidden fixed bottom-20 right-4 z-50">
          <Sheet open={isMoodboardOpen} onOpenChange={setIsMoodboardOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                className="rounded-full shadow-lg h-12 w-12"
              >
                <Palette className="h-5 w-5" />
                {moodboardItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary-foreground text-primary text-xs flex items-center justify-center font-medium">
                    {moodboardItems.length}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <MoodboardPanel
                items={moodboardItems}
                onRemoveItem={onRemoveMoodboardItem}
                onClearAll={onClearMoodboard}
              />
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}
