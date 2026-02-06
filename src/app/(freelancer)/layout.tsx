"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FreelancerSidebar } from "@/components/freelancer/sidebar";
import { Header } from "@/components/dashboard/header";
import { FullPageLoader } from "@/components/shared/loading";
import { useSession } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import type { FreelancerStatus } from "@/types";

/** UI state that extends FreelancerStatus with loading states */
export type FreelancerProfileState = FreelancerStatus | "NOT_FOUND" | null;

export default function FreelancerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileStatus, setProfileStatus] = useState<FreelancerProfileState>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  // Set page title for artist portal
  useEffect(() => {
    document.title = "Artist";
  }, []);

  // Fetch profile status to determine if artist is under review
  useEffect(() => {
    const fetchProfileStatus = async () => {
      try {
        const res = await fetch("/api/freelancer/profile");
        if (res.ok) {
          const data = await res.json();
          setProfileStatus(data.status);
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to fetch profile status");
      } finally {
        setIsStatusLoading(false);
      }
    };

    if (session) {
      fetchProfileStatus();
    }
  }, [session]);

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

  if (isPending || isStatusLoading) {
    return <FullPageLoader />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <FreelancerSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        profileStatus={profileStatus}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} basePath="/portal" showUpgrade={false} />
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
