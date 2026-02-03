"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Coins, Sparkles, Check, RefreshCw } from "lucide-react";
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
    pricePerCredit: 4.9,
    description: "5 designs or 1 ad campaign",
  },
  {
    id: "credits_100",
    name: "Standard",
    credits: 100,
    price: 490,
    pricePerCredit: 4.9,
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
    description: "Save 5% - Month of content",
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

interface CreditsPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCredits?: number;
}

export function CreditsPurchaseDialog({
  open,
  onOpenChange,
  currentCredits: initialCredits,
}: CreditsPurchaseDialogProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [credits, setCredits] = useState(initialCredits ?? 0);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(
    "credits_100"
  );

  useEffect(() => {
    if (open && initialCredits === undefined) {
      fetchCredits();
    }
  }, [open, initialCredits]);

  useEffect(() => {
    if (initialCredits !== undefined) {
      setCredits(initialCredits);
    }
  }, [initialCredits]);

  const fetchCredits = async () => {
    try {
      const response = await fetch("/api/user/credits");
      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits);
      }
    } catch (error) {
      console.error("Failed to fetch credits:", error);
    }
  };

  const getCreditColor = () => {
    if (credits === 0) return "text-red-500";
    if (credits <= 20) return "text-yellow-500";
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
      window.location.href = data.url;
    } catch {
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsLoading(null);
    }
  };

  const selectedPkg = creditPackages.find((p) => p.id === selectedPackage);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Override sidebar offset to always center on viewport */}
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden left-1/2! -translate-x-1/2!">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Coins className="h-5 w-5 text-primary-foreground" />
            </div>
            Purchase Credits
          </DialogTitle>
        </DialogHeader>

        {/* Current Balance */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
            <span className="text-sm text-muted-foreground">Current Balance</span>
            <div className="flex items-baseline gap-1.5">
              <span className={cn("text-2xl font-bold", getCreditColor())}>
                {credits}
              </span>
              <span className="text-sm text-muted-foreground">credits</span>
            </div>
          </div>
        </div>

        {/* Package Selection */}
        <div className="px-6 pb-2">
          <p className="text-xs text-muted-foreground mb-3">Select a package</p>
          <div className="grid grid-cols-2 gap-2">
            {creditPackages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={cn(
                  "relative p-4 rounded-xl border text-left transition-all duration-200",
                  selectedPackage === pkg.id
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                {pkg.popular && (
                  <div className="absolute -top-2 right-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-primary text-primary-foreground font-medium">
                      <Sparkles className="h-2.5 w-2.5" />
                      Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {pkg.name}
                  </span>
                  {selectedPackage === pkg.id && (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">
                    {pkg.credits}
                  </span>
                  <span className="text-xs text-muted-foreground">credits</span>
                </div>

                <div className="mt-1.5 flex items-center gap-2">
                  {pkg.originalPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      ${formatPrice(pkg.originalPrice)}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-foreground">
                    ${formatPrice(pkg.price)}
                  </span>
                </div>

                <p className="text-[10px] text-muted-foreground mt-1">
                  {pkg.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border mt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold text-foreground">
                ${formatPrice(selectedPkg?.price || 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">You&apos;ll receive</p>
              <p className="text-lg font-semibold text-foreground">
                {selectedPkg?.credits || 0} credits
              </p>
            </div>
          </div>

          <Button
            className="w-full h-12 font-medium text-sm rounded-xl"
            onClick={() => selectedPackage && handlePurchase(selectedPackage)}
            disabled={isLoading !== null || !selectedPackage}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Continue to Checkout
              </>
            )}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground mt-3">
            Secure payment powered by Stripe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
