"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { CreditsPurchaseDialog } from "./credits-purchase-dialog";

interface HeaderProps {
  credits?: number;
  onMenuClick?: () => void;
}

export function Header({ credits = 0, onMenuClick }: HeaderProps) {
  const [showCreditsDialog, setShowCreditsDialog] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 px-4 sm:px-6 bg-background/60 backdrop-blur-xl after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-border/20 after:to-transparent"
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

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            size="sm"
            onClick={() => setShowCreditsDialog(true)}
            className="h-9 px-4 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Upgrade
          </Button>
        </div>
      </header>

      <CreditsPurchaseDialog
        open={showCreditsDialog}
        onOpenChange={setShowCreditsDialog}
        currentCredits={credits}
      />
    </>
  );
}
