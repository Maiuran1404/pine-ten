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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingSpinner } from "@/components/shared/loading";
import { Check, X, ExternalLink } from "lucide-react";

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
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    fetchFreelancers();
  }, []);

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

      toast.success("Freelancer approved successfully!");
      setFreelancers((prev) =>
        prev.map((f) =>
          f.id === freelancerId ? { ...f, status: "APPROVED" } : f
        )
      );
    } catch {
      toast.error("Failed to approve freelancer");
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

      toast.success("Freelancer rejected");
      setFreelancers((prev) =>
        prev.map((f) =>
          f.id === freelancerId ? { ...f, status: "REJECTED" } : f
        )
      );
    } catch {
      toast.error("Failed to reject freelancer");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredFreelancers = freelancers.filter((f) => {
    if (filter === "pending") return f.status === "PENDING";
    if (filter === "approved") return f.status === "APPROVED";
    if (filter === "rejected") return f.status === "REJECTED";
    return true;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      PENDING: "secondary",
      APPROVED: "default",
      REJECTED: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Freelancers</h1>
        <p className="text-muted-foreground">
          Manage freelancer applications and profiles
        </p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({freelancers.filter((f) => f.status === "PENDING").length})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {filter === "pending" ? "Pending Applications" : "Freelancers"}
              </CardTitle>
              <CardDescription>
                {filter === "pending"
                  ? "Review and approve freelancer applications"
                  : "All freelancers on the platform"}
              </CardDescription>
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
                  No freelancers found
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
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
                      <TableRow key={freelancer.id}>
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
                                disabled={processingId !== null}
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
                                disabled={processingId !== null}
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
    </div>
  );
}
