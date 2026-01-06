"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { FullPageLoader } from "@/components/shared/loading";
import { useSession, signOut } from "@/lib/auth-client";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface Task {
  id: string;
  title: string;
  status?: string;
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending, error } = useSession();
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear stale session and redirect to login
  const clearSessionAndRedirect = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // If signOut fails, manually clear cookies by making a request
      // This handles corrupted session state
    }
    router.push("/login");
  }, [router]);

  // Add a loading timeout to detect stuck states - call redirect directly instead of setting state
  useEffect(() => {
    if (isPending) {
      timeoutRef.current = setTimeout(() => {
        console.warn("Session loading stuck, clearing session");
        clearSessionAndRedirect();
      }, 5000); // 5 second timeout
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, [isPending, clearSessionAndRedirect]);

  // Handle session errors
  useEffect(() => {
    if (error) {
      console.warn("Session error, clearing session:", error);
      clearSessionAndRedirect();
    }
  }, [error, clearSessionAndRedirect]);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
    // Redirect to onboarding if not completed
    if (session?.user && !(session.user as { onboardingCompleted?: boolean }).onboardingCompleted) {
      router.push("/onboarding");
    }
  }, [session, isPending, router]);

  // Fetch recent tasks for sidebar
  useEffect(() => {
    if (session) {
      fetch("/api/tasks?limit=10")
        .then((res) => res.json())
        .then((data) => {
          if (data.tasks) {
            setRecentTasks(data.tasks.map((t: { id: string; title: string; status: string }) => ({
              id: t.id,
              title: t.title,
              status: t.status,
            })));
          }
        })
        .catch(console.error);
    }
  }, [session]);

  if (isPending) {
    return <FullPageLoader />;
  }

  if (!session) {
    return null;
  }

  const user = session.user as { credits?: number };

  return (
    <SidebarProvider
      defaultOpen={true}
      className="bg-background"
      style={
        {
          fontFamily: "'Satoshi', sans-serif",
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar recentTasks={recentTasks} />
      <SidebarInset className="bg-background">
        <Header credits={user.credits || 0} />
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
