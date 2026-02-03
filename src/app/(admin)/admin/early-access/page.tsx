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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import {
  KeyRound,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Users,
  Mail,
  Clock,
  UserPlus,
} from "lucide-react";

interface EarlyAccessCode {
  id: string;
  code: string;
  description: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  creatorName: string | null;
}

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  referralSource: string | null;
  status: "PENDING" | "INVITED" | "REGISTERED";
  invitedAt: string | null;
  registeredAt: string | null;
  createdAt: string;
}

interface CodeStats {
  totalCodes: number;
  activeCodes: number;
  totalUsages: number;
}

interface WaitlistStats {
  total: number;
  pending: number;
  invited: number;
  registered: number;
}

export default function EarlyAccessPage() {
  // Codes state
  const [codes, setCodes] = useState<EarlyAccessCode[]>([]);
  const [codeStats, setCodeStats] = useState<CodeStats>({
    totalCodes: 0,
    activeCodes: 0,
    totalUsages: 0,
  });
  const [isLoadingCodes, setIsLoadingCodes] = useState(true);

  // Waitlist state
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [waitlistStats, setWaitlistStats] = useState<WaitlistStats>({
    total: 0,
    pending: 0,
    invited: 0,
    registered: 0,
  });
  const [isLoadingWaitlist, setIsLoadingWaitlist] = useState(true);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<EarlyAccessCode | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formMaxUses, setFormMaxUses] = useState<string>("");
  const [formExpiresAt, setFormExpiresAt] = useState("");

  useEffect(() => {
    fetchCodes();
    fetchWaitlist();
  }, []);

  const fetchCodes = async () => {
    setIsLoadingCodes(true);
    try {
      const response = await fetch("/api/admin/early-access/codes");
      if (response.ok) {
        const data = await response.json();
        setCodes(data.codes || []);
        setCodeStats(data.stats || { totalCodes: 0, activeCodes: 0, totalUsages: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch codes:", error);
      toast.error("Failed to load invite codes");
    } finally {
      setIsLoadingCodes(false);
    }
  };

  const fetchWaitlist = async () => {
    setIsLoadingWaitlist(true);
    try {
      const response = await fetch("/api/admin/early-access/waitlist");
      if (response.ok) {
        const data = await response.json();
        setWaitlist(data.waitlist || []);
        setWaitlistStats(data.stats || { total: 0, pending: 0, invited: 0, registered: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch waitlist:", error);
      toast.error("Failed to load waitlist");
    } finally {
      setIsLoadingWaitlist(false);
    }
  };

  const handleCreateCode = async () => {
    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/early-access/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formCode || undefined,
          description: formDescription || undefined,
          maxUses: formMaxUses ? parseInt(formMaxUses) : undefined,
          expiresAt: formExpiresAt || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create code");
      }

      toast.success("Invite code created successfully");
      setCreateDialogOpen(false);
      resetForm();
      fetchCodes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create code");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleCode = async (code: EarlyAccessCode) => {
    try {
      const response = await fetch("/api/admin/early-access/codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: code.id,
          isActive: !code.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update code");
      }

      toast.success(`Code ${!code.isActive ? "activated" : "deactivated"}`);
      fetchCodes();
    } catch (error) {
      toast.error("Failed to update code");
    }
  };

  const handleDeleteCode = async () => {
    if (!selectedCode) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/early-access/codes?id=${selectedCode.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete code");
      }

      toast.success("Code deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedCode(null);
      fetchCodes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete code");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkAsInvited = async (entry: WaitlistEntry) => {
    try {
      const response = await fetch("/api/admin/early-access/waitlist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entry.id,
          status: "INVITED",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      toast.success("Marked as invited");
      fetchWaitlist();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const resetForm = () => {
    setFormCode("");
    setFormDescription("");
    setFormMaxUses("");
    setFormExpiresAt("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Early Access</h1>
          <p className="text-muted-foreground">
            Manage invite codes and waitlist signups
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              Total Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{codeStats.totalCodes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Active Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{codeStats.activeCodes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              Total Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{codeStats.totalUsages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Waitlist
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{waitlistStats.pending}</div>
            <p className="text-xs text-muted-foreground">pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Codes and Waitlist */}
      <Tabs defaultValue="codes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="codes" className="cursor-pointer">
            Invite Codes
          </TabsTrigger>
          <TabsTrigger value="waitlist" className="cursor-pointer">
            Waitlist ({waitlistStats.pending})
          </TabsTrigger>
        </TabsList>

        {/* Codes Tab */}
        <TabsContent value="codes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invite Codes</CardTitle>
                  <CardDescription>
                    Create and manage invite codes for early access
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={fetchCodes}
                    disabled={isLoadingCodes}
                    className="cursor-pointer"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingCodes ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button onClick={() => setCreateDialogOpen(true)} className="cursor-pointer">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Code
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingCodes ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : codes.length === 0 ? (
                <div className="text-center py-8">
                  <KeyRound className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No invite codes yet</p>
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="mt-4 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Code
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                              {code.code}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 cursor-pointer"
                              onClick={() => copyToClipboard(code.code)}
                            >
                              {copiedCode === code.code ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {code.description || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{code.usedCount}</span>
                          {code.maxUses && (
                            <span className="text-muted-foreground">
                              /{code.maxUses}
                            </span>
                          )}
                          {!code.maxUses && (
                            <span className="text-muted-foreground text-xs ml-1">
                              (unlimited)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {code.expiresAt ? (
                            <span className={`text-sm ${new Date(code.expiresAt) < new Date() ? "text-red-500" : "text-muted-foreground"}`}>
                              {formatDate(code.expiresAt)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={code.isActive}
                              onCheckedChange={() => handleToggleCode(code)}
                            />
                            <Badge variant={code.isActive ? "default" : "secondary"}>
                              {code.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{formatDate(code.createdAt)}</p>
                            {code.creatorName && (
                              <p className="text-xs text-muted-foreground">
                                by {code.creatorName}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive cursor-pointer"
                            onClick={() => {
                              setSelectedCode(code);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Waitlist Tab */}
        <TabsContent value="waitlist" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Waitlist</CardTitle>
                  <CardDescription>
                    Users waiting for an invite code
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={fetchWaitlist}
                  disabled={isLoadingWaitlist}
                  className="cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingWaitlist ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingWaitlist ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : waitlist.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No one on the waitlist yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Signed Up</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlist.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <span className="font-medium">{entry.email}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {entry.name || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground capitalize">
                            {entry.referralSource || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.status === "REGISTERED"
                                ? "default"
                                : entry.status === "INVITED"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {entry.status === "REGISTERED" && "Registered"}
                            {entry.status === "INVITED" && "Invited"}
                            {entry.status === "PENDING" && "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{formatDate(entry.createdAt)}</p>
                            {entry.invitedAt && (
                              <p className="text-xs text-muted-foreground">
                                Invited: {formatDate(entry.invitedAt)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.status === "PENDING" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => handleMarkAsInvited(entry)}
                            >
                              Mark Invited
                            </Button>
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

      {/* Create Code Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Create Invite Code
            </DialogTitle>
            <DialogDescription>
              Create a new invite code for early access users
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code (Optional)</Label>
              <Input
                id="code"
                placeholder="EARLY-XXXXXX (auto-generated if empty)"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to auto-generate a code
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="e.g., For beta testers"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxUses">Max Uses (Optional)</Label>
              <Input
                id="maxUses"
                type="number"
                min="1"
                placeholder="Unlimited"
                value={formMaxUses}
                onChange={(e) => setFormMaxUses(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for unlimited uses
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiry Date (Optional)</Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formExpiresAt}
                onChange={(e) => setFormExpiresAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to never expire
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetForm();
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCode} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invite Code</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the code &quot;{selectedCode?.code}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCode}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
