"use client";

import { useState } from "react";
import { Bell, CheckCheck, Trash2, MessageCircle, CheckCircle2, UserPlus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useNotifications, type Notification } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface NotificationBellProps {
  className?: string;
  basePath?: string; // Base path for task links (e.g., "/portal" for freelancers, "/dashboard" for clients)
}

const notificationIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  task_completed: CheckCircle2,
  task_update: RefreshCw,
  new_message: MessageCircle,
  task_assigned: UserPlus,
};

const notificationColors: Record<string, string> = {
  task_completed: "text-green-500",
  task_update: "text-blue-500",
  new_message: "text-primary",
  task_assigned: "text-amber-500",
};

/**
 * Notification bell with dropdown showing recent notifications
 */
export function NotificationBell({ className, basePath = "/dashboard" }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    isConnected,
    unreadCount,
    clearNotifications,
    markAsRead,
  } = useNotifications({
    enabled: true,
    showToasts: true,
    basePath,
  });

  const handleNotificationClick = (notification: Notification) => {
    // Don't dismiss task assignment notifications — they should persist until acknowledged
    const persistentTypes = ["TASK_ASSIGNED", "TASK_OFFERED"];
    if (notification.taskId && !persistentTypes.includes(notification.type)) {
      markAsRead(notification.taskId);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("relative", className)}
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          {!isConnected && (
            <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="font-semibold">Notifications</h4>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearNotifications}
              className="h-8 px-2 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {isConnected ? "You're all caught up!" : "Connecting..."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification, index) => {
                const Icon = notificationIcons[notification.type] || Bell;
                const iconColor = notificationColors[notification.type] || "text-muted-foreground";

                return (
                  <div
                    key={`${notification.taskId}-${index}`}
                    className="px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    {notification.taskId ? (
                      <Link
                        href={`${basePath}/tasks/${notification.taskId}`}
                        onClick={() => handleNotificationClick(notification)}
                        className="flex gap-3"
                      >
                        <div className={cn("flex-shrink-0 mt-0.5", iconColor)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">
                            {notification.message}
                          </p>
                          {notification.title && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {notification.title}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex gap-3">
                        <div className={cn("flex-shrink-0 mt-0.5", iconColor)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="border-t px-4 py-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  isConnected ? "bg-green-500" : "bg-red-500"
                )}
              />
              {isConnected ? "Connected" : "Disconnected"}
            </span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNotifications}
                className="h-6 px-2 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
