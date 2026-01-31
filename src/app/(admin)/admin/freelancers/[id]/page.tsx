"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Clock,
  Star,
  CheckCircle2,
  ExternalLink,
  Calendar,
  MapPin,
  DollarSign,
  Briefcase,
  Check,
  X,
  MessageCircle,
  Pencil,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { LoadingSpinner } from "@/components/shared/loading";

interface FreelancerDetails {
  id: string;
  userId: string;
  status: string;
  skills: string[];
  specializations: string[];
  portfolioUrls: string[];
  bio: string | null;
  timezone: string | null;
  hourlyRate: string | null;
  rating: string | null;
  completedTasks: number;
  whatsappNumber: string | null;
  availability: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    createdAt: string;
  };
  taskCounts: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    inReview: number;
  };
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
  }>;
}

interface EditFormData {
  name: string;
  email: string;
  status: string;
  skills: string[];
  specializations: string[];
  portfolioUrls: string[];
  bio: string;
  timezone: string;
  hourlyRate: string;
  whatsappNumber: string;
  availability: boolean;
  rating: string;
}

export default function FreelancerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [freelancer, setFreelancer] = useState<FreelancerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<EditFormData>({
    name: "",
    email: "",
    status: "",
    skills: [],
    specializations: [],
    portfolioUrls: [],
    bio: "",
    timezone: "",
    hourlyRate: "",
    whatsappNumber: "",
    availability: true,
    rating: "",
  });
  const [newSkill, setNewSkill] = useState("");
  const [newSpecialization, setNewSpecialization] = useState("");
  const [newPortfolioUrl, setNewPortfolioUrl] = useState("");

  useEffect(() => {
    fetchFreelancer();
  }, [id]);

  const fetchFreelancer = async () => {
    try {
      const response = await fetch(`/api/admin/freelancers/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Artist not found");
          router.push("/admin/freelancers");
          return;
        }
        throw new Error("Failed to fetch artist");
      }
      const data = await response.json();
      const f = data.data?.freelancer;
      setFreelancer(f);
      if (f) {
        setEditForm({
          name: f.user.name || "",
          email: f.user.email || "",
          status: f.status || "",
          skills: f.skills || [],
          specializations: f.specializations || [],
          portfolioUrls: f.portfolioUrls || [],
          bio: f.bio || "",
          timezone: f.timezone || "",
          hourlyRate: f.hourlyRate || "",
          whatsappNumber: f.whatsappNumber || "",
          availability: f.availability ?? true,
          rating: f.rating || "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch artist:", error);
      toast.error("Failed to load artist details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!freelancer) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/freelancers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          status: editForm.status,
          skills: editForm.skills,
          specializations: editForm.specializations,
          portfolioUrls: editForm.portfolioUrls,
          bio: editForm.bio || null,
          timezone: editForm.timezone || null,
          hourlyRate: editForm.hourlyRate || null,
          whatsappNumber: editForm.whatsappNumber || null,
          availability: editForm.availability,
          rating: editForm.rating || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to save");
      }

      const data = await response.json();
      // Refetch to get full data with task counts
      await fetchFreelancer();
      setIsEditing(false);
      toast.success("Artist profile updated successfully!");
    } catch (error) {
      console.error("Failed to save artist:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (freelancer) {
      setEditForm({
        name: freelancer.user.name || "",
        email: freelancer.user.email || "",
        status: freelancer.status || "",
        skills: freelancer.skills || [],
        specializations: freelancer.specializations || [],
        portfolioUrls: freelancer.portfolioUrls || [],
        bio: freelancer.bio || "",
        timezone: freelancer.timezone || "",
        hourlyRate: freelancer.hourlyRate || "",
        whatsappNumber: freelancer.whatsappNumber || "",
        availability: freelancer.availability ?? true,
        rating: freelancer.rating || "",
      });
    }
    setIsEditing(false);
  };

  const handleApprove = async () => {
    if (!freelancer) return;
    setIsProcessing(true);
    try {
      const response = await fetch("/api/admin/freelancers/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freelancerId: freelancer.id }),
      });

      if (!response.ok) throw new Error("Failed to approve");

      toast.success("Artist approved successfully!");
      setFreelancer((prev) =>
        prev ? { ...prev, status: "APPROVED" } : prev
      );
      setEditForm((prev) => ({ ...prev, status: "APPROVED" }));
    } catch {
      toast.error("Failed to approve artist");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!freelancer) return;
    setIsProcessing(true);
    try {
      const response = await fetch("/api/admin/freelancers/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freelancerId: freelancer.id }),
      });

      if (!response.ok) throw new Error("Failed to reject");

      toast.success("Artist rejected");
      setFreelancer((prev) =>
        prev ? { ...prev, status: "REJECTED" } : prev
      );
      setEditForm((prev) => ({ ...prev, status: "REJECTED" }));
    } catch {
      toast.error("Failed to reject artist");
    } finally {
      setIsProcessing(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !editForm.skills.includes(newSkill.trim())) {
      setEditForm((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setEditForm((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const addSpecialization = () => {
    if (newSpecialization.trim() && !editForm.specializations.includes(newSpecialization.trim())) {
      setEditForm((prev) => ({
        ...prev,
        specializations: [...prev.specializations, newSpecialization.trim()],
      }));
      setNewSpecialization("");
    }
  };

  const removeSpecialization = (spec: string) => {
    setEditForm((prev) => ({
      ...prev,
      specializations: prev.specializations.filter((s) => s !== spec),
    }));
  };

  const addPortfolioUrl = () => {
    if (newPortfolioUrl.trim()) {
      try {
        new URL(newPortfolioUrl.trim());
        if (!editForm.portfolioUrls.includes(newPortfolioUrl.trim())) {
          setEditForm((prev) => ({
            ...prev,
            portfolioUrls: [...prev.portfolioUrls, newPortfolioUrl.trim()],
          }));
          setNewPortfolioUrl("");
        }
      } catch {
        toast.error("Please enter a valid URL");
      }
    }
  };

  const removePortfolioUrl = (url: string) => {
    setEditForm((prev) => ({
      ...prev,
      portfolioUrls: prev.portfolioUrls.filter((u) => u !== url),
    }));
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      PENDING: { variant: "secondary", label: "Pending Review" },
      APPROVED: { variant: "default", label: "Approved" },
      REJECTED: { variant: "destructive", label: "Rejected" },
      NOT_ONBOARDED: { variant: "outline", label: "Not Onboarded" },
    };
    const { variant, label } = config[status] || { variant: "secondary", label: status };
    return <Badge variant={variant} className="text-sm">{label}</Badge>;
  };

  const getTaskStatusBadge = (status: string) => {
    const config: Record<string, string> = {
      PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      ASSIGNED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      IN_PROGRESS: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      IN_REVIEW: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      COMPLETED: "bg-green-500/20 text-green-400 border-green-500/30",
      REVISION_REQUESTED: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    const color = config[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
    const label = status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
        {label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-0">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!freelancer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Artist not found</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 p-4 sm:p-0"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/freelancers")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {freelancer.user.name}
            </h1>
            <p className="text-muted-foreground">{freelancer.user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1 sm:flex-none"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 sm:flex-none"
              >
                {isSaving ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="flex-1 sm:flex-none"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              {freelancer.status === "PENDING" && (
                <>
                  <Button
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="flex-1 sm:flex-none"
                  >
                    {isProcessing ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={isProcessing}
                    className="flex-1 sm:flex-none"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={freelancer.user.image || undefined} alt={freelancer.user.name} />
                  <AvatarFallback className="text-2xl">
                    {freelancer.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {isEditing ? (
                  <div className="w-full space-y-3">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={editForm.name}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={editForm.status}
                        onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="APPROVED">Approved</SelectItem>
                          <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold">{freelancer.user.name}</h2>
                    <div className="mt-2">
                      {getStatusBadge(freelancer.status)}
                    </div>
                  </>
                )}

                <div className="flex items-center gap-1 mt-3 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Joined {formatDate(freelancer.user.createdAt)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        value={editForm.whatsappNumber}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
                        placeholder="+1234567890"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Input
                        id="timezone"
                        value={editForm.timezone}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, timezone: e.target.value }))}
                        placeholder="e.g., America/New_York"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        step="0.01"
                        value={editForm.hourlyRate}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, hourlyRate: e.target.value }))}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rating">Rating (0-5)</Label>
                      <Input
                        id="rating"
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        value={editForm.rating}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, rating: e.target.value }))}
                        placeholder="0.0"
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="availability">Available for Work</Label>
                      <Switch
                        id="availability"
                        checked={editForm.availability}
                        onCheckedChange={(checked) => setEditForm((prev) => ({ ...prev, availability: checked }))}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{freelancer.user.email}</span>
                    </div>

                    {freelancer.whatsappNumber && (
                      <div className="flex items-center gap-3 text-sm">
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        <span>{freelancer.whatsappNumber}</span>
                      </div>
                    )}

                    {freelancer.timezone && (
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{freelancer.timezone}</span>
                      </div>
                    )}

                    {freelancer.hourlyRate && (
                      <div className="flex items-center gap-3 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>${parseFloat(freelancer.hourlyRate).toFixed(2)}/hour</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{freelancer.availability ? "Available" : "Not Available"}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    {freelancer.completedTasks}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Completed</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                    <Star className="h-5 w-5 text-yellow-500" />
                    {isEditing ? editForm.rating || "—" : freelancer.rating ? parseFloat(freelancer.rating).toFixed(1) : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Rating</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-blue-500">
                    {freelancer.taskCounts.inProgress}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">In Progress</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-purple-500">
                    {freelancer.taskCounts.inReview}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">In Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">About</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder="Write a bio for this artist..."
                  rows={4}
                />
              ) : freelancer.bio ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {freelancer.bio}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No bio provided</p>
              )}
            </CardContent>
          </Card>

          {/* Skills & Specializations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Skills & Expertise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Skills</h4>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {editForm.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="gap-1">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="Add a skill..."
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                      />
                      <Button type="button" size="icon" variant="outline" onClick={addSkill}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {freelancer.skills && freelancer.skills.length > 0 ? (
                      freelancer.skills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No skills listed</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Specializations</h4>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {editForm.specializations.map((spec) => (
                        <Badge key={spec} variant="outline" className="gap-1">
                          {spec}
                          <button
                            type="button"
                            onClick={() => removeSpecialization(spec)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newSpecialization}
                        onChange={(e) => setNewSpecialization(e.target.value)}
                        placeholder="Add a specialization..."
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSpecialization())}
                      />
                      <Button type="button" size="icon" variant="outline" onClick={addSpecialization}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {freelancer.specializations && freelancer.specializations.length > 0 ? (
                      freelancer.specializations.map((spec) => (
                        <Badge key={spec} variant="outline">
                          {spec}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No specializations listed</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Portfolio</CardTitle>
              <CardDescription>
                {isEditing ? editForm.portfolioUrls.length : freelancer.portfolioUrls?.length || 0} portfolio link
                {(isEditing ? editForm.portfolioUrls.length : freelancer.portfolioUrls?.length) !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-2">
                  {editForm.portfolioUrls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 rounded-lg border">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate flex-1">{url}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removePortfolioUrl(url)}
                        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newPortfolioUrl}
                      onChange={(e) => setNewPortfolioUrl(e.target.value)}
                      placeholder="https://..."
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPortfolioUrl())}
                    />
                    <Button type="button" size="icon" variant="outline" onClick={addPortfolioUrl}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : freelancer.portfolioUrls && freelancer.portfolioUrls.length > 0 ? (
                <div className="space-y-2">
                  {freelancer.portfolioUrls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate flex-1">{url}</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No portfolio links provided</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Tasks</CardTitle>
              <CardDescription>
                {freelancer.taskCounts.total} total task{freelancer.taskCounts.total !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {freelancer.recentTasks && freelancer.recentTasks.length > 0 ? (
                <div className="space-y-3">
                  {freelancer.recentTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/admin/tasks/${task.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate group-hover:text-foreground">
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(task.createdAt)}
                          {task.completedAt && ` • Completed ${formatDate(task.completedAt)}`}
                        </p>
                      </div>
                      <div className="ml-3">
                        {getTaskStatusBadge(task.status)}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tasks yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
