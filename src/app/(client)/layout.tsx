"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { FullPageLoader } from "@/components/shared/loading";
import { useSession } from "@/lib/auth-client";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { InfiniteGrid } from "@/components/ui/infinite-grid-integration";

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

  // Redirect based on auth state and role
  useEffect(() => {
    if (isPending) return;

    // Not authenticated - redirect to login
    if (!session) {
      router.replace("/login");
      return;
    }

    const user = session.user as { role?: string; onboardingCompleted?: boolean };

    // Redirect non-CLIENT users to their appropriate portal
    if (user.role === "ADMIN") {
      router.replace("/admin");
      return;
    }
    if (user.role === "FREELANCER") {
      router.replace("/portal");
      return;
    }

    // Check onboarding for clients
    if (!user.onboardingCompleted) {
      router.replace("/onboarding");
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

  // Don't render if user is not a CLIENT (redirect will happen)
  const user = session.user as { role?: string; onboardingCompleted?: boolean; credits?: number };
  if (user.role === "ADMIN" || user.role === "FREELANCER") {
    return <FullPageLoader />;
  }

  // Don't render if onboarding not completed (redirect will happen)
  if (!user.onboardingCompleted) {
    return <FullPageLoader />;
  }

  return (
    <SidebarProvider
      defaultOpen={true}
      className=""
      style={
        {
          fontFamily: "'Satoshi', sans-serif",
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar recentTasks={recentTasks} />
      <SidebarInset className="bg-transparent">
        {/* Infinite Grid Background - covers entire viewport */}
        <InfiniteGrid
          gridSize={50}
          speedX={0.3}
          speedY={0.3}
          spotlightRadius={250}
          backgroundOpacity={0.03}
          highlightOpacity={0.15}
          showBlurSpheres={true}
          className="!fixed inset-0"
        />
        <Header credits={user.credits || 0} />
        <main className="relative z-10 flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
