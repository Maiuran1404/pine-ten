"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading";
import { useSession } from "@/lib/auth-client";
import { Check, Coins, Sparkles } from "lucide-react";
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

export default function CreditsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const user = session?.user as { credits?: number } | undefined;
  const currentCredits = user?.credits || 0;

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Credits</h1>
        <p className="text-muted-foreground">
          Purchase credits to create design tasks
        </p>
      </div>

      {/* Current Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{currentCredits}</span>
            <span className="text-muted-foreground">credits</span>
          </div>
          {currentCredits <= 2 && (
            <p className="text-sm text-destructive mt-2">
              Your balance is low. Purchase more credits to continue creating tasks.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Credit Packages */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Purchase Credits</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {creditPackages.map((pkg) => (
            <Card
              key={pkg.id}
              className={cn(
                "relative",
                pkg.popular && "border-primary shadow-md"
              )}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Popular
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{pkg.name}</CardTitle>
                <CardDescription>{pkg.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{pkg.credits}</span>
                    <span className="text-muted-foreground">credits</span>
                  </div>
                  <div className="mt-1">
                    {pkg.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through mr-2">
                        ${pkg.originalPrice}
                      </span>
                    )}
                    <span className="text-lg font-semibold">${pkg.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ${pkg.pricePerCredit.toFixed(2)} per credit
                  </p>
                </div>

                <Button
                  className="w-full"
                  variant={pkg.popular ? "default" : "outline"}
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={isLoading !== null}
                >
                  {isLoading === pkg.id ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    "Purchase"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* What You Get */}
      <Card>
        <CardHeader>
          <CardTitle>What&apos;s Included</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {[
              "Professional design by vetted freelancers",
              "Up to 2 revisions per task",
              "Source files included (PSD, AI, Figma)",
              "Commercial usage rights",
              "Fast turnaround times",
              "Direct communication with designers",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
