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

const creditPackages = [
  {
    id: "credits_5",
    name: "Starter",
    credits: 5,
    price: 245,
    pricePerCredit: 49,
    description: "Perfect for trying out",
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
    description: "Save 5%",
  },
  {
    id: "credits_50",
    name: "Business",
    credits: 50,
    price: 2205,
    pricePerCredit: 44.1,
    originalPrice: 2450,
    description: "Save 10%",
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
    "credits_10"
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
    if (credits === 0) return "text-red-400";
    if (credits <= 2) return "text-amber-400";
    return "text-emerald-400";
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
      <DialogContent
        className="sm:max-w-[520px] p-0 gap-0 border-[#2a2a30]/50 overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(20, 20, 24, 0.95) 0%, rgba(10, 10, 12, 0.98) 100%)",
          backdropFilter: "blur(20px)",
        }}
      >
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center">
              <Coins className="h-5 w-5 text-white" />
            </div>
            Purchase Credits
          </DialogTitle>
        </DialogHeader>

        {/* Current Balance */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#1a1a1f]/50 border border-[#2a2a30]/30">
            <span className="text-sm text-[#6b6b6b]">Current Balance</span>
            <div className="flex items-baseline gap-1.5">
              <span className={cn("text-2xl font-bold", getCreditColor())}>
                {credits}
              </span>
              <span className="text-sm text-[#4a4a4a]">credits</span>
            </div>
          </div>
        </div>

        {/* Package Selection */}
        <div className="px-6 pb-2">
          <p className="text-xs text-[#6b6b6b] mb-3">Select a package</p>
          <div className="grid grid-cols-2 gap-2">
            {creditPackages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={cn(
                  "relative p-4 rounded-xl border text-left transition-all duration-200",
                  selectedPackage === pkg.id
                    ? "border-[#6366f1] bg-[#6366f1]/10"
                    : "border-[#2a2a30]/50 bg-[#1a1a1f]/30 hover:border-[#3a3a40]"
                )}
              >
                {pkg.popular && (
                  <div className="absolute -top-2 right-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#6366f1] text-white">
                      <Sparkles className="h-2.5 w-2.5" />
                      Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">
                    {pkg.name}
                  </span>
                  {selectedPackage === pkg.id && (
                    <div className="w-4 h-4 rounded-full bg-[#6366f1] flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">
                    {pkg.credits}
                  </span>
                  <span className="text-xs text-[#6b6b6b]">credits</span>
                </div>

                <div className="mt-1.5 flex items-center gap-2">
                  {pkg.originalPrice && (
                    <span className="text-xs text-[#4a4a4a] line-through">
                      ${pkg.originalPrice}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-white">
                    ${pkg.price}
                  </span>
                </div>

                <p className="text-[10px] text-[#4a4a4a] mt-1">
                  {pkg.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-[#2a2a30]/30 mt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-[#6b6b6b]">Total</p>
              <p className="text-2xl font-bold text-white">
                ${selectedPkg?.price || 0}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#6b6b6b]">You'll receive</p>
              <p className="text-lg font-semibold text-white">
                {selectedPkg?.credits || 0} credits
              </p>
            </div>
          </div>

          <Button
            className="w-full h-12 bg-white text-black hover:bg-white/90 font-medium text-sm rounded-xl"
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

          <p className="text-[10px] text-center text-[#4a4a4a] mt-3">
            Secure payment powered by Stripe
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
