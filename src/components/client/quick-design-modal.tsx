"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/shared/loading";
import {
  Wand2,
  Share2,
  Megaphone,
  PenTool,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  previewImageUrl: string | null;
  outputFormat: string;
}

const CATEGORY_CONFIG = {
  social_media: {
    label: "Social Media",
    icon: Share2,
    color: "blue",
  },
  marketing: {
    label: "Marketing",
    icon: Megaphone,
    color: "emerald",
  },
  brand_assets: {
    label: "Brand Assets",
    icon: PenTool,
    color: "violet",
  },
};

interface QuickDesignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickDesignModal({
  open,
  onOpenChange,
}: QuickDesignModalProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/orshot/templates");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
        // Auto-select first category if templates exist
        if (data.templates?.length > 0) {
          const categories = [
            ...new Set(data.templates.map((t: Template) => t.category)),
          ];
          setSelectedCategory(categories[0] as string);
        }
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (template: Template) => {
    setGeneratingId(template.id);
    try {
      const response = await fetch("/api/orshot/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate design");
      }

      toast.success("Design generated successfully!");
      onOpenChange(false);
      router.push(`/dashboard/designs/${data.design.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate design"
      );
    } finally {
      setGeneratingId(null);
    }
  };

  const categories = [...new Set(templates.map((t) => t.category))];
  const filteredTemplates = selectedCategory
    ? templates.filter((t) => t.category === selectedCategory)
    : templates;

  const getCategoryConfig = (category: string) => {
    return (
      CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] || {
        label: category,
        icon: Wand2,
        color: "gray",
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Design
          </DialogTitle>
          <DialogDescription>
            Generate branded designs instantly using your brand colors and
            company name
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Category Tabs */}
          {!isLoading && categories.length > 0 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {categories.map((category) => {
                const config = getCategoryConfig(category);
                const Icon = config.icon;
                const isActive = selectedCategory === category;

                const colorClasses = {
                  blue: isActive
                    ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30"
                    : "",
                  emerald: isActive
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                    : "",
                  violet: isActive
                    ? "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/30"
                    : "",
                  gray: isActive
                    ? "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30"
                    : "",
                };

                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                      isActive
                        ? colorClasses[config.color as keyof typeof colorClasses]
                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-48 w-full rounded-xl" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <Wand2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No templates available yet
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask your admin to configure Quick Design templates
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedCategory}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {filteredTemplates.map((template) => {
                    const config = getCategoryConfig(template.category);
                    const Icon = config.icon;
                    const isGenerating = generatingId === template.id;

                    return (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`group relative rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-200 ${
                          isGenerating ? "pointer-events-none" : ""
                        }`}
                      >
                        {/* Preview Image */}
                        <div className="aspect-video relative bg-muted">
                          {template.previewImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={template.previewImageUrl}
                              alt={template.name}
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon className="h-12 w-12 text-muted-foreground/50" />
                            </div>
                          )}

                          {/* Generating Overlay */}
                          {isGenerating && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                              <div className="text-center">
                                <LoadingSpinner size="lg" />
                                <p className="text-sm text-muted-foreground mt-2">
                                  Generating...
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Format Badge */}
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="text-xs">
                              {template.outputFormat.toUpperCase()}
                            </Badge>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                          <h3 className="font-medium text-foreground mb-1">
                            {template.name}
                          </h3>
                          {template.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {template.description}
                            </p>
                          )}
                          <Button
                            className="w-full group/btn"
                            onClick={() => handleGenerate(template)}
                            disabled={generatingId !== null}
                          >
                            {isGenerating ? (
                              <>
                                <LoadingSpinner size="sm" />
                                <span className="ml-2">Generating...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Generate Design
                                <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                              </>
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
