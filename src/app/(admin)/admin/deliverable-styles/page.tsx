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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LoadingSpinner } from "@/components/shared/loading";
import { Plus, Trash2, Search, LayoutTemplate, Pencil, ToggleLeft, ToggleRight, ChevronDown, ChevronRight } from "lucide-react";
import {
  DELIVERABLE_TYPES,
  STYLE_AXES,
  type DeliverableType,
  type StyleAxis,
} from "@/lib/constants/reference-libraries";

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

  useEffect(() => {
    fetchStyles();
  }, []);

  const fetchStyles = async () => {
    try {
      const response = await fetch("/api/admin/deliverable-styles");
      if (response.ok) {
        const data = await response.json();
        setStyles(data.styles || []);
        // Auto-expand all types that have styles
        const types = new Set<string>(data.styles.map((s: DeliverableStyleReference) => s.deliverableType));
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

        const data = await response.json();
        setStyles((prev) =>
          prev.map((s) => (s.id === editingStyle.id ? data.style : s))
        );
        toast.success("Deliverable style updated!");
      } else {
        const response = await fetch("/api/admin/deliverable-styles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to create");

        const data = await response.json();
        setStyles((prev) => [data.style, ...prev]);
        // Expand the type group for the new style
        setExpandedTypes((prev) => new Set([...prev, data.style.deliverableType]));
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

      const data = await response.json();
      setStyles((prev) =>
        prev.map((s) => (s.id === style.id ? data.style : s))
      );
      toast.success(data.style.isActive ? "Style activated" : "Style deactivated");
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

    return matchesSearch && matchesType && matchesAxis;
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
          <h1 className="text-3xl font-bold tracking-tight">Deliverable Styles</h1>
          <p className="text-muted-foreground">
            Manage style references shown in chat for deliverable requests
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
      </div>

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
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <LayoutTemplate className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No deliverable styles found</p>
              <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                Add your first style
              </Button>
            </div>
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
                            <div className="absolute top-2 right-2">
                              <Badge variant="default" className="text-xs">
                                {getStyleAxisLabel(style.styleAxis)}
                              </Badge>
                            </div>
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
                            {style.semanticTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {style.semanticTags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
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
    </div>
  );
}
