"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { FullPageLoader } from "@/components/shared/loading";
import { ClientBrandOnboarding } from "@/components/onboarding/client-brand-onboarding";
import { FreelancerOnboarding } from "@/components/onboarding/freelancer-onboarding";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const roleSetRef = useRef(false);

  // Derive type from URL params (no useState needed)
  const type = useMemo(() => {
    const typeParam = searchParams.get("type");
    return typeParam === "freelancer" ? "freelancer" : "client";
  }, [searchParams]);

  // Handle redirects: not logged in or already onboarded
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
      return;
    }

    // Redirect to dashboard if already completed onboarding (defense in depth)
    const user = session?.user as { onboardingCompleted?: boolean; role?: string } | undefined;
    if (user?.onboardingCompleted) {
      if (user.role === "FREELANCER") {
        router.push("/portal");
      } else {
        router.push("/dashboard");
      }
    }
  }, [session, isPending, router]);

  // Set role for freelancer (only once)
  useEffect(() => {
    if (type === "freelancer" && !roleSetRef.current) {
      roleSetRef.current = true;
      // Set the role to FREELANCER immediately when landing on freelancer onboarding
      // This ensures the user appears in the Artists section even if they don't complete onboarding
      fetch("/api/auth/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "FREELANCER" }),
      }).catch(() => {
        // Ignore errors - onboarding completion will also set the role
      });
    }
  }, [type]);

  if (isPending) {
    return <FullPageLoader />;
  }

  if (!session) {
    return null;
  }

  const handleComplete = () => {
    if (type === "freelancer") {
      router.push("/portal");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-3xl">
        {type === "freelancer" ? (
          <FreelancerOnboarding onComplete={handleComplete} />
        ) : (
          <ClientBrandOnboarding onComplete={handleComplete} />
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <OnboardingContent />
    </Suspense>
  );
}
