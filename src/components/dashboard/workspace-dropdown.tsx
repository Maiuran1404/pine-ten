"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronDown,
  Settings,
  UserPlus,
  Zap,
  Check,
  Plus,
  Globe,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceDropdownProps {
  companyName: string | null;
  primaryColor: string;
  credits?: number;
  maxCredits?: number;
  memberCount?: number;
  plan?: string;
  isCollapsed?: boolean;
}

export function WorkspaceDropdown({
  companyName,
  primaryColor,
  credits = 0,
  maxCredits = 10,
  memberCount = 1,
  plan = "Free Plan",
  isCollapsed = false,
}: WorkspaceDropdownProps) {
  const [open, setOpen] = useState(false);

  const displayName = companyName || "My Company";
  const initial = displayName.charAt(0).toUpperCase();
  const creditPercentage = Math.min((credits / maxCredits) * 100, 100);

  const trigger = (
    <button
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border/50 hover:bg-sidebar-accent/50 transition-colors w-full",
        isCollapsed ? "p-2 justify-center" : "p-2 pr-3"
      )}
    >
      {/* Avatar */}
      <div
        className="flex items-center justify-center size-8 rounded-lg text-white text-sm font-semibold flex-shrink-0"
        style={{ backgroundColor: primaryColor }}
      >
        {initial}
      </div>

      {!isCollapsed && (
        <>
          {/* Company Name */}
          <span className="flex-1 text-left font-medium text-sm truncate">
            {displayName}
          </span>
          {/* Chevron */}
          <ChevronDown className="size-4 text-muted-foreground flex-shrink-0" />
        </>
      )}
    </button>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      {isCollapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              {trigger}
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            {displayName}
          </TooltipContent>
        </Tooltip>
      ) : (
        <DropdownMenuTrigger asChild>
          {trigger}
        </DropdownMenuTrigger>
      )}

      <DropdownMenuContent
        side="bottom"
        align="start"
        className="w-[280px] p-0"
        sideOffset={8}
      >
        {/* Workspace Header */}
        <div className="p-3">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center size-12 rounded-xl text-white text-lg font-semibold flex-shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                {plan} &bull; {memberCount} {memberCount === 1 ? "member" : "members"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5"
              asChild
            >
              <Link href="/dashboard/settings">
                <Settings className="size-3.5" />
                Settings
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1.5"
              disabled
            >
              <UserPlus className="size-3.5" />
              Invite members
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator className="my-0" />

        {/* Upgrade Card */}
        <div className="p-3">
          <div className="rounded-lg bg-sidebar-accent/50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-amber-500" />
                <span className="font-medium text-sm">Turn Pro</span>
              </div>
              <Button size="sm" className="h-7 text-xs px-3">
                Upgrade
              </Button>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="my-0" />

        {/* Credits Section */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">Credits</span>
            <Link
              href="/dashboard/credits"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {credits} left
              <ChevronRight className="size-3" />
            </Link>
          </div>
          <Progress
            value={creditPercentage}
            className="h-1.5 bg-primary/20 [&>*]:bg-gradient-to-r [&>*]:from-blue-500 [&>*]:to-purple-500"
          />
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-muted-foreground/50" />
            Daily credits reset at midnight UTC
          </p>
        </div>

        <DropdownMenuSeparator className="my-0" />

        {/* All Workspaces */}
        <div className="p-2">
          <p className="text-xs text-muted-foreground px-2 py-1.5 uppercase tracking-wider font-medium">
            All workspaces
          </p>

          {/* Current workspace */}
          <button className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-sidebar-accent/50 transition-colors">
            <div
              className="flex items-center justify-center size-8 rounded-lg text-white text-sm font-semibold flex-shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              {initial}
            </div>
            <span className="flex-1 text-left text-sm font-medium truncate">
              {displayName}
            </span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {plan.split(" ")[0]}
            </span>
            <Check className="size-4 text-foreground" />
          </button>
        </div>

        <DropdownMenuSeparator className="my-0" />

        {/* Create/Find Workspaces */}
        <div className="p-2">
          <button
            className="flex items-center gap-3 w-full px-2 py-2 rounded-md hover:bg-sidebar-accent/50 transition-colors text-muted-foreground hover:text-foreground"
            disabled
          >
            <div className="flex items-center justify-center size-8 rounded-lg border border-dashed border-border">
              <Plus className="size-4" />
            </div>
            <span className="text-sm">Create new workspace</span>
          </button>
          <button
            className="flex items-center gap-3 w-full px-2 py-2 rounded-md hover:bg-sidebar-accent/50 transition-colors text-muted-foreground hover:text-foreground"
            disabled
          >
            <div className="flex items-center justify-center size-8 rounded-lg border border-border">
              <Globe className="size-4" />
            </div>
            <span className="text-sm">Find workspaces</span>
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
