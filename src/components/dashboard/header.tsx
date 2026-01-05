"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/shared/user-nav";
import { CreditDisplay } from "@/components/shared/credit-display";

interface HeaderProps {
  onMenuClick?: () => void;
  credits?: number;
}

export function Header({ onMenuClick, credits = 0 }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6"
      style={{ fontFamily: "'Satoshi', sans-serif" }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      <div className="flex flex-1 items-center justify-end gap-4">
        <CreditDisplay credits={credits} />
        <UserNav />
      </div>
    </header>
  );
}
