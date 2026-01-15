"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { FullPageLoader } from "@/components/shared/loading";
import { useSession } from "@/lib/auth-client";
import { useSubdomain } from "@/hooks/use-subdomain";
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
  const portal = useSubdomain();
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);

  // Redirect based on auth state and role
  useEffect(() => {
    if (isPending) return;

    // Not authenticated - redirect to login
    if (!session) {
      router.replace("/login");
      return;
    }

    // Wait for subdomain detection
    if (!portal.isHydrated) return;

    const user = session.user as { role?: string; onboardingCompleted?: boolean };

    // Only redirect based on role in development (localhost)
    // In production, users should stay on their subdomain's dashboard
    const isLocalhost = typeof window !== "undefined" && window.location.hostname.includes("localhost");

    if (isLocalhost) {
      // In development, redirect non-CLIENT users to their appropriate portal
      if (user.role === "ADMIN") {
        router.replace("/admin");
        return;
      }
      if (user.role === "FREELANCER") {
        router.replace("/portal");
        return;
      }
    }
    // In production on app subdomain, allow any role to use the dashboard
    // (ADMIN users who log in here stay here, they should use superadmin subdomain for admin access)

    // Check onboarding for clients
    if (user.role === "CLIENT" && !user.onboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [session, isPending, router, portal.isHydrated]);

  // Function to fetch tasks
  const fetchTasks = () => {
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
  };

  // Fetch recent tasks for sidebar
  useEffect(() => {
    if (session) {
      fetchTasks();
    }
  }, [session]);

  // Listen for tasks-updated event to refresh sidebar
  useEffect(() => {
    const handleTasksUpdated = () => {
      fetchTasks();
    };

    window.addEventListener("tasks-updated", handleTasksUpdated);
    return () => {
      window.removeEventListener("tasks-updated", handleTasksUpdated);
    };
  }, []);

  // Show loading while checking session
  if (isPending) {
    return <FullPageLoader />;
  }

  // Don't render anything if not authenticated (redirect will happen)
  if (!session) {
    return <FullPageLoader />;
  }

  const user = session.user as { role?: string; onboardingCompleted?: boolean; credits?: number };

  // In development, don't render if user is not a CLIENT (redirect will happen)
  const isLocalhost = typeof window !== "undefined" && window.location.hostname.includes("localhost");
  if (isLocalhost && (user.role === "ADMIN" || user.role === "FREELANCER")) {
    return <FullPageLoader />;
  }

  // Don't render if onboarding not completed for clients (redirect will happen)
  if (user.role === "CLIENT" && !user.onboardingCompleted) {
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
