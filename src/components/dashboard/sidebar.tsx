"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FolderOpen,
  CreditCard,
  Settings,
  Palette,
  X,
  Sparkles,
  ChevronsLeft,
  ChevronsRight,
  Clock,
} from "lucide-react";

const navigation = [
  {
    name: "Home",
    href: "/dashboard",
    icon: Sparkles,
    highlight: true,
  },
  {
    name: "My Tasks",
    href: "/dashboard/tasks",
    icon: FolderOpen,
  },
  {
    name: "My Brand",
    href: "/dashboard/brand",
    icon: Palette,
  },
  {
    name: "Credits",
    href: "/dashboard/credits",
    icon: CreditCard,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  recentTasks?: Array<{ id: string; title: string }>;
}

export function Sidebar({ open, onClose, collapsed = false, onToggleCollapse, recentTasks = [] }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform bg-background border-r transition-all duration-300 ease-in-out lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-16" : "w-64"
        )}
        style={{ fontFamily: "'Satoshi', sans-serif" }}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className={cn(
            "flex h-16 items-center border-b transition-all duration-300",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}>
            <div className="flex items-center gap-2">
              {/* Collapse Toggle - Desktop only */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex h-8 w-8"
                onClick={onToggleCollapse}
              >
                {collapsed ? (
                  <ChevronsRight className="h-4 w-4" />
                ) : (
                  <ChevronsLeft className="h-4 w-4" />
                )}
              </Button>
              {!collapsed && <Logo href="/dashboard" />}
            </div>
            {collapsed ? (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white font-bold text-sm cursor-pointer"
                style={{ background: "linear-gradient(135deg, #14b8a6 0%, #3b82f6 50%, #4338ca 100%)" }}
                onClick={onToggleCollapse}
              >
                C
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-4")}>
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const isHighlight = 'highlight' in item && item.highlight;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  title={collapsed ? item.name : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200",
                    collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                    isActive
                      ? "bg-foreground text-background"
                      : isHighlight
                        ? "text-foreground hover:bg-foreground/5"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isHighlight && !isActive && "text-[#14b8a6]"
                  )} />
                  {!collapsed && item.name}
                </Link>
              );
            })}

            {/* Recents Section */}
            {!collapsed && recentTasks.length > 0 && (
              <div className="pt-6">
                <div className="px-3 pb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Recents
                  </p>
                </div>
                <div className="space-y-1">
                  {recentTasks.slice(0, 5).map((task) => (
                    <Link
                      key={task.id}
                      href={`/dashboard/tasks/${task.id}`}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{task.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* Footer */}
          {!collapsed && (
            <div className="p-4 border-t">
              <div className="px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Need help?
                </p>
                <a
                  href="#"
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Contact support
                </a>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
