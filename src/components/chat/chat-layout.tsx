"use client";

import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { type ChatStage, type MoodboardItem } from "./types";
import { type LiveBrief } from "./brief-panel/types";
import { TopProgressBar } from "./progress-stepper";
import { MoodboardPanel } from "./moodboard/moodboard-panel";
import { BriefPanel } from "./brief-panel";

type RightPanelTab = "brief" | "moodboard";

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
  // Brief props
  brief?: LiveBrief | null;
  onBriefUpdate?: (brief: LiveBrief) => void;
  onExportBrief?: () => void;
  briefCompletion?: number;
  // Optional customization
  showProgress?: boolean;
  showMoodboard?: boolean;
  showBrief?: boolean;
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
  brief,
  onBriefUpdate,
  onExportBrief,
  briefCompletion = 0,
  showProgress = true,
  showMoodboard = true,
  showBrief = true,
  className,
}: ChatLayoutProps) {
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<RightPanelTab>("brief");
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  const showRightPanel = showMoodboard || showBrief;

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

      {/* Main Content Area - Chat + Right Panel */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Center - Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Mobile Header with Panel Toggle */}
          <div className="lg:hidden shrink-0 px-4 py-2 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-end gap-2">
            {showRightPanel && (
              <Sheet
                open={isMobileSheetOpen}
                onOpenChange={setIsMobileSheetOpen}
              >
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    {activeTab === "brief" ? (
                      <>
                        <FileText className="h-4 w-4" />
                        <span className="text-xs">{briefCompletion}%</span>
                      </>
                    ) : (
                      <>
                        <Palette className="h-4 w-4" />
                        <span className="text-xs">
                          {moodboardItems.length > 0
                            ? moodboardItems.length
                            : ""}
                        </span>
                      </>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 p-0">
                  <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as RightPanelTab)}
                    className="h-full flex flex-col"
                  >
                    <TabsList className="shrink-0 grid grid-cols-2 m-2">
                      <TabsTrigger value="brief" className="text-xs gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        Brief
                      </TabsTrigger>
                      <TabsTrigger
                        value="moodboard"
                        className="text-xs gap-1.5"
                      >
                        <Palette className="h-3.5 w-3.5" />
                        Moodboard
                        {moodboardItems.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">
                            {moodboardItems.length}
                          </span>
                        )}
                      </TabsTrigger>
                    </TabsList>
                    <div className="flex-1 min-h-0">
                      <TabsContent value="brief" className="h-full mt-0">
                        {brief && onBriefUpdate ? (
                          <BriefPanel
                            brief={brief}
                            onBriefUpdate={onBriefUpdate}
                            onExportBrief={onExportBrief}
                          />
                        ) : (
                          <div className="p-4 text-center text-muted-foreground text-sm">
                            Brief will appear as you chat
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="moodboard" className="h-full mt-0">
                        <MoodboardPanel
                          items={moodboardItems}
                          onRemoveItem={onRemoveMoodboardItem}
                          onClearAll={onClearMoodboard}
                        />
                      </TabsContent>
                    </div>
                  </Tabs>
                </SheetContent>
              </Sheet>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-h-0">{children}</div>
        </div>

        {/* Right Panel - Tabbed Brief/Moodboard (Desktop) */}
        {showRightPanel && (
          <AnimatePresence mode="wait">
            {isRightPanelCollapsed ? (
              <motion.div
                key="collapsed"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 48, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="hidden lg:flex flex-col items-center py-4 gap-3 bg-card border-l border-border h-full"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsRightPanelCollapsed(false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex flex-col items-center gap-3">
                  {showBrief && (
                    <button
                      onClick={() => {
                        setActiveTab("brief");
                        setIsRightPanelCollapsed(false);
                      }}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        activeTab === "brief"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  )}
                  {showMoodboard && (
                    <button
                      onClick={() => {
                        setActiveTab("moodboard");
                        setIsRightPanelCollapsed(false);
                      }}
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative",
                        activeTab === "moodboard"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Palette className="h-4 w-4" />
                      {moodboardItems.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-medium">
                          {moodboardItems.length}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="expanded"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="hidden lg:flex flex-col shrink-0 border-l border-border/50 bg-muted/30 backdrop-blur-sm h-full"
              >
                {/* Minimal Tab Header */}
                <div className="shrink-0 flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    {showBrief && (
                      <button
                        onClick={() => setActiveTab("brief")}
                        className={cn(
                          "text-xs font-medium transition-colors",
                          activeTab === "brief"
                            ? "text-foreground"
                            : "text-muted-foreground/50 hover:text-muted-foreground"
                        )}
                      >
                        Brief
                      </button>
                    )}
                    {showBrief && showMoodboard && (
                      <span className="text-muted-foreground/30">·</span>
                    )}
                    {showMoodboard && (
                      <button
                        onClick={() => setActiveTab("moodboard")}
                        className={cn(
                          "text-xs font-medium transition-colors flex items-center gap-1",
                          activeTab === "moodboard"
                            ? "text-foreground"
                            : "text-muted-foreground/50 hover:text-muted-foreground"
                        )}
                      >
                        Moodboard
                        {moodboardItems.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            ({moodboardItems.length})
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground/50 hover:text-muted-foreground"
                    onClick={() => setIsRightPanelCollapsed(true)}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 min-h-0 overflow-hidden">
                  <AnimatePresence mode="wait">
                    {activeTab === "brief" && showBrief && (
                      <motion.div
                        key="brief-panel"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="h-full"
                      >
                        {brief && onBriefUpdate ? (
                          <BriefPanel
                            brief={brief}
                            onBriefUpdate={onBriefUpdate}
                            onExportBrief={onExportBrief}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                            <p className="text-xs text-muted-foreground/50">
                              Brief builds as you chat
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                    {activeTab === "moodboard" && showMoodboard && (
                      <motion.div
                        key="moodboard-panel"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.15 }}
                        className="h-full"
                      >
                        <MoodboardPanel
                          items={moodboardItems}
                          onRemoveItem={onRemoveMoodboardItem}
                          onClearAll={onClearMoodboard}
                          className="w-full h-full"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Tablet Panel - Bottom Drawer Toggle */}
        {showRightPanel && (
          <div className="hidden md:flex lg:hidden fixed bottom-4 right-4 z-50 gap-2">
            <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
              <SheetTrigger asChild>
                <Button size="lg" className="rounded-full shadow-lg gap-2">
                  {activeTab === "brief" ? (
                    <>
                      <FileText className="h-5 w-5" />
                      Brief
                      {briefCompletion > 0 && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-primary-foreground/20 text-xs">
                          {briefCompletion}%
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Palette className="h-5 w-5" />
                      Moodboard
                      {moodboardItems.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-primary-foreground/20 text-xs">
                          {moodboardItems.length}
                        </span>
                      )}
                    </>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh] p-0 rounded-t-xl">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as RightPanelTab)}
                  className="h-full flex flex-col"
                >
                  <TabsList className="shrink-0 grid grid-cols-2 mx-4 mt-4">
                    {showBrief && (
                      <TabsTrigger value="brief" className="gap-1.5">
                        <FileText className="h-4 w-4" />
                        Brief
                      </TabsTrigger>
                    )}
                    {showMoodboard && (
                      <TabsTrigger value="moodboard" className="gap-1.5">
                        <Palette className="h-4 w-4" />
                        Moodboard
                      </TabsTrigger>
                    )}
                  </TabsList>
                  <div className="flex-1 min-h-0 mt-2">
                    <TabsContent value="brief" className="h-full mt-0">
                      {brief && onBriefUpdate ? (
                        <BriefPanel
                          brief={brief}
                          onBriefUpdate={onBriefUpdate}
                          onExportBrief={onExportBrief}
                        />
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          Brief will appear as you chat
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="moodboard" className="h-full mt-0">
                      <MoodboardPanel
                        items={moodboardItems}
                        onRemoveItem={onRemoveMoodboardItem}
                        onClearAll={onClearMoodboard}
                      />
                    </TabsContent>
                  </div>
                </Tabs>
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
              <Button size="icon" className="rounded-full shadow-lg h-12 w-12">
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
