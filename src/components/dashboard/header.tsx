"use client";

import Link from "next/link";
import { Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/shared/user-nav";

interface HeaderProps {
  onMenuClick?: () => void;
  credits?: number;
}

export function Header({ onMenuClick, credits = 0 }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 bg-[#0a0a0a] px-4 sm:px-6"
      style={{ fontFamily: "'Satoshi', sans-serif" }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden text-[#6b6b6b] hover:text-white hover:bg-[#1a1a1f]"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <Link href="/dashboard/billing">
          <Button
            size="sm"
            className="h-9 px-4 rounded-lg border border-[#2a2a30]/60 bg-[#1a1a1f] hover:bg-[#252528] text-white gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Upgrade
          </Button>
        </Link>
      </div>
    </header>
  );
}
