"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { Check, Coins, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const creditPackages = [
  {
    id: "credits_5",
    name: "Starter",
    credits: 5,
    price: 245,
    pricePerCredit: 49,
    description: "Perfect for trying out the service",
  },
  {
    id: "credits_10",
    name: "Standard",
    credits: 10,
    price: 490,
    pricePerCredit: 49,
    description: "Great for small projects",
    popular: true,
  },
  {
    id: "credits_25",
    name: "Professional",
    credits: 25,
    price: 1164,
    pricePerCredit: 46.55,
    originalPrice: 1225,
    description: "Save 5% - Best for regular use",
  },
  {
    id: "credits_50",
    name: "Business",
    credits: 50,
    price: 2205,
    pricePerCredit: 44.10,
    originalPrice: 2450,
    description: "Save 10% - Best value for teams",
  },
];

const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div
    className={cn("rounded-xl overflow-hidden border border-[#2a2a30]/50", className)}
    style={{
      background: 'linear-gradient(180deg, rgba(20, 20, 24, 0.6) 0%, rgba(12, 12, 15, 0.8) 100%)',
      backdropFilter: 'blur(12px)',
    }}
  >
    {children}
  </div>
);

export default function CreditsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const user = session?.user as { credits?: number } | undefined;
  const currentCredits = user?.credits || 0;

  const getCreditColor = () => {
    if (currentCredits === 0) return "text-red-400";
    if (currentCredits <= 2) return "text-yellow-400";
    return "text-green-400";
  };

  const handlePurchase = async (packageId: string) => {
    setIsLoading(packageId);

    try {
      const response = await fetch("/api/webhooks/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const data = await response.json();

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch {
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-full bg-[#0a0a0a] p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Credits</h1>
        <p className="text-[#6b6b6b] mt-1">
          Purchase credits to create design tasks
        </p>
      </div>

      {/* Current Balance */}
      <GlassCard>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#2a2a30]/50 flex items-center justify-center">
              <Coins className="h-5 w-5 text-[#6b6b6b]" />
            </div>
            <h2 className="text-sm font-medium text-white">Current Balance</h2>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-5xl font-bold", getCreditColor())}>{currentCredits}</span>
            <span className="text-[#6b6b6b]">credits</span>
          </div>
          {currentCredits <= 2 && (
            <p className="text-sm text-red-400 mt-3">
              Your balance is low. Purchase more credits to continue creating tasks.
            </p>
          )}
        </div>
      </GlassCard>

      {/* Credit Packages */}
      <div>
        <h2 className="text-sm font-medium text-[#6b6b6b] mb-4">Purchase Credits</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-3">
          {creditPackages.map((pkg) => (
            <GlassCard
              key={pkg.id}
              className={cn(
                "relative",
                pkg.popular && "border-[#6366f1]/50 !overflow-visible"
              )}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-[#6366f1] text-white">
                    <Sparkles className="h-3 w-3" />
                    Popular
                  </span>
                </div>
              )}
              <div className="p-5 pt-6">
                <h3 className="text-white font-medium">{pkg.name}</h3>
                <p className="text-xs text-[#4a4a4a] mt-1">{pkg.description}</p>

                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{pkg.credits}</span>
                    <span className="text-[#6b6b6b]">credits</span>
                  </div>
                  <div className="mt-1">
                    {pkg.originalPrice && (
                      <span className="text-sm text-[#4a4a4a] line-through mr-2">
                        ${pkg.originalPrice}
                      </span>
                    )}
                    <span className="text-lg font-semibold text-white">${pkg.price}</span>
                  </div>
                  <p className="text-xs text-[#4a4a4a] mt-1">
                    ${pkg.pricePerCredit.toFixed(2)} per credit
                  </p>
                </div>

                <Button
                  className={cn(
                    "w-full mt-4",
                    pkg.popular
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-[#2a2a30] text-white hover:bg-[#3a3a40] border border-[#2a2a30]"
                  )}
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={isLoading !== null}
                >
                  {isLoading === pkg.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    "Purchase"
                  )}
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* What You Get */}
      <GlassCard>
        <div className="p-5 border-b border-[#2a2a30]/40">
          <h2 className="text-sm font-medium text-white">What&apos;s Included</h2>
        </div>
        <div className="p-5">
          <ul className="space-y-3">
            {[
              "Professional design by vetted freelancers",
              "Up to 2 revisions per task",
              "Source files included (PSD, AI, Figma)",
              "Commercial usage rights",
              "Fast turnaround times",
              "Direct communication with designers",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-[#9a9a9a]">
                <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-green-400" />
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </GlassCard>
    </div>
  );
}
