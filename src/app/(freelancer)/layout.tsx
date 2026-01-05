"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FreelancerSidebar } from "@/components/freelancer/sidebar";
import { Header } from "@/components/dashboard/header";
import { FullPageLoader } from "@/components/shared/loading";
import { useSession } from "@/lib/auth-client";

export default function FreelancerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Set page title for artist portal
  useEffect(() => {
    document.title = "Artist Portal | Crafted";
  }, []);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
    // Check if user is a freelancer
    if (session?.user) {
      const user = session.user as { role?: string };
      if (user.role !== "FREELANCER" && user.role !== "ADMIN") {
        router.push("/dashboard");
      }
    }
  }, [session, isPending, router]);

  if (isPending) {
    return <FullPageLoader />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <FreelancerSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
