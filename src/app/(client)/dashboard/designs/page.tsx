"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Wand2,
  Download,
  Calendar,
  Share2,
  Megaphone,
  PenTool,
  Sparkles,
  ExternalLink,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickDesignModal } from "@/components/client/quick-design-modal";

interface Design {
  id: string;
  templateId: string | null;
  templateName: string;
  imageUrl: string;
  imageFormat: string;
  savedToAssets: boolean;
  createdAt: string;
  templateCategory: string | null;
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

export default function DesignsGalleryPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuickDesign, setShowQuickDesign] = useState(false);

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    try {
      const response = await fetch("/api/orshot/designs");
      if (response.ok) {
        const data = await response.json();
        setDesigns(data.designs || []);
      }
    } catch (error) {
      console.error("Failed to fetch designs:", error);
      toast.error("Failed to load designs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (design: Design) => {
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

  const getCategoryConfig = (category: string | null) => {
    if (!category) return { label: "Design", icon: Wand2, color: "gray" };
    return (
      CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG] || {
        label: category,
        icon: Wand2,
        color: "gray",
      }
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Designs</h1>
          <p className="text-muted-foreground">
            Your generated branded designs
          </p>
        </div>
        <Button onClick={() => setShowQuickDesign(true)}>
          <Sparkles className="h-4 w-4 mr-2" />
          Create New Design
        </Button>
      </div>

      {/* Designs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : designs.length === 0 ? (
        <div className="text-center py-16 px-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Wand2 className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No designs yet
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Generate your first branded design in seconds. Just select a
            template and we'll apply your brand colors and company name
            automatically.
          </p>
          <Button onClick={() => setShowQuickDesign(true)} size="lg">
            <Sparkles className="h-4 w-4 mr-2" />
            Create Your First Design
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.map((design, index) => {
            const categoryConfig = getCategoryConfig(design.templateCategory);
            const CategoryIcon = categoryConfig.icon;

            return (
              <motion.div
                key={design.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  href={`/dashboard/designs/${design.id}`}
                  className="group block rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-200"
                >
                  {/* Image */}
                  <div className="aspect-square relative bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={design.imageUrl}
                      alt={design.templateName}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://via.placeholder.com/400x400?text=Image+Not+Found";
                      }}
                    />

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDownload(design);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                        <Button variant="secondary" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className="bg-background/80 backdrop-blur-sm"
                      >
                        <CategoryIcon className="h-3 w-3 mr-1" />
                        {categoryConfig.label}
                      </Badge>
                      {design.savedToAssets && (
                        <Badge
                          variant="secondary"
                          className="bg-green-500/80 text-white backdrop-blur-sm"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Saved
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {design.templateName}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(design.createdAt)}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 ml-2">
                        {design.imageFormat.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Quick Design Modal */}
      <QuickDesignModal
        open={showQuickDesign}
        onOpenChange={setShowQuickDesign}
      />
    </div>
  );
}
