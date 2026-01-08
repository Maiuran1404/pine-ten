"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Save,
  Check,
  CheckCircle,
  Calendar,
  Palette,
  FileType,
  Clock,
  Sparkles,
  Share2,
  Megaphone,
  PenTool,
  Wand2,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/shared/loading";

interface Design {
  id: string;
  clientId: string;
  templateId: string | null;
  templateName: string;
  imageUrl: string;
  imageFormat: string;
  modificationsUsed: Record<string, unknown> | null;
  savedToAssets: boolean;
  createdAt: string;
  templateCategory: string | null;
  templateDescription: string | null;
}

const CATEGORY_CONFIG = {
  social_media: {
    label: "Social Media",
    icon: Share2,
    color: "blue",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  marketing: {
    label: "Marketing",
    icon: Megaphone,
    color: "emerald",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  brand_assets: {
    label: "Brand Assets",
    icon: PenTool,
    color: "violet",
    bgColor: "bg-violet-500/10",
    textColor: "text-violet-600 dark:text-violet-400",
  },
};

export default function DesignResultPage() {
  const params = useParams();
  const router = useRouter();
  const [design, setDesign] = useState<Design | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const designId = params.id as string;

  useEffect(() => {
    if (designId) {
      fetchDesign();
    }
  }, [designId]);

  const fetchDesign = async () => {
    try {
      const response = await fetch(`/api/orshot/designs/${designId}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Design not found");
          router.push("/dashboard/designs");
          return;
        }
        throw new Error("Failed to fetch design");
      }
      const data = await response.json();
      setDesign(data.design);
    } catch (error) {
      console.error("Failed to fetch design:", error);
      toast.error("Failed to load design");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!design) return;
    try {
      const response = await fetch(design.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${design.templateName.toLowerCase().replace(/\s+/g, "-")}.${design.imageFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Design downloaded!");
    } catch {
      // Fallback: open in new tab
      window.open(design.imageUrl, "_blank");
    }
  };

  const handleSaveToAssets = async () => {
    if (!design || design.savedToAssets) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/orshot/designs/${designId}`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }
      setDesign({ ...design, savedToAssets: true });
      toast.success("Design saved to brand assets!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save design"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryConfig = (category: string | null) => {
    if (!category)
      return {
        label: "Design",
        icon: Wand2,
        color: "gray",
        bgColor: "bg-gray-500/10",
        textColor: "text-gray-600 dark:text-gray-400",
      };
    return (
      CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] || {
        label: category,
        icon: Wand2,
        color: "gray",
        bgColor: "bg-gray-500/10",
        textColor: "text-gray-600 dark:text-gray-400",
      }
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="aspect-square w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!design) {
    return null;
  }

  const categoryConfig = getCategoryConfig(design.templateCategory);
  const CategoryIcon = categoryConfig.icon;

  // Extract colors from modifications
  const brandColors = design.modificationsUsed
    ? Object.entries(design.modificationsUsed)
        .filter(([key]) => key.toLowerCase().includes("color"))
        .map(([key, value]) => ({ name: key, value: value as string }))
    : [];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/designs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Designs
      </Link>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`w-10 h-10 rounded-lg ${categoryConfig.bgColor} flex items-center justify-center`}
            >
              <CategoryIcon className={`h-5 w-5 ${categoryConfig.textColor}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {design.templateName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {categoryConfig.label}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          {design.savedToAssets ? (
            <Button disabled variant="secondary">
              <Check className="h-4 w-4 mr-2" />
              Saved to Assets
            </Button>
          ) : (
            <Button onClick={handleSaveToAssets} disabled={isSaving}>
              {isSaving ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save to Assets
                </>
              )}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Design Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="relative bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={design.imageUrl}
                alt={design.templateName}
                className="w-full h-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://via.placeholder.com/800x800?text=Image+Not+Found";
                }}
              />
              {/* Open in new tab button */}
              <a
                href={design.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-4 right-4 p-2 rounded-lg bg-background/80 backdrop-blur-sm text-foreground hover:bg-background transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </motion.div>

        {/* Info Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="space-y-4"
        >
          {/* Design Info Card */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground mb-4">Design Info</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <FileType className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Format</p>
                  <p className="text-sm font-medium">
                    {design.imageFormat.toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">
                    {formatDate(design.createdAt)}
                  </p>
                </div>
              </div>
              {design.savedToAssets && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Saved to Assets
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Generation Process Card */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground mb-4">
              Generation Process
            </h3>
            <div className="space-y-4">
              {/* Step 1: Template */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Template Selected</p>
                  <p className="text-xs text-muted-foreground">
                    {design.templateName}
                  </p>
                </div>
              </div>

              {/* Step 2: Brand Applied */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Brand Data Applied</p>
                  {typeof design.modificationsUsed?.name === "string" && (
                    <p className="text-xs text-muted-foreground">
                      Company: {design.modificationsUsed.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Step 3: Colors */}
              {brandColors.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Colors Applied</p>
                    <div className="flex items-center gap-2 mt-1">
                      {brandColors.slice(0, 5).map((color, i) => (
                        <div
                          key={i}
                          className="w-5 h-5 rounded-full border border-border shadow-sm"
                          style={{ backgroundColor: color.value || "#ccc" }}
                          title={`${color.name}: ${color.value}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Generated */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Design Generated</p>
                  <p className="text-xs text-muted-foreground">
                    Ready for download
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Design
              </Button>
              <Link href="/dashboard/designs" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Another Design
                </Button>
              </Link>
              <Link href="/dashboard/brand" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="h-4 w-4 mr-2" />
                  Manage Brand Assets
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
