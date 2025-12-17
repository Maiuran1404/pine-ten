"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/shared/loading";
import { Coins, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const creditPackages = [
  {
    id: "credits_5",
    name: "Starter",
    credits: 5,
    price: 245,
    pricePerCredit: 49,
  },
  {
    id: "credits_10",
    name: "Standard",
    credits: 10,
    price: 490,
    pricePerCredit: 49,
    popular: true,
  },
  {
    id: "credits_25",
    name: "Professional",
    credits: 25,
    price: 1164,
    pricePerCredit: 46.55,
    originalPrice: 1225,
    discount: "5% OFF",
  },
  {
    id: "credits_50",
    name: "Business",
    credits: 50,
    price: 2205,
    pricePerCredit: 44.10,
    originalPrice: 2450,
    discount: "10% OFF",
  },
];

interface CreditPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredCredits?: number;
  currentCredits?: number;
}

export function CreditPurchaseDialog({
  open,
  onOpenChange,
  requiredCredits = 0,
  currentCredits = 0,
}: CreditPurchaseDialogProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const creditsNeeded = Math.max(0, requiredCredits - currentCredits);

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

  // Find recommended package (smallest that covers the need)
  const recommendedPackage = creditPackages.find(
    (pkg) => pkg.credits >= creditsNeeded
  ) || creditPackages[creditPackages.length - 1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Purchase Credits
          </DialogTitle>
          <DialogDescription>
            {creditsNeeded > 0 ? (
              <>
                You need <span className="font-semibold text-foreground">{creditsNeeded} more credits</span> to submit this task.
                Your current balance is {currentCredits} credits.
              </>
            ) : (
              "Select a credit package to continue creating design tasks."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {creditPackages.map((pkg) => {
            const isRecommended = pkg.id === recommendedPackage.id && creditsNeeded > 0;

            return (
              <div
                key={pkg.id}
                className={cn(
                  "relative flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all hover:border-primary",
                  isRecommended && "border-primary bg-primary/5",
                  pkg.popular && !isRecommended && "border-muted-foreground/30"
                )}
                onClick={() => !isLoading && handlePurchase(pkg.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full",
                    isRecommended ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    {isRecommended ? (
                      <Zap className="h-5 w-5" />
                    ) : (
                      <Coins className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{pkg.credits} credits</span>
                      {pkg.popular && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Popular
                        </Badge>
                      )}
                      {pkg.discount && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                          {pkg.discount}
                        </Badge>
                      )}
                      {isRecommended && (
                        <Badge className="text-xs">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ${pkg.pricePerCredit.toFixed(2)}/credit
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  {pkg.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through mr-2">
                      ${pkg.originalPrice}
                    </span>
                  )}
                  <Button
                    variant={isRecommended ? "default" : "outline"}
                    size="sm"
                    disabled={isLoading !== null}
                    className="cursor-pointer"
                  >
                    {isLoading === pkg.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      `$${pkg.price}`
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Secure payment powered by Stripe. Credits never expire.
        </p>
      </DialogContent>
    </Dialog>
  );
}
