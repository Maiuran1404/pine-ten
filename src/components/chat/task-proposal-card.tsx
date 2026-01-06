"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Clock } from "lucide-react";
import { TaskProposal, getDeliveryDateString } from "./types";

interface TaskProposalCardProps {
  proposal: TaskProposal;
}

/**
 * Displays a task proposal summary with credits and delivery estimate
 */
export function TaskProposalCard({ proposal }: TaskProposalCardProps) {
  return (
    <Card className="mt-4 bg-background">
      <CardContent className="p-4">
        <h4 className="font-semibold mb-2">Task Summary</h4>
        <p className="text-sm text-muted-foreground mb-3">
          {proposal.description}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline" className="flex items-center gap-1">
            <Coins className="h-3 w-3" aria-hidden="true" />
            {proposal.creditsRequired} credits
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {getDeliveryDateString(proposal.deliveryDays || 3)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
