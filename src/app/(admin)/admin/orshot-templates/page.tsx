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
import { Switch } from "@/components/ui/switch";
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
import {
  Plus,
  Trash2,
  Search,
  Wand2,
  Edit,
  Copy,
  Share2,
  Megaphone,
  PenTool,
} from "lucide-react";

interface ParameterMappingEntry {
  paramId: string;
  type: "text" | "color" | "image" | "number";
  style?: {
    fontSize?: string;
    fontFamily?: string;
    fontWeight?: string;
    textAlign?: string;
  };
}

interface ParameterMapping {
  [brandField: string]: ParameterMappingEntry;
}

interface OrshotTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  orshotTemplateId: number;
  previewImageUrl: string | null;
  parameterMapping: ParameterMapping;
  outputFormat: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "social_media", label: "Social Media", icon: Share2 },
  { value: "marketing", label: "Marketing", icon: Megaphone },
  { value: "brand_assets", label: "Brand Assets", icon: PenTool },
];

const OUTPUT_FORMATS = ["png", "jpg", "webp", "pdf"];

const BRAND_FIELDS = [
  { value: "name", label: "Company Name", type: "text" as const },
  { value: "logoUrl", label: "Logo URL", type: "image" as const },
  { value: "primaryColor", label: "Primary Color", type: "color" as const },
  { value: "secondaryColor", label: "Secondary Color", type: "color" as const },
  { value: "accentColor", label: "Accent Color", type: "color" as const },
  { value: "backgroundColor", label: "Background Color", type: "color" as const },
  { value: "textColor", label: "Text Color", type: "color" as const },
  { value: "tagline", label: "Tagline", type: "text" as const },
  { value: "primaryFont", label: "Primary Font", type: "text" as const },
  { value: "secondaryFont", label: "Secondary Font", type: "text" as const },
];

const DEFAULT_FORM_STATE = {
  name: "",
  description: "",
  category: "social_media",
  orshotTemplateId: "",
  previewImageUrl: "",
  outputFormat: "png",
  parameterMapping: {} as ParameterMapping,
};

export default function OrshotTemplatesPage() {
  const [templates, setTemplates] = useState<OrshotTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<OrshotTemplate | null>(
    null
  );
  const [formState, setFormState] = useState(DEFAULT_FORM_STATE);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/admin/orshot-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormState(DEFAULT_FORM_STATE);
    setDialogOpen(true);
  };

  const openEditDialog = (template: OrshotTemplate) => {
    setEditingTemplate(template);
    setFormState({
      name: template.name,
      description: template.description || "",
      category: template.category,
      orshotTemplateId: template.orshotTemplateId.toString(),
      previewImageUrl: template.previewImageUrl || "",
      outputFormat: template.outputFormat,
      parameterMapping: template.parameterMapping,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (
      !formState.name ||
      !formState.category ||
      !formState.orshotTemplateId
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const templateId = parseInt(formState.orshotTemplateId);
    if (isNaN(templateId) || templateId <= 0) {
      toast.error("Orshot Template ID must be a positive number");
      return;
    }

    if (Object.keys(formState.parameterMapping).length === 0) {
      toast.error("Please add at least one parameter mapping");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formState.name,
        description: formState.description || null,
        category: formState.category,
        orshotTemplateId: templateId,
        previewImageUrl: formState.previewImageUrl || null,
        outputFormat: formState.outputFormat,
        parameterMapping: formState.parameterMapping,
      };

      let response;
      if (editingTemplate) {
        response = await fetch(
          `/api/admin/orshot-templates/${editingTemplate.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
      } else {
        response = await fetch("/api/admin/orshot-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save template");
      }

      const data = await response.json();

      if (editingTemplate) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === editingTemplate.id ? data.template : t))
        );
        toast.success("Template updated!");
      } else {
        setTemplates((prev) => [data.template, ...prev]);
        toast.success("Template created!");
      }

      setDialogOpen(false);
      setFormState(DEFAULT_FORM_STATE);
      setEditingTemplate(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save template"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/orshot-templates?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (template: OrshotTemplate) => {
    try {
      const response = await fetch(
        `/api/admin/orshot-templates/${template.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !template.isActive }),
        }
      );

      if (!response.ok) throw new Error("Failed to update");

      setTemplates((prev) =>
        prev.map((t) =>
          t.id === template.id ? { ...t, isActive: !t.isActive } : t
        )
      );
      toast.success(
        template.isActive ? "Template deactivated" : "Template activated"
      );
    } catch {
      toast.error("Failed to update template");
    }
  };

  const addParameterMapping = (brandField: string) => {
    const field = BRAND_FIELDS.find((f) => f.value === brandField);
    if (!field) return;

    setFormState((prev) => ({
      ...prev,
      parameterMapping: {
        ...prev.parameterMapping,
        [brandField]: {
          paramId: "",
          type: field.type,
        },
      },
    }));
  };

  const updateParameterMapping = (
    brandField: string,
    paramId: string
  ) => {
    setFormState((prev) => ({
      ...prev,
      parameterMapping: {
        ...prev.parameterMapping,
        [brandField]: {
          ...prev.parameterMapping[brandField],
          paramId,
        },
      },
    }));
  };

  const removeParameterMapping = (brandField: string) => {
    setFormState((prev) => {
      const newMapping = { ...prev.parameterMapping };
      delete newMapping[brandField];
      return { ...prev, parameterMapping: newMapping };
    });
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchTerm === "" ||
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || template.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find((c) => c.value === category) || CATEGORIES[0];
  };

  const availableBrandFields = BRAND_FIELDS.filter(
    (f) => !Object.keys(formState.parameterMapping).includes(f.value)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Orshot Templates
          </h1>
          <p className="text-muted-foreground">
            Configure Quick Design templates for clients
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Edit Template" : "Add Orshot Template"}
              </DialogTitle>
              <DialogDescription>
                Configure a template preset for Quick Design generation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formState.name}
                    onChange={(e) =>
                      setFormState({ ...formState, name: e.target.value })
                    }
                    placeholder="e.g., Instagram Post"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formState.category}
                    onValueChange={(value) =>
                      setFormState({ ...formState, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formState.description}
                  onChange={(e) =>
                    setFormState({ ...formState, description: e.target.value })
                  }
                  placeholder="Describe what this template is for..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orshotTemplateId">Orshot Template ID *</Label>
                  <Input
                    id="orshotTemplateId"
                    type="number"
                    value={formState.orshotTemplateId}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        orshotTemplateId: e.target.value,
                      })
                    }
                    placeholder="e.g., 123"
                  />
                  <p className="text-xs text-muted-foreground">
                    The ID from your Orshot Studio template
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outputFormat">Output Format</Label>
                  <Select
                    value={formState.outputFormat}
                    onValueChange={(value) =>
                      setFormState({ ...formState, outputFormat: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OUTPUT_FORMATS.map((format) => (
                        <SelectItem key={format} value={format}>
                          {format.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="previewImageUrl">Preview Image URL</Label>
                <Input
                  id="previewImageUrl"
                  value={formState.previewImageUrl}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      previewImageUrl: e.target.value,
                    })
                  }
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  A preview thumbnail shown to clients
                </p>
              </div>

              {/* Parameter Mapping */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Parameter Mapping *</Label>
                    <p className="text-xs text-muted-foreground">
                      Map client brand fields to Orshot template parameters
                    </p>
                  </div>
                  {availableBrandFields.length > 0 && (
                    <Select onValueChange={addParameterMapping}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Add mapping..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBrandFields.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-3">
                  {Object.entries(formState.parameterMapping).map(
                    ([brandField, mapping]) => {
                      const field = BRAND_FIELDS.find(
                        (f) => f.value === brandField
                      );
                      return (
                        <div
                          key={brandField}
                          className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                        >
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Brand Field
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{mapping.type}</Badge>
                                <span className="font-medium text-sm">
                                  {field?.label}
                                </span>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">
                                Orshot Parameter ID
                              </Label>
                              <Input
                                value={mapping.paramId}
                                onChange={(e) =>
                                  updateParameterMapping(
                                    brandField,
                                    e.target.value
                                  )
                                }
                                placeholder="e.g., company_text"
                                className="mt-1 h-8"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive shrink-0"
                            onClick={() => removeParameterMapping(brandField)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    }
                  )}

                  {Object.keys(formState.parameterMapping).length === 0 && (
                    <div className="text-center py-8 border rounded-lg border-dashed">
                      <Wand2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No parameter mappings yet
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Add mappings to connect brand data to template fields
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setEditingTemplate(null);
                  setFormState(DEFAULT_FORM_STATE);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <LoadingSpinner size="sm" />
                ) : editingTemplate ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Presets</CardTitle>
          <CardDescription>
            {filteredTemplates.length} template
            {filteredTemplates.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Wand2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No templates found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={openCreateDialog}
              >
                Add your first template
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => {
                const categoryInfo = getCategoryInfo(template.category);
                const CategoryIcon = categoryInfo.icon;
                return (
                  <Card
                    key={template.id}
                    className={`overflow-hidden ${
                      !template.isActive ? "opacity-60" : ""
                    }`}
                  >
                    <div className="aspect-video relative bg-muted">
                      {template.previewImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={template.previewImageUrl}
                          alt={template.name}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://via.placeholder.com/400x225?text=No+Preview";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <CategoryIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant={template.isActive ? "default" : "secondary"}
                        >
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{template.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {categoryInfo.label}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {template.outputFormat.toUpperCase()}
                        </Badge>
                      </div>
                      {template.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {template.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {Object.keys(template.parameterMapping)
                          .slice(0, 3)
                          .map((field) => (
                            <Badge
                              key={field}
                              variant="outline"
                              className="text-xs"
                            >
                              {field}
                            </Badge>
                          ))}
                        {Object.keys(template.parameterMapping).length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{Object.keys(template.parameterMapping).length - 3}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={template.isActive}
                            onCheckedChange={() => toggleActive(template)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {template.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                JSON.stringify(template.parameterMapping, null, 2)
                              );
                              toast.success("Mapping copied to clipboard");
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(template.id)}
                            disabled={deletingId === template.id}
                          >
                            {deletingId === template.id ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
