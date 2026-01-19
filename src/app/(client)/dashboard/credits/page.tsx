"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { Check, Coins, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const formatPrice = (price: number) => {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
};

const creditPackages = [
  {
    id: "credits_50",
    name: "Starter",
    credits: 50,
    price: 245,
    pricePerCredit: 4.90,
    description: "5 social media designs or 1 ad campaign",
  },
  {
    id: "credits_100",
    name: "Standard",
    credits: 100,
    price: 490,
    pricePerCredit: 4.90,
    description: "10 designs or 3 video ads",
    popular: true,
  },
  {
    id: "credits_250",
    name: "Professional",
    credits: 250,
    price: 1164,
    pricePerCredit: 4.66,
    originalPrice: 1225,
    description: "Save 5% - A month of content",
  },
  {
    id: "credits_500",
    name: "Business",
    credits: 500,
    price: 2205,
    pricePerCredit: 4.41,
    originalPrice: 2450,
    description: "Save 10% - Full brand refresh",
  },
];

export default function CreditsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const user = session?.user as { credits?: number } | undefined;
  const currentCredits = user?.credits || 0;

  const getCreditColor = () => {
    if (currentCredits === 0) return "text-red-500";
    if (currentCredits <= 20) return "text-yellow-500";
    return "text-emerald-500";
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
    <div className="min-h-full p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Credits</h1>
        <p className="text-muted-foreground mt-1">
          Purchase credits to create design tasks
        </p>
      </div>

      {/* Current Balance */}
      <div className="rounded-xl overflow-hidden border border-border bg-card">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Coins className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-medium text-foreground">Current Balance</h2>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={cn("text-5xl font-bold", getCreditColor())}>{currentCredits}</span>
            <span className="text-muted-foreground">credits</span>
          </div>
          {currentCredits <= 20 && (
            <p className="text-sm text-red-500 mt-3">
              Your balance is low. Purchase more credits to continue creating tasks.
            </p>
          )}
        </div>
      </div>

      {/* Credit Packages */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-4">Purchase Credits</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-3">
          {creditPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={cn(
                "relative rounded-xl border bg-card",
                pkg.popular ? "border-primary" : "border-border"
              )}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-primary text-primary-foreground font-medium">
                    <Sparkles className="h-3 w-3" />
                    Popular
                  </span>
                </div>
              )}
              <div className="p-5 pt-6">
                <h3 className="text-foreground font-medium">{pkg.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>

                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{pkg.credits}</span>
                    <span className="text-muted-foreground">credits</span>
                  </div>
                  <div className="mt-1">
                    {pkg.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through mr-2">
                        ${formatPrice(pkg.originalPrice)}
                      </span>
                    )}
                    <span className="text-lg font-semibold text-foreground">${formatPrice(pkg.price)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${pkg.pricePerCredit.toFixed(2)} per credit
                  </p>
                </div>

                <Button
                  className="w-full mt-4"
                  variant={pkg.popular ? "default" : "outline"}
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
            </div>
          ))}
        </div>
      </div>

      {/* What Credits Get You */}
      <div className="rounded-xl overflow-hidden border border-border bg-card">
        <div className="p-5 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">What Your Credits Get You</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-primary">50</span>
                <span className="text-sm text-muted-foreground">credits</span>
              </div>
              <ul className="space-y-1.5 text-sm text-foreground">
                <li>5 social media posts with variants</li>
                <li>1 complete ad campaign (5 concepts)</li>
                <li>1 simple landing page design</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-primary">100</span>
                <span className="text-sm text-muted-foreground">credits</span>
              </div>
              <ul className="space-y-1.5 text-sm text-foreground">
                <li>10 social media designs</li>
                <li>3 animated video ads</li>
                <li>2 landing pages or 1 small website</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-primary">250</span>
                <span className="text-sm text-muted-foreground">credits</span>
              </div>
              <ul className="space-y-1.5 text-sm text-foreground">
                <li>A full month of social content</li>
                <li>Complete multi-platform ad campaign</li>
                <li>Medium-sized app or website design</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-primary">500</span>
                <span className="text-sm text-muted-foreground">credits</span>
              </div>
              <ul className="space-y-1.5 text-sm text-foreground">
                <li>Full brand refresh with all assets</li>
                <li>Quarterly content calendar</li>
                <li>Complete app design with all screens</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* What's Included */}
      <div className="rounded-xl overflow-hidden border border-border bg-card">
        <div className="p-5 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Every Task Includes</h2>
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
              <li key={item} className="flex items-center gap-3 text-foreground">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-primary" />
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
