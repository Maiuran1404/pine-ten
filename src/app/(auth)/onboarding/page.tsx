"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { FullPageLoader } from "@/components/shared/loading";
import { ClientBrandOnboarding } from "@/components/onboarding/client-brand-onboarding";
import { FreelancerOnboarding } from "@/components/onboarding/freelancer-onboarding";

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const [type, setType] = useState<"client" | "freelancer">("client");

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }

    // Check URL param for type
    const typeParam = searchParams.get("type");
    if (typeParam === "freelancer") {
      setType("freelancer");
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
  }, [session, isPending, router, searchParams]);

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
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
