"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/shared/notification-bell";
import { CreditPurchaseDialog } from "@/components/shared/credit-purchase-dialog";
import { useCredits } from "@/providers/credit-provider";

interface HeaderProps {
  onMenuClick?: () => void;
  basePath?: string; // Base path for notifications (e.g., "/portal" for freelancers)
  showUpgrade?: boolean; // Whether to show the upgrade button
}

export function Header({ onMenuClick, basePath = "/dashboard", showUpgrade = true }: HeaderProps) {
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);
  const { credits } = useCredits();

  return (
    <>
      <header
        className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 px-4 sm:px-6 bg-background/30 backdrop-blur-2xl after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-border/10 after:to-transparent"
        style={{ fontFamily: "'Satoshi', sans-serif" }}
      >
        {onMenuClick ? (
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </Button>
        ) : (
          <SidebarTrigger className="md:hidden" />
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell basePath={basePath} />
          <ThemeToggle />
          {showUpgrade && (
            <Button
              size="sm"
              onClick={() => setShowCreditsDialog(true)}
              className="h-9 px-4 rounded-lg border border-border bg-white/80 dark:bg-card/60 hover:bg-white dark:hover:bg-card/80 text-foreground gap-2 shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Add credits</span>
            </Button>
          )}
        </div>
      </header>

      <CreditPurchaseDialog
        open={showCreditsDialog}
        onOpenChange={setShowCreditsDialog}
        currentCredits={credits}
      />
    </>
  );
}
