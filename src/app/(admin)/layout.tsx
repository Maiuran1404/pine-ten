"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Header } from "@/components/dashboard/header";
import { FullPageLoader } from "@/components/shared/loading";
import { useSession } from "@/lib/auth-client";
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
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);

  // Set page title for admin portal
  useEffect(() => {
    document.title = "Superadmin";
  }, []);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
    // Check if user is an admin
    if (session?.user) {
      const user = session.user as { role?: string };
      if (user.role !== "ADMIN") {
        router.push("/dashboard");
      }
    }
  }, [session, isPending, router]);

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
      className="bg-background"
      style={
        {
          fontFamily: "'Satoshi', sans-serif",
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3rem",
        } as React.CSSProperties
      }
    >
      <AdminSidebar recentTasks={recentTasks} />
      <SidebarInset className="bg-[#0a0a0a]">
        <Header />
        <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
