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
import { LoadingSpinner } from "@/components/shared/loading";
import { Plus, Trash2, Search, Palette, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import {
  TONE_BUCKETS,
  ENERGY_BUCKETS,
  COLOR_BUCKETS,
  TONE_BUCKET_LABELS,
  ENERGY_BUCKET_LABELS,
  COLOR_BUCKET_LABELS,
  type ToneBucket,
  type EnergyBucket,
  type ColorBucket,
} from "@/lib/constants/reference-libraries";
import { VISUAL_STYLE_OPTIONS } from "@/components/onboarding/types";

interface BrandReference {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  toneBucket: ToneBucket;
  energyBucket: EnergyBucket;
  colorBucket: ColorBucket;
  colorSamples: string[];
  visualStyles: string[];
  industries: string[];
  displayOrder: number;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

const defaultFormState = {
  name: "",
  description: "",
  imageUrl: "",
  toneBucket: "balanced" as ToneBucket,
  energyBucket: "balanced" as EnergyBucket,
  colorBucket: "neutral" as ColorBucket,
  colorSamples: "",
  visualStyles: [] as string[],
  industries: "",
  displayOrder: 0,
};

export default function BrandReferencesPage() {
  const [references, setReferences] = useState<BrandReference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [toneFilter, setToneFilter] = useState("all");
  const [energyFilter, setEnergyFilter] = useState("all");
  const [colorFilter, setColorFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRef, setEditingRef] = useState<BrandReference | null>(null);
  const [formState, setFormState] = useState(defaultFormState);

  useEffect(() => {
    fetchReferences();
  }, []);

  const fetchReferences = async () => {
    try {
      const response = await fetch("/api/admin/brand-references");
      if (response.ok) {
        const data = await response.json();
        setReferences(data.references || []);
      }
    } catch (error) {
      console.error("Failed to fetch brand references:", error);
      toast.error("Failed to load brand references");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingRef(null);
    setFormState(defaultFormState);
    setDialogOpen(true);
  };

  const openEditDialog = (ref: BrandReference) => {
    setEditingRef(ref);
    setFormState({
      name: ref.name,
      description: ref.description || "",
      imageUrl: ref.imageUrl,
      toneBucket: ref.toneBucket,
      energyBucket: ref.energyBucket,
      colorBucket: ref.colorBucket,
      colorSamples: ref.colorSamples.join(", "),
      visualStyles: ref.visualStyles,
      industries: ref.industries.join(", "),
      displayOrder: ref.displayOrder,
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
        toneBucket: formState.toneBucket,
        energyBucket: formState.energyBucket,
        colorBucket: formState.colorBucket,
        colorSamples: formState.colorSamples.split(",").map((s) => s.trim()).filter(Boolean),
        visualStyles: formState.visualStyles,
        industries: formState.industries.split(",").map((s) => s.trim()).filter(Boolean),
        displayOrder: formState.displayOrder,
      };

      if (editingRef) {
        const response = await fetch(`/api/admin/brand-references/${editingRef.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to update");

        const data = await response.json();
        setReferences((prev) =>
          prev.map((r) => (r.id === editingRef.id ? data.reference : r))
        );
        toast.success("Brand reference updated!");
      } else {
        const response = await fetch("/api/admin/brand-references", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to create");

        const data = await response.json();
        setReferences((prev) => [data.reference, ...prev]);
        toast.success("Brand reference created!");
      }

      setDialogOpen(false);
      setFormState(defaultFormState);
      setEditingRef(null);
    } catch {
      toast.error(editingRef ? "Failed to update brand reference" : "Failed to create brand reference");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/brand-references?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setReferences((prev) => prev.filter((r) => r.id !== id));
      toast.success("Brand reference deleted");
    } catch {
      toast.error("Failed to delete brand reference");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (ref: BrandReference) => {
    setTogglingId(ref.id);
    try {
      const response = await fetch(`/api/admin/brand-references/${ref.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !ref.isActive }),
      });

      if (!response.ok) throw new Error("Failed to toggle");

      const data = await response.json();
      setReferences((prev) =>
        prev.map((r) => (r.id === ref.id ? data.reference : r))
      );
      toast.success(data.reference.isActive ? "Reference activated" : "Reference deactivated");
    } catch {
      toast.error("Failed to toggle status");
    } finally {
      setTogglingId(null);
    }
  };

  const toggleVisualStyle = (styleValue: string) => {
    setFormState((prev) => ({
      ...prev,
      visualStyles: prev.visualStyles.includes(styleValue)
        ? prev.visualStyles.filter((s) => s !== styleValue)
        : [...prev.visualStyles, styleValue],
    }));
  };

  const filteredReferences = references.filter((ref) => {
    const matchesSearch =
      searchTerm === "" ||
      ref.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.visualStyles.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTone = toneFilter === "all" || ref.toneBucket === toneFilter;
    const matchesEnergy = energyFilter === "all" || ref.energyBucket === energyFilter;
    const matchesColor = colorFilter === "all" || ref.colorBucket === colorFilter;

    return matchesSearch && matchesTone && matchesEnergy && matchesColor;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brand Library</h1>
          <p className="text-muted-foreground">
            Manage brand inspiration references for onboarding
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Reference
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRef ? "Edit Brand Reference" : "Add Brand Reference"}
              </DialogTitle>
              <DialogDescription>
                {editingRef
                  ? "Update the brand reference details"
                  : "Add a new brand inspiration reference"}
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
                    placeholder="e.g., Modern Tech Startup"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    value={formState.displayOrder}
                    onChange={(e) => setFormState({ ...formState, displayOrder: parseInt(e.target.value) || 0 })}
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
                  placeholder="Brief description of this brand style..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tone Bucket *</Label>
                  <Select
                    value={formState.toneBucket}
                    onValueChange={(value) => setFormState({ ...formState, toneBucket: value as ToneBucket })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONE_BUCKETS.map((bucket) => (
                        <SelectItem key={bucket} value={bucket}>
                          {TONE_BUCKET_LABELS[bucket]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Energy Bucket *</Label>
                  <Select
                    value={formState.energyBucket}
                    onValueChange={(value) => setFormState({ ...formState, energyBucket: value as EnergyBucket })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENERGY_BUCKETS.map((bucket) => (
                        <SelectItem key={bucket} value={bucket}>
                          {ENERGY_BUCKET_LABELS[bucket]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color Bucket *</Label>
                  <Select
                    value={formState.colorBucket}
                    onValueChange={(value) => setFormState({ ...formState, colorBucket: value as ColorBucket })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_BUCKETS.map((bucket) => (
                        <SelectItem key={bucket} value={bucket}>
                          {COLOR_BUCKET_LABELS[bucket]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Visual Styles</Label>
                <div className="flex flex-wrap gap-2">
                  {VISUAL_STYLE_OPTIONS.map((style) => (
                    <Badge
                      key={style.value}
                      variant={formState.visualStyles.includes(style.value) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleVisualStyle(style.value)}
                    >
                      {style.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="colorSamples">Color Samples (comma-separated hex)</Label>
                <Input
                  id="colorSamples"
                  value={formState.colorSamples}
                  onChange={(e) => setFormState({ ...formState, colorSamples: e.target.value })}
                  placeholder="#FF5733, #2C3E50, #3498DB"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industries">Industries (comma-separated)</Label>
                <Input
                  id="industries"
                  value={formState.industries}
                  onChange={(e) => setFormState({ ...formState, industries: e.target.value })}
                  placeholder="Technology, SaaS, Finance"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <LoadingSpinner size="sm" /> : editingRef ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search references..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={toneFilter} onValueChange={setToneFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Tone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tones</SelectItem>
            {TONE_BUCKETS.map((bucket) => (
              <SelectItem key={bucket} value={bucket}>
                {TONE_BUCKET_LABELS[bucket]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={energyFilter} onValueChange={setEnergyFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Energy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Energy</SelectItem>
            {ENERGY_BUCKETS.map((bucket) => (
              <SelectItem key={bucket} value={bucket}>
                {ENERGY_BUCKET_LABELS[bucket]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={colorFilter} onValueChange={setColorFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Colors</SelectItem>
            {COLOR_BUCKETS.map((bucket) => (
              <SelectItem key={bucket} value={bucket}>
                {COLOR_BUCKET_LABELS[bucket]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brand References</CardTitle>
          <CardDescription>
            {filteredReferences.length} reference{filteredReferences.length !== 1 ? "s" : ""} in library
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-72 w-full" />
              ))}
            </div>
          ) : filteredReferences.length === 0 ? (
            <div className="text-center py-12">
              <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No brand references found</p>
              <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                Add your first reference
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredReferences.map((ref) => (
                <Card key={ref.id} className={`overflow-hidden ${!ref.isActive ? "opacity-60" : ""}`}>
                  <div className="aspect-video relative bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={ref.imageUrl}
                      alt={ref.name}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://via.placeholder.com/400x225?text=Image+Not+Found";
                      }}
                    />
                    {!ref.isActive && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary">Inactive</Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{ref.name}</h3>
                        {ref.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {ref.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(ref)}
                          disabled={togglingId === ref.id}
                        >
                          {togglingId === ref.id ? (
                            <LoadingSpinner size="sm" />
                          ) : ref.isActive ? (
                            <ToggleRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(ref)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(ref.id)}
                          disabled={deletingId === ref.id}
                        >
                          {deletingId === ref.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {TONE_BUCKET_LABELS[ref.toneBucket]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {ENERGY_BUCKET_LABELS[ref.energyBucket]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {COLOR_BUCKET_LABELS[ref.colorBucket]}
                      </Badge>
                    </div>
                    {ref.visualStyles.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {ref.visualStyles.slice(0, 2).map((style) => (
                          <Badge key={style} variant="secondary" className="text-xs">
                            {style.replace("-", " ")}
                          </Badge>
                        ))}
                        {ref.visualStyles.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{ref.visualStyles.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Used {ref.usageCount} times
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
