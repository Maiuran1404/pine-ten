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
import { Skeleton } from "@/components/ui/skeleton";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, CheckCircle, XCircle, Coins, Plus, Trash2, Users, TrendingUp, DollarSign, UserCheck } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";

interface Client {
  id: string;
  name: string;
  email: string;
  credits: number;
  onboardingCompleted: boolean;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
  totalCreditsPurchased: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [grantCredits, setGrantCredits] = useState(5);
  const [grantReason, setGrantReason] = useState("");
  const [sendNotification, setSendNotification] = useState(true);
  const [isGranting, setIsGranting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/admin/clients");
      if (response.ok) {
        const data = await response.json();
        setClients(data.data?.clients || []);
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      searchTerm === "" ||
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openGrantDialog = (client: Client) => {
    setSelectedClient(client);
    setGrantCredits(5);
    setGrantReason("");
    setSendNotification(true);
    setGrantDialogOpen(true);
  };

  const handleGrantCredits = async () => {
    if (!selectedClient || grantCredits <= 0) return;

    setIsGranting(true);
    try {
      const response = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedClient.id,
          amount: grantCredits,
          type: "BONUS",
          description: grantReason || `Admin granted ${grantCredits} credits`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to grant credits");
      }

      toast.success(`Successfully granted ${grantCredits} credits to ${selectedClient.name}`);

      // Update local state
      setClients((prev) =>
        prev.map((c) =>
          c.id === selectedClient.id ? { ...c, credits: result.data?.newCredits ?? c.credits + grantCredits } : c
        )
      );

      setGrantDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to grant credits");
    } finally {
      setIsGranting(false);
    }
  };

  const openDeleteDialog = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedClient) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/clients/${selectedClient.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      toast.success(`Successfully deleted ${selectedClient.name}`);
      setClients((prev) => prev.filter((c) => c.id !== selectedClient.id));
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalRevenue = clients.reduce((sum, c) => sum + c.totalCreditsPurchased * 49, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
        <p className="text-muted-foreground">
          View and manage all clients on the platform
        </p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Clients"
            value={clients.length}
            subtext={`${clients.filter((c) => c.onboardingCompleted).length} onboarded`}
            icon={Users}
          />
          <StatCard
            label="Active Clients"
            value={clients.filter((c) => c.totalTasks > 0).length}
            subtext="With at least 1 task"
            icon={UserCheck}
            trend={clients.filter((c) => c.totalTasks > 0).length > 0 ? "up" : "neutral"}
          />
          <StatCard
            label="Credits Purchased"
            value={clients.reduce((sum, c) => sum + c.totalCreditsPurchased, 0)}
            subtext="Total across all clients"
            icon={TrendingUp}
          />
          <StatCard
            label="Total Revenue"
            value={`$${totalRevenue.toLocaleString()}`}
            subtext="From credit purchases"
            icon={DollarSign}
            trend="up"
          />
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>
            {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No clients found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Onboarded</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Total Purchased</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.onboardingCompleted ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.credits > 0 ? "default" : "secondary"}>
                        {client.credits}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{client.totalTasks} total</p>
                        <p className="text-muted-foreground">{client.completedTasks} completed</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{client.totalCreditsPurchased}</span>
                      <span className="text-muted-foreground text-sm ml-1">
                        (${client.totalCreditsPurchased * 49})
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(client.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openGrantDialog(client)}
                          className="cursor-pointer"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Grant Credits
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(client)}
                          className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Grant Credits Dialog */}
      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Grant Credits
            </DialogTitle>
            <DialogDescription>
              Add credits to {selectedClient?.name}&apos;s account
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="credits">Number of Credits</Label>
              <Input
                id="credits"
                type="number"
                min="1"
                value={grantCredits}
                onChange={(e) => setGrantCredits(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                placeholder="e.g., Compensation for delayed delivery"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify"
                checked={sendNotification}
                onCheckedChange={(checked) => setSendNotification(checked === true)}
              />
              <Label htmlFor="notify" className="text-sm font-normal cursor-pointer">
                Send email notification to user
              </Label>
            </div>

            {selectedClient && (
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p>
                  <span className="text-muted-foreground">Current balance:</span>{" "}
                  <span className="font-medium">{selectedClient.credits} credits</span>
                </p>
                <p>
                  <span className="text-muted-foreground">After grant:</span>{" "}
                  <span className="font-medium text-green-600">
                    {selectedClient.credits + grantCredits} credits
                  </span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGrantDialogOpen(false)}
              disabled={isGranting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGrantCredits}
              disabled={isGranting || grantCredits <= 0}
            >
              {isGranting ? "Granting..." : `Grant ${grantCredits} Credits`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedClient?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedClient && (
            <div className="py-4">
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-sm space-y-1">
                <p><span className="text-muted-foreground">Name:</span> {selectedClient.name}</p>
                <p><span className="text-muted-foreground">Email:</span> {selectedClient.email}</p>
                <p><span className="text-muted-foreground">Tasks:</span> {selectedClient.totalTasks} total</p>
                <p><span className="text-muted-foreground">Credits:</span> {selectedClient.credits}</p>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                This will permanently delete the user and all associated data including tasks, files, and transactions.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
