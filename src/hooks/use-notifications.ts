"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";

export interface Notification {
  type: "task_update" | "new_message" | "task_assigned" | "task_completed" | "connected" | "heartbeat";
  taskId?: string;
  title?: string;
  message?: string;
  timestamp: string;
}

interface UseNotificationsOptions {
  enabled?: boolean;
  showToasts?: boolean;
  basePath?: string; // Base path for task links (e.g., "/portal" for freelancers, "/dashboard" for clients)
  onNotification?: (notification: Notification) => void;
}

/**
 * Hook for real-time notifications via Server-Sent Events
 *
 * @example
 * const { notifications, isConnected, clearNotifications } = useNotifications({
 *   showToasts: true,
 *   onNotification: (n) => console.log('New notification:', n)
 * });
 */
export function useNotifications({
  enabled = true,
  showToasts = true,
  basePath = "/dashboard",
  onNotification,
}: UseNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current) return;

    try {
      const eventSource = new EventSource("/api/notifications/stream");
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const notification: Notification = JSON.parse(event.data);

          // Ignore heartbeat messages
          if (notification.type === "heartbeat") return;

          // Handle connection confirmation
          if (notification.type === "connected") {
            return;
          }

          // Add to notifications list
          setNotifications((prev) => [notification, ...prev].slice(0, 50));

          // Show toast notification
          const messageText = typeof notification.message === "string" ? notification.message : String(notification.message || "");
          const titleText = typeof notification.title === "string" ? notification.title : String(notification.title || "");
          if (showToasts && messageText) {
            const toastOptions = {
              description: titleText || undefined,
              action: notification.taskId
                ? {
                    label: "View",
                    onClick: () => {
                      window.location.href = `${basePath}/tasks/${notification.taskId}`;
                    },
                  }
                : undefined,
            };

            switch (notification.type) {
              case "task_completed":
                toast.success(messageText, toastOptions);
                break;
              case "task_assigned":
                toast.info(messageText, toastOptions);
                break;
              case "new_message":
                toast(messageText, toastOptions);
                break;
              default:
                toast(messageText, toastOptions);
            }
          }

          // Call custom handler
          onNotification?.(notification);
        } catch (error) {
          console.error("Error parsing notification:", error);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;

        // Exponential backoff for reconnection
        const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current++;

        setConnectionError(`Connection lost. Reconnecting in ${backoff / 1000}s...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoff);
      };
    } catch (error) {
      setConnectionError("Failed to connect to notification stream");
      console.error("SSE connection error:", error);
    }
  }, [enabled, showToasts, onNotification]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAsRead = useCallback((taskId: string) => {
    setNotifications((prev) =>
      prev.filter((n) => n.taskId !== taskId)
    );
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    notifications,
    isConnected,
    connectionError,
    clearNotifications,
    markAsRead,
    unreadCount: notifications.filter(n => n.type !== "connected" && n.type !== "heartbeat").length,
  };
}
