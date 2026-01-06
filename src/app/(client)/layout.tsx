"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { FullPageLoader } from "@/components/shared/loading";
import { useSession } from "@/lib/auth-client";
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
  const { data: session, isPending } = useSession();
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);

  // Redirect to login if not authenticated (after session check completes)
  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [session, isPending, router]);

  // Redirect to onboarding if not completed
  useEffect(() => {
    if (!isPending && session?.user) {
      const user = session.user as { onboardingCompleted?: boolean };
      if (!user.onboardingCompleted) {
        router.replace("/onboarding");
      }
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

  // Show loading while checking session
  if (isPending) {
    return <FullPageLoader />;
  }

  // Don't render anything if not authenticated (redirect will happen)
  if (!session) {
    return <FullPageLoader />;
  }

  // Don't render if onboarding not completed (redirect will happen)
  const user = session.user as { onboardingCompleted?: boolean; credits?: number };
  if (!user.onboardingCompleted) {
    return <FullPageLoader />;
  }

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
