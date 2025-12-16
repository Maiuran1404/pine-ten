"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { FullPageLoader } from "@/components/shared/loading";
import { ClientOnboarding } from "@/components/onboarding/client-onboarding";
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {type === "freelancer" ? (
          <FreelancerOnboarding onComplete={handleComplete} />
        ) : (
          <ClientOnboarding onComplete={handleComplete} />
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
