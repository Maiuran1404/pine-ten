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
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LoadingSpinner } from "@/components/shared/loading";
import {
  Plus,
  Trash2,
  Search,
  LayoutTemplate,
  Pencil,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  ImageIcon,
  TrendingUp,
  Layers,
  MessageSquare,
  Grid3X3,
  Upload,
  Palette,
} from "lucide-react";
import {
  DELIVERABLE_TYPES,
  STYLE_AXES,
  type DeliverableType,
  type StyleAxis,
} from "@/lib/constants/reference-libraries";
import { DeliverableStyleUploader } from "@/components/admin/deliverable-style-uploader";
import { DeliverableStyleScraper } from "@/components/admin/deliverable-style-scraper";
import { StatCard } from "@/components/admin/stat-card";
import { cn } from "@/lib/utils";

interface DeliverableStyleReference {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  deliverableType: DeliverableType;
  styleAxis: StyleAxis;
  subStyle: string | null;
  semanticTags: string[];
  featuredOrder: number;
  displayOrder: number;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  // Extended fields
  colorTemperature?: string;
  energyLevel?: string;
  densityLevel?: string;
  formalityLevel?: string;
  colorSamples?: string[];
  industries?: string[];
  targetAudience?: string;
  visualElements?: string[];
  moodKeywords?: string[];
}

interface Stats {
  total: number;
  active: number;
  typesCount: number;
  axesCount: number;
  totalUsage: number;
  coverageScore: number;
  matrix: Record<string, number>;
  gaps: number;
  missingColors: number;
  missingColorsByType: Record<string, number>;
}

const defaultFormState = {
  name: "",
  description: "",
  imageUrl: "",
  deliverableType: "instagram_post" as DeliverableType,
  styleAxis: "minimal" as StyleAxis,
  subStyle: "",
  semanticTags: "",
  featuredOrder: 0,
  displayOrder: 0,
};

// Matrix cell component
function MatrixCell({
  count,
  deliverableType,
  styleAxis,
  isSelected,
  onClick,
}: {
  count: number;
  deliverableType: DeliverableType;
  styleAxis: StyleAxis;
  isSelected: boolean;
  onClick: () => void;
}) {
  const getColor = (count: number) => {
    if (count === 0) return "bg-red-500/20 border-red-500/30 hover:bg-red-500/30";
    if (count <= 2) return "bg-yellow-500/20 border-yellow-500/30 hover:bg-yellow-500/30";
    if (count <= 5) return "bg-green-500/20 border-green-500/30 hover:bg-green-500/30";
    return "bg-green-500/40 border-green-500/50 hover:bg-green-500/50";
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full h-10 rounded border text-sm font-medium transition-all",
        getColor(count),
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      title={`${DELIVERABLE_TYPES.find(t => t.value === deliverableType)?.label} - ${STYLE_AXES.find(a => a.value === styleAxis)?.label}: ${count} styles`}
    >
      {count}
    </button>
  );
}

export default function DeliverableStylesPage() {
  const [styles, setStyles] = useState<DeliverableStyleReference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [axisFilter, setAxisFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<DeliverableStyleReference | null>(null);
  const [formState, setFormState] = useState(defaultFormState);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCell, setSelectedCell] = useState<{ deliverableType: DeliverableType; styleAxis: StyleAxis } | null>(null);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    typesCount: 0,
    axesCount: 0,
    totalUsage: 0,
    coverageScore: 0,
    matrix: {},
    gaps: 0,
    missingColors: 0,
    missingColorsByType: {},
  });

  useEffect(() => {
    fetchStyles();
  }, []);

  useEffect(() => {
    if (styles.length > 0) {
      calculateStats();
    }
  }, [styles]);

  const calculateStats = () => {
    const active = styles.filter(s => s.isActive);
    const typesUsed = new Set(styles.map(s => s.deliverableType));
    const axesUsed = new Set(styles.map(s => s.styleAxis));
    const totalUsage = styles.reduce((sum, s) => sum + s.usageCount, 0);

    // Build coverage matrix
    const matrix: Record<string, number> = {};
    for (const type of DELIVERABLE_TYPES) {
      for (const axis of STYLE_AXES) {
        const key = `${type.value}-${axis.value}`;
        matrix[key] = active.filter(
          s => s.deliverableType === type.value && s.styleAxis === axis.value
        ).length;
      }
    }

    const totalCells = DELIVERABLE_TYPES.length * STYLE_AXES.length;
    const gaps = Object.values(matrix).filter(count => count < 2).length;
    const coverageScore = Math.round(((totalCells - gaps) / totalCells) * 100);

    // Calculate missing colors - styles without colorSamples data
    const missingColors = active.filter(
      s => !s.colorSamples || s.colorSamples.length === 0
    ).length;

    // Group missing colors by deliverable type
    const missingColorsByType: Record<string, number> = {};
    for (const type of DELIVERABLE_TYPES) {
      const typeStyles = active.filter(s => s.deliverableType === type.value);
      const missingCount = typeStyles.filter(
        s => !s.colorSamples || s.colorSamples.length === 0
      ).length;
      if (missingCount > 0) {
        missingColorsByType[type.value] = missingCount;
      }
    }

    setStats({
      total: styles.length,
      active: active.length,
      typesCount: typesUsed.size,
      axesCount: axesUsed.size,
      totalUsage,
      coverageScore,
      matrix,
      gaps,
      missingColors,
      missingColorsByType,
    });
  };

  const fetchStyles = async () => {
    try {
      const response = await fetch("/api/admin/deliverable-styles");
      if (response.ok) {
        const result = await response.json();
        const styles = result.data?.styles || [];
        setStyles(styles);
        const types = new Set<string>(styles.map((s: DeliverableStyleReference) => s.deliverableType));
        setExpandedTypes(types);
      }
    } catch (error) {
      console.error("Failed to fetch deliverable styles:", error);
      toast.error("Failed to load deliverable styles");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingStyle(null);
    setFormState(defaultFormState);
    setDialogOpen(true);
  };

  const openEditDialog = (style: DeliverableStyleReference) => {
    setEditingStyle(style);
    setFormState({
      name: style.name,
      description: style.description || "",
      imageUrl: style.imageUrl,
      deliverableType: style.deliverableType,
      styleAxis: style.styleAxis,
      subStyle: style.subStyle || "",
      semanticTags: style.semanticTags.join(", "),
      featuredOrder: style.featuredOrder,
      displayOrder: style.displayOrder,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formState.name || !formState.imageUrl) {
      toast.error("Please fill in name and image URL");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formState.name,
        description: formState.description || null,
        imageUrl: formState.imageUrl,
        deliverableType: formState.deliverableType,
        styleAxis: formState.styleAxis,
        subStyle: formState.subStyle || null,
        semanticTags: formState.semanticTags.split(",").map((s) => s.trim()).filter(Boolean),
        featuredOrder: formState.featuredOrder,
        displayOrder: formState.displayOrder,
      };

      if (editingStyle) {
        const response = await fetch(`/api/admin/deliverable-styles/${editingStyle.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to update");

        const result = await response.json();
        setStyles((prev) =>
          prev.map((s) => (s.id === editingStyle.id ? result.data.style : s))
        );
        toast.success("Deliverable style updated!");
      } else {
        const response = await fetch("/api/admin/deliverable-styles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to create");

        const result = await response.json();
        setStyles((prev) => [result.data.style, ...prev]);
        setExpandedTypes((prev) => new Set([...prev, result.data.style.deliverableType]));
        toast.success("Deliverable style created!");
      }

      setDialogOpen(false);
      setFormState(defaultFormState);
      setEditingStyle(null);
    } catch {
      toast.error(editingStyle ? "Failed to update style" : "Failed to create style");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/deliverable-styles?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setStyles((prev) => prev.filter((s) => s.id !== id));
      toast.success("Deliverable style deleted");
    } catch {
      toast.error("Failed to delete style");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (style: DeliverableStyleReference) => {
    setTogglingId(style.id);
    try {
      const response = await fetch(`/api/admin/deliverable-styles/${style.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !style.isActive }),
      });

      if (!response.ok) throw new Error("Failed to toggle");

      const result = await response.json();
      setStyles((prev) =>
        prev.map((s) => (s.id === style.id ? result.data.style : s))
      );
      toast.success(result.data.style.isActive ? "Style activated" : "Style deactivated");
    } catch {
      toast.error("Failed to toggle status");
    } finally {
      setTogglingId(null);
    }
  };

  const toggleTypeExpanded = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const filteredStyles = styles.filter((style) => {
    const matchesSearch =
      searchTerm === "" ||
      style.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      style.semanticTags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === "all" || style.deliverableType === typeFilter;
    const matchesAxis = axisFilter === "all" || style.styleAxis === axisFilter;

    // Filter by selected cell if any
    const matchesCell = !selectedCell ||
      (style.deliverableType === selectedCell.deliverableType &&
       style.styleAxis === selectedCell.styleAxis);

    return matchesSearch && matchesType && matchesAxis && matchesCell;
  });

  // Group styles by deliverable type
  const groupedStyles = filteredStyles.reduce((acc, style) => {
    if (!acc[style.deliverableType]) {
      acc[style.deliverableType] = [];
    }
    acc[style.deliverableType].push(style);
    return acc;
  }, {} as Record<string, DeliverableStyleReference[]>);

  const getDeliverableTypeLabel = (value: string) => {
    return DELIVERABLE_TYPES.find((t) => t.value === value)?.label || value;
  };

  const getStyleAxisLabel = (value: string) => {
    return STYLE_AXES.find((a) => a.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reference Library</h1>
          <p className="text-muted-foreground">
            Manage design style references shown in chat conversations
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Style
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStyle ? "Edit Deliverable Style" : "Add Deliverable Style"}
              </DialogTitle>
              <DialogDescription>
                {editingStyle
                  ? "Update the deliverable style details"
                  : "Add a new style reference for chat suggestions"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    placeholder="e.g., Clean Minimal Post"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subStyle">Sub-Style (optional)</Label>
                  <Input
                    id="subStyle"
                    value={formState.subStyle}
                    onChange={(e) => setFormState({ ...formState, subStyle: e.target.value })}
                    placeholder="e.g., dark-mode, gradient"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL *</Label>
                <Input
                  id="imageUrl"
                  value={formState.imageUrl}
                  onChange={(e) => setFormState({ ...formState, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
                {formState.imageUrl && (
                  <div className="mt-2 aspect-video max-w-xs rounded-lg overflow-hidden bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formState.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  placeholder="Brief description of this style..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deliverable Type *</Label>
                  <Select
                    value={formState.deliverableType}
                    onValueChange={(value) => setFormState({ ...formState, deliverableType: value as DeliverableType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DELIVERABLE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Style Axis *</Label>
                  <Select
                    value={formState.styleAxis}
                    onValueChange={(value) => setFormState({ ...formState, styleAxis: value as StyleAxis })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLE_AXES.map((axis) => (
                        <SelectItem key={axis.value} value={axis.value}>
                          {axis.label} - {axis.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="featuredOrder">Featured Order</Label>
                  <Input
                    id="featuredOrder"
                    type="number"
                    value={formState.featuredOrder}
                    onChange={(e) => setFormState({ ...formState, featuredOrder: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Lower = shown first when style is featured</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={formState.displayOrder}
                    onChange={(e) => setFormState({ ...formState, displayOrder: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Order within same style axis</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="semanticTags">Semantic Tags (comma-separated)</Label>
                <Input
                  id="semanticTags"
                  value={formState.semanticTags}
                  onChange={(e) => setFormState({ ...formState, semanticTags: e.target.value })}
                  placeholder="gen-z, luxury, tech-forward, startup"
                />
                <p className="text-xs text-muted-foreground">Tags help AI match styles to brand context</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <LoadingSpinner size="sm" /> : editingStyle ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Browse
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          {!isLoading && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <StatCard
                label="Total Styles"
                value={stats.total}
                subtext={`${stats.active} active`}
                icon={ImageIcon}
              />
              <StatCard
                label="Coverage Score"
                value={`${stats.coverageScore}%`}
                subtext={`${stats.gaps} gaps remaining`}
                icon={Grid3X3}
                trend={stats.coverageScore >= 80 ? "up" : stats.coverageScore >= 50 ? "neutral" : "down"}
              />
              <StatCard
                label="Types Covered"
                value={stats.typesCount}
                subtext={`of ${DELIVERABLE_TYPES.length} available`}
                icon={Layers}
              />
              <StatCard
                label="Total Usage"
                value={stats.totalUsage}
                subtext="Times shown in chat"
                icon={MessageSquare}
                trend="up"
              />
              <StatCard
                label="Missing Colors"
                value={stats.missingColors}
                subtext={stats.missingColors === 0 ? "All styles have colors" : `of ${stats.active} active styles`}
                icon={Palette}
                trend={stats.missingColors === 0 ? "up" : stats.missingColors > stats.active / 2 ? "down" : "neutral"}
              />
            </div>
          )}

          {/* Missing Colors Detail */}
          {!isLoading && stats.missingColors > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Palette className="h-5 w-5" />
                  Color Data Missing
                </CardTitle>
                <CardDescription>
                  These deliverable types have styles without color information. Add colorSamples to improve matching accuracy.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(stats.missingColorsByType).map(([typeValue, count]) => (
                    <div
                      key={typeValue}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-amber-500/20"
                    >
                      <span className="text-sm font-medium">
                        {getDeliverableTypeLabel(typeValue)}
                      </span>
                      <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                        {count} missing
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Tip: Edit styles in the Browse tab to add color hex codes (e.g., #FF5733, #2C3E50)
                </p>
              </CardContent>
            </Card>
          )}

          {/* Coverage Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5" />
                Coverage Matrix
              </CardTitle>
              <CardDescription>
                Click a cell to filter the browse view. Aim for 3+ styles per combination.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="overflow-x-auto">
                  {/* Header row */}
                  <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `120px repeat(${STYLE_AXES.length}, minmax(60px, 1fr))` }}>
                    <div />
                    {STYLE_AXES.map((axis) => (
                      <div key={axis.value} className="text-xs font-medium text-center text-muted-foreground truncate px-1">
                        {axis.label}
                      </div>
                    ))}
                  </div>

                  {/* Matrix rows */}
                  {DELIVERABLE_TYPES.map((type) => (
                    <div key={type.value} className="grid gap-2 mb-2" style={{ gridTemplateColumns: `120px repeat(${STYLE_AXES.length}, minmax(60px, 1fr))` }}>
                      <div className="flex items-center text-xs font-medium text-muted-foreground truncate pr-2">
                        {type.label}
                      </div>
                      {STYLE_AXES.map((axis) => (
                        <MatrixCell
                          key={`${type.value}-${axis.value}`}
                          count={stats.matrix[`${type.value}-${axis.value}`] || 0}
                          deliverableType={type.value as DeliverableType}
                          styleAxis={axis.value as StyleAxis}
                          isSelected={
                            selectedCell?.deliverableType === type.value &&
                            selectedCell?.styleAxis === axis.value
                          }
                          onClick={() => {
                            setSelectedCell({ deliverableType: type.value as DeliverableType, styleAxis: axis.value as StyleAxis });
                            setActiveTab("browse");
                          }}
                        />
                      ))}
                    </div>
                  ))}

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30" />
                      <span className="text-muted-foreground">Empty</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-yellow-500/20 border border-yellow-500/30" />
                      <span className="text-muted-foreground">1-2</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/30" />
                      <span className="text-muted-foreground">3-5</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-green-500/40 border border-green-500/50" />
                      <span className="text-muted-foreground">6+</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Find first empty cell
                    for (const type of DELIVERABLE_TYPES) {
                      for (const axis of STYLE_AXES) {
                        if ((stats.matrix[`${type.value}-${axis.value}`] || 0) === 0) {
                          setSelectedCell({ deliverableType: type.value as DeliverableType, styleAxis: axis.value as StyleAxis });
                          setActiveTab("upload");
                          toast.info(`Upload styles for ${type.label} - ${axis.label}`);
                          return;
                        }
                      }
                    }
                    toast.info("All combinations have at least one style!");
                  }}
                >
                  Fill Empty Gaps
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCell(null);
                    setActiveTab("browse");
                  }}
                >
                  View All Styles
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          {selectedCell && (
            <Card className="border-primary">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Uploading for: {getDeliverableTypeLabel(selectedCell.deliverableType)} - {getStyleAxisLabel(selectedCell.styleAxis)}</p>
                    <p className="text-sm text-muted-foreground">
                      Current count: {stats.matrix[`${selectedCell.deliverableType}-${selectedCell.styleAxis}`] || 0}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCell(null)}>
                    Clear Filter
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid lg:grid-cols-2 gap-6">
            <DeliverableStyleUploader onUploadComplete={fetchStyles} />
            <DeliverableStyleScraper onUploadComplete={fetchStyles} />
          </div>
        </TabsContent>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search styles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Deliverable Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {DELIVERABLE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={axisFilter} onValueChange={setAxisFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Style Axis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Styles</SelectItem>
                {STYLE_AXES.map((axis) => (
                  <SelectItem key={axis.value} value={axis.value}>
                    {axis.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCell && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedCell(null)}>
                {getDeliverableTypeLabel(selectedCell.deliverableType)} - {getStyleAxisLabel(selectedCell.styleAxis)}
                <span className="ml-1">×</span>
              </Badge>
            )}
          </div>

          {/* Styles Grid */}
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : Object.keys(groupedStyles).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <LayoutTemplate className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">No Styles Found</h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  {searchTerm || typeFilter !== "all" || axisFilter !== "all" || selectedCell
                    ? "Try adjusting your filters to see more results."
                    : "Add style references that will be shown to clients during chat conversations."}
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Style
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedStyles).map(([type, typeStyles]) => (
                <Collapsible
                  key={type}
                  open={expandedTypes.has(type)}
                  onOpenChange={() => toggleTypeExpanded(type)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {expandedTypes.has(type) ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                            <CardTitle className="text-lg">{getDeliverableTypeLabel(type)}</CardTitle>
                          </div>
                          <CardDescription>
                            {typeStyles.length} style{typeStyles.length !== 1 ? "s" : ""}
                          </CardDescription>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {typeStyles.map((style) => (
                            <Card key={style.id} className={`overflow-hidden ${!style.isActive ? "opacity-60" : ""}`}>
                              <div className="aspect-square relative bg-muted">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={style.imageUrl}
                                  alt={style.name}
                                  className="object-cover w-full h-full"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "https://via.placeholder.com/400x400?text=Image+Not+Found";
                                  }}
                                />
                                {!style.isActive && (
                                  <div className="absolute top-2 left-2">
                                    <Badge variant="secondary">Inactive</Badge>
                                  </div>
                                )}
                                {style.isActive && (!style.colorSamples || style.colorSamples.length === 0) && (
                                  <div className="absolute top-2 left-2">
                                    <Badge variant="outline" className="bg-amber-500/90 text-white border-0 text-[10px]">
                                      No colors
                                    </Badge>
                                  </div>
                                )}
                                <div className="absolute top-2 right-2">
                                  <Badge variant="default" className="text-xs">
                                    {getStyleAxisLabel(style.styleAxis)}
                                  </Badge>
                                </div>
                                {/* Color samples */}
                                {style.colorSamples && style.colorSamples.length > 0 && (
                                  <div className="absolute bottom-2 left-2 flex gap-0.5">
                                    {style.colorSamples.slice(0, 5).map((color, i) => (
                                      <div
                                        key={i}
                                        className="w-4 h-4 rounded-full border border-white/50"
                                        style={{ backgroundColor: color }}
                                        title={color}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between mb-1">
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-medium text-sm truncate">{style.name}</h3>
                                    {style.subStyle && (
                                      <p className="text-xs text-muted-foreground">{style.subStyle}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-0.5 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleToggleActive(style)}
                                      disabled={togglingId === style.id}
                                    >
                                      {togglingId === style.id ? (
                                        <LoadingSpinner size="sm" />
                                      ) : style.isActive ? (
                                        <ToggleRight className="h-3.5 w-3.5 text-green-500" />
                                      ) : (
                                        <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
                                      )}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => openEditDialog(style)}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() => handleDelete(style.id)}
                                      disabled={deletingId === style.id}
                                    >
                                      {deletingId === style.id ? (
                                        <LoadingSpinner size="sm" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                                {/* Extended metadata */}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {style.industries && style.industries.slice(0, 2).map((ind) => (
                                    <Badge key={ind} variant="outline" className="text-[10px] px-1.5 py-0">
                                      {ind}
                                    </Badge>
                                  ))}
                                  {style.semanticTags.slice(0, 2).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
