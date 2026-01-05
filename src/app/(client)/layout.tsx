"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { FullPageLoader } from "@/components/shared/loading";
import { useSession } from "@/lib/auth-client";

interface Task {
  id: string;
  title: string;
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);

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
      fetch("/api/tasks?limit=5")
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

  const user = session.user as { credits?: number };

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Satoshi', sans-serif" }}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        recentTasks={recentTasks}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          credits={user.credits || 0}
        />
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
