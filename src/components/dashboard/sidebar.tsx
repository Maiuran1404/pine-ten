"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  PanelLeft,
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

// Logo Icon Component
function LogoIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M6 12C6 8.68629 8.68629 6 12 6C13.5217 6 14.911 6.55301 16 7.46793V7C16 6.44772 16.4477 6 17 6C17.5523 6 18 6.44772 18 7V10C18 10.5523 17.5523 11 17 11H14C13.4477 11 13 10.5523 13 10C13 9.44772 13.4477 9 14 9H14.7639C14.0883 8.38625 13.1894 8 12.2 8C9.88041 8 8 9.88041 8 12.2C8 14.5196 9.88041 16.4 12.2 16.4C13.8484 16.4 15.2727 15.4988 16.0018 14.1644C16.2608 13.6906 16.8518 13.5144 17.3256 13.7735C17.7994 14.0325 17.9756 14.6235 17.7165 15.0973C16.6929 16.9709 14.6021 18.2 12.2 18.2C8.77583 18.2 6 15.4242 6 12Z"
        fill="white"
      />
    </svg>
  );
}

export function Sidebar({ open, onClose, collapsed = false, onToggleCollapse, recentTasks = [] }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform bg-[#0a0a0a] transition-all duration-300 ease-in-out lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-16" : "w-64"
        )}
        style={{ fontFamily: "'Satoshi', sans-serif" }}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className={cn(
            "flex h-16 items-center transition-all duration-300",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}>
            <div className="flex items-center gap-3">
              {/* Collapse Toggle - Desktop only */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex h-8 w-8 text-[#6b6b6b] hover:text-white hover:bg-[#1a1a1f]"
                onClick={onToggleCollapse}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </div>
            {collapsed ? (
              <button
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1a1f] border border-[#2a2a30]/50"
                onClick={onToggleCollapse}
              >
                <LogoIcon />
              </button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-[#6b6b6b] hover:text-white hover:bg-[#1a1a1f]"
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
                      ? "bg-[#1a1a1f] text-white"
                      : "text-[#6b6b6b] hover:bg-[#1a1a1f]/50 hover:text-white"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isHighlight && !isActive && "text-emerald-500"
                  )} />
                  {!collapsed && item.name}
                </Link>
              );
            })}

            {/* Recents Section */}
            {!collapsed && recentTasks.length > 0 && (
              <div className="pt-6">
                <div className="px-3 pb-2">
                  <p className="text-xs font-medium text-[#4a4a4a] uppercase tracking-wider">
                    Recents
                  </p>
                </div>
                <div className="space-y-1">
                  {recentTasks.slice(0, 5).map((task) => (
                    <Link
                      key={task.id}
                      href={`/dashboard/tasks/${task.id}`}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#6b6b6b] hover:bg-[#1a1a1f]/50 hover:text-white transition-colors"
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
            <div className="p-4">
              <div className="px-3 py-2">
                <p className="text-xs text-[#4a4a4a]">
                  Need help?
                </p>
                <a
                  href="#"
                  className="text-xs text-[#6b6b6b] hover:text-white underline underline-offset-4 transition-colors"
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
