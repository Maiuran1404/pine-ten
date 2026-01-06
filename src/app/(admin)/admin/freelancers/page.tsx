"use client";

import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingSpinner } from "@/components/shared/loading";
import { Check, X, ExternalLink, Users } from "lucide-react";
import { useBulkSelection } from "@/hooks/use-bulk-selection";

interface Freelancer {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
  status: string;
  skills: string[];
  specializations: string[];
  portfolioUrls: string[];
  bio: string | null;
  completedTasks: number;
  rating: string | null;
  createdAt: string;
}

export default function FreelancersPage() {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | null>(null);

  const filteredFreelancers = freelancers.filter((f) => {
    if (filter === "pending") return f.status === "PENDING";
    if (filter === "approved") return f.status === "APPROVED";
    if (filter === "rejected") return f.status === "REJECTED";
    if (filter === "not_onboarded") return f.status === "NOT_ONBOARDED";
    return true;
  });

  const {
    selectedIds,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    selectedCount,
    toggle,
    toggleAll,
    clearSelection,
  } = useBulkSelection({
    items: filteredFreelancers,
    getId: (f) => f.id,
  });

  useEffect(() => {
    fetchFreelancers();
  }, []);

  // Clear selection when filter changes
  useEffect(() => {
    clearSelection();
  }, [filter, clearSelection]);

  const fetchFreelancers = async () => {
    try {
      const response = await fetch("/api/admin/freelancers");
      if (response.ok) {
        const data = await response.json();
        setFreelancers(data.freelancers || []);
      }
    } catch (error) {
      console.error("Failed to fetch freelancers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (freelancerId: string) => {
    setProcessingId(freelancerId);
    try {
      const response = await fetch("/api/admin/freelancers/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freelancerId }),
      });

      if (!response.ok) throw new Error("Failed to approve");

      toast.success("Artist approved successfully!");
      setFreelancers((prev) =>
        prev.map((f) =>
          f.id === freelancerId ? { ...f, status: "APPROVED" } : f
        )
      );
    } catch {
      toast.error("Failed to approve artist");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (freelancerId: string) => {
    setProcessingId(freelancerId);
    try {
      const response = await fetch("/api/admin/freelancers/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freelancerId }),
      });

      if (!response.ok) throw new Error("Failed to reject");

      toast.success("Artist rejected");
      setFreelancers((prev) =>
        prev.map((f) =>
          f.id === freelancerId ? { ...f, status: "REJECTED" } : f
        )
      );
    } catch {
      toast.error("Failed to reject artist");
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkAction = async (action: "approve" | "reject") => {
    setBulkAction(null);
    setIsBulkProcessing(true);

    try {
      const freelancerIds = Array.from(selectedIds);
      const response = await fetch("/api/admin/freelancers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freelancerIds, action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Bulk action failed");
      }

      const result = await response.json();
      const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

      // Update local state
      setFreelancers((prev) =>
        prev.map((f) =>
          selectedIds.has(f.id) ? { ...f, status: newStatus } : f
        )
      );

      clearSelection();

      if (result.data.failed > 0) {
        toast.warning(
          `${action === "approve" ? "Approved" : "Rejected"} ${result.data.success} artists. ${result.data.failed} failed.`
        );
      } else {
        toast.success(
          `${action === "approve" ? "Approved" : "Rejected"} ${result.data.success} artists successfully!`
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk action failed");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const pendingSelected = filteredFreelancers.filter(
    (f) => selectedIds.has(f.id) && f.status === "PENDING"
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PENDING: "secondary",
      APPROVED: "default",
      REJECTED: "destructive",
      NOT_ONBOARDED: "outline",
    };
    const labels: Record<string, string> = {
      PENDING: "Pending",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      NOT_ONBOARDED: "Not Onboarded",
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Artists</h1>
        <p className="text-muted-foreground">
          Manage artist applications and profiles
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">
            All ({freelancers.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({freelancers.filter((f) => f.status === "PENDING").length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({freelancers.filter((f) => f.status === "APPROVED").length})
          </TabsTrigger>
          <TabsTrigger value="not_onboarded">
            Not Onboarded ({freelancers.filter((f) => f.status === "NOT_ONBOARDED").length})
          </TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {filter === "pending" ? "Pending Applications" :
                     filter === "not_onboarded" ? "Not Onboarded" : "Artists"}
                  </CardTitle>
                  <CardDescription>
                    {filter === "pending"
                      ? "Review and approve artist applications"
                      : filter === "not_onboarded"
                      ? "Artists who registered but haven't completed onboarding"
                      : "All artists on the platform"}
                  </CardDescription>
                </div>

                {/* Bulk Actions */}
                {selectedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {selectedCount} selected
                    </Badge>
                    {pendingSelected.length > 0 && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setBulkAction("approve")}
                          disabled={isBulkProcessing}
                        >
                          {isBulkProcessing ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Approve All
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setBulkAction("reject")}
                          disabled={isBulkProcessing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject All
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearSelection}
                      disabled={isBulkProcessing}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredFreelancers.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No artists found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isAllSelected}
                          ref={(ref) => {
                            if (ref) {
                              (ref as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = isPartiallySelected;
                            }
                          }}
                          onCheckedChange={toggleAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead>Portfolio</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stats</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFreelancers.map((freelancer) => (
                      <TableRow
                        key={freelancer.id}
                        className={isSelected(freelancer.id) ? "bg-muted/50" : undefined}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected(freelancer.id)}
                            onCheckedChange={() => toggle(freelancer.id)}
                            aria-label={`Select ${freelancer.user.name}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{freelancer.user.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {freelancer.user.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {freelancer.skills?.slice(0, 3).map((skill) => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {freelancer.skills?.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{freelancer.skills.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {freelancer.portfolioUrls?.length > 0 ? (
                            <div className="flex gap-1">
                              {freelancer.portfolioUrls.slice(0, 2).map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(freelancer.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{freelancer.completedTasks} tasks</p>
                            {freelancer.rating && (
                              <p className="text-muted-foreground">
                                {parseFloat(freelancer.rating).toFixed(1)} rating
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {freelancer.status === "PENDING" && (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(freelancer.id)}
                                disabled={processingId !== null || isBulkProcessing}
                              >
                                {processingId === freelancer.id ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  <>
                                    <Check className="h-4 w-4 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReject(freelancer.id)}
                                disabled={processingId !== null || isBulkProcessing}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Action Confirmation Dialog */}
      <AlertDialog open={bulkAction !== null} onOpenChange={() => setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "approve" ? "Approve Selected Artists?" : "Reject Selected Artists?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "approve"
                ? `This will approve ${pendingSelected.length} pending artist application${pendingSelected.length !== 1 ? "s" : ""}. They will be notified via email.`
                : `This will reject ${pendingSelected.length} pending artist application${pendingSelected.length !== 1 ? "s" : ""}. They will be notified via email.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkAction && handleBulkAction(bulkAction)}
              className={bulkAction === "reject" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {bulkAction === "approve" ? "Approve All" : "Reject All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
