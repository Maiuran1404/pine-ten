"use client";

import { Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CreditDisplayProps {
  credits: number;
  showWarning?: boolean;
  warningThreshold?: number;
}

export function CreditDisplay({
  credits,
  showWarning = true,
  warningThreshold = 2,
}: CreditDisplayProps) {
  const isLow = showWarning && credits <= warningThreshold;

  return (
    <Badge
      variant={isLow ? "destructive" : "secondary"}
      className="flex items-center gap-1.5 px-3 py-1"
    >
      <Coins className="h-3.5 w-3.5" />
      <span className="font-semibold">{credits}</span>
      <span className="text-xs opacity-80">credits</span>
    </Badge>
  );
}
