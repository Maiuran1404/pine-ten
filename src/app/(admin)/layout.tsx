"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Header } from "@/components/dashboard/header";
import { FullPageLoader } from "@/components/shared/loading";
import { useSession } from "@/lib/auth-client";
import { useSubdomain } from "@/hooks/use-subdomain";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface Task {
  id: string;
  title: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const portal = useSubdomain();
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);

  // Set page title for admin portal
  useEffect(() => {
    document.title = "Superadmin";
  }, []);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
    // Wait for subdomain detection to complete before checking
    if (!portal.isHydrated) {
      return;
    }
    // Check if user is an admin AND on the correct subdomain
    if (session?.user) {
      const user = session.user as { role?: string };

      // Must have ADMIN role first
      if (user.role !== "ADMIN") {
        router.push("/dashboard");
        return;
      }

      // Must be on superadmin subdomain to access admin pages (both dev and prod)
      // This means localhost:3000/admin and app.localhost:3000/admin will redirect to /dashboard
      // Only superadmin.localhost:3000/admin will work
      if (portal.type !== "superadmin") {
        router.push("/dashboard");
      }
    }
  }, [session, isPending, router, portal.type, portal.isHydrated]);

  // Fetch recent tasks for sidebar
  useEffect(() => {
    if (session) {
      fetch("/api/admin/tasks?limit=5")
        .then((res) => res.json())
        .then((data) => {
          if (data.tasks) {
            setRecentTasks(data.tasks.map((t: { id: string; title: string }) => ({ id: t.id, title: t.title })));
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

  return (
    <SidebarProvider
      defaultOpen={true}
      className="bg-background outline-none focus:outline-none"
      style={
        {
          fontFamily: "'Satoshi', sans-serif",
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3rem",
        } as React.CSSProperties
      }
    >
      <AdminSidebar recentTasks={recentTasks} />
      <SidebarInset className="bg-background outline-none focus:outline-none">
        <Header />
        <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 outline-none focus:outline-none">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
