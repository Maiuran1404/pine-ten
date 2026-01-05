"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface HeaderProps {
  credits?: number;
}

export function Header({ credits = 0 }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 px-4 sm:px-6 bg-[#0a0a0a]/70 backdrop-blur-xl border-b border-white/[0.06]"
      style={{ fontFamily: "'Satoshi', sans-serif" }}
    >
      <SidebarTrigger className="md:hidden" />

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
