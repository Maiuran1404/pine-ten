"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  FolderOpen,
  CheckCircle,
  Settings,
  X,
  Lock,
} from "lucide-react";
import type { FreelancerStatus } from "@/app/(freelancer)/layout";

const navigation = [
  {
    name: "Dashboard",
    href: "/portal",
    icon: LayoutDashboard,
    requiresApproval: false,
  },
  {
    name: "Available Tasks",
    href: "/portal/available",
    icon: FolderOpen,
    requiresApproval: true,
  },
  {
    name: "My Tasks",
    href: "/portal/tasks",
    icon: CheckCircle,
    requiresApproval: true,
  },
  {
    name: "Settings",
    href: "/portal/settings",
    icon: Settings,
    requiresApproval: false,
  },
];

interface FreelancerSidebarProps {
  open?: boolean;
  onClose?: () => void;
  profileStatus?: FreelancerStatus;
}

export function FreelancerSidebar({ open, onClose, profileStatus }: FreelancerSidebarProps) {
  const pathname = usePathname();

  // Determine if navigation should be restricted (artist not approved)
  const isRestricted = profileStatus === "PENDING" || profileStatus === "NOT_FOUND";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-background border-r transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-4 border-b">
            <Logo href="/portal" name="Artist" />
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onClose}
              aria-label="Close navigation menu"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            <TooltipProvider>
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const isDisabled = isRestricted && item.requiresApproval;

                if (isDisabled) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                            "text-muted-foreground/50 cursor-not-allowed"
                          )}
                        >
                          <item.icon className="h-5 w-5" aria-hidden="true" />
                          {item.name}
                          <Lock className="h-3.5 w-3.5 ml-auto" aria-hidden="true" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Available after profile approval</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                    {item.name}
                  </Link>
                );
              })}
            </TooltipProvider>
          </nav>
        </div>
      </aside>
    </>
  );
}
