"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/shared/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Link,
  Globe,
  Search,
  X,
  Check,
  AlertCircle,
  Sparkles,
  Upload,
  Download,
} from "lucide-react";
import {
  DELIVERABLE_TYPES,
  STYLE_AXES,
  type DeliverableType,
  type StyleAxis,
} from "@/lib/constants/reference-libraries";
import { cn } from "@/lib/utils";

interface ScrapedImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  source: "img" | "og" | "meta" | "background";
}

interface ClassifiedImage {
  url: string;
  status: "pending" | "classifying" | "classified" | "uploading" | "done" | "error";
  classification?: {
    name: string;
    description: string;
    deliverableType: DeliverableType;
    styleAxis: StyleAxis;
    subStyle: string | null;
    semanticTags: string[];
    confidence: number;
    colorTemperature?: string;
    energyLevel?: string;
    densityLevel?: string;
    formalityLevel?: string;
    colorSamples?: string[];
    industries?: string[];
    targetAudience?: string;
    visualElements?: string[];
    moodKeywords?: string[];
  };
  error?: string;
}

interface DeliverableStyleScraperProps {
  onUploadComplete?: () => void;
}

export function DeliverableStyleScraper({ onUploadComplete }: DeliverableStyleScraperProps) {
  const [activeTab, setActiveTab] = useState<"urls" | "scrape">("urls");

  // URL Import state
  const [urlInput, setUrlInput] = useState("");

  // Page Scraper state
  const [pageUrl, setPageUrl] = useState("");
  const [isScrapingPage, setIsScrapingPage] = useState(false);
  const [scrapedImages, setScrapedImages] = useState<ScrapedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [useFirecrawl, setUseFirecrawl] = useState(false);
  const [minSize, setMinSize] = useState("200");

  // Classification/Upload state
  const [classifiedImages, setClassifiedImages] = useState<ClassifiedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState<"input" | "select" | "classify" | "review">("input");

  // Parse URLs from textarea
  const parseUrls = (input: string): string[] => {
    return input
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter((url) => {
        try {
          new URL(url);
          return url.startsWith("http");
        } catch {
          return false;
        }
      });
  };

  // Scrape a page for images
  const handleScrapePage = async () => {
    if (!pageUrl) {
      toast.error("Please enter a URL");
      return;
    }

    setIsScrapingPage(true);
    setScrapedImages([]);
    setSelectedImages(new Set());

    try {
      const response = await fetch("/api/admin/deliverable-styles/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: pageUrl,
          useFirecrawl,
          minSize: parseInt(minSize) || 200,
          limit: 100,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to scrape page");
      }

      const data = await response.json();
      setScrapedImages(data.images);

      if (data.images.length === 0) {
        toast.error("No images found on this page");
      } else {
        toast.success(`Found ${data.images.length} images`);
        setStep("select");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to scrape page");
    } finally {
      setIsScrapingPage(false);
    }
  };

  // Toggle image selection
  const toggleImageSelection = (url: string) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }
      return newSet;
    });
  };

  // Select all images
  const selectAllImages = () => {
    setSelectedImages(new Set(scrapedImages.map((img) => img.url)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedImages(new Set());
  };

  // Start classification process
  const handleStartClassification = async () => {
    let urls: string[] = [];

    if (activeTab === "urls") {
      urls = parseUrls(urlInput);
      if (urls.length === 0) {
        toast.error("No valid URLs found");
        return;
      }
    } else {
      urls = Array.from(selectedImages);
      if (urls.length === 0) {
        toast.error("Please select at least one image");
        return;
      }
    }

    // Initialize classified images
    setClassifiedImages(urls.map((url) => ({ url, status: "pending" })));
    setStep("classify");
    setIsProcessing(true);
    setProgress(0);

    // Classify each image
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      setClassifiedImages((prev) =>
        prev.map((img) =>
          img.url === url ? { ...img, status: "classifying" } : img
        )
      );

      try {
        const response = await fetch("/api/admin/deliverable-styles/import-urls", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: [url] }),
        });

        const data = await response.json();
        const result = data.results?.[0];

        if (result?.success) {
          setClassifiedImages((prev) =>
            prev.map((img) =>
              img.url === url
                ? { ...img, status: "classified", classification: result.classification }
                : img
            )
          );
        } else {
          setClassifiedImages((prev) =>
            prev.map((img) =>
              img.url === url
                ? { ...img, status: "error", error: result?.error || "Classification failed" }
                : img
            )
          );
        }
      } catch (error) {
        setClassifiedImages((prev) =>
          prev.map((img) =>
            img.url === url
              ? { ...img, status: "error", error: "Network error" }
              : img
          )
        );
      }

      setProgress(((i + 1) / urls.length) * 100);
    }

    setIsProcessing(false);
    setStep("review");
  };

  // Update classification for an image
  const updateClassification = (url: string, field: string, value: string | string[]) => {
    setClassifiedImages((prev) =>
      prev.map((img) =>
        img.url === url && img.classification
          ? {
              ...img,
              classification: {
                ...img.classification,
                [field]: value,
              },
            }
          : img
      )
    );
  };

  // Upload all classified images
  const handleUploadAll = async () => {
    const toUpload = classifiedImages.filter((img) => img.status === "classified");

    if (toUpload.length === 0) {
      toast.error("No images to upload");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < toUpload.length; i++) {
      const img = toUpload[i];

      setClassifiedImages((prev) =>
        prev.map((item) =>
          item.url === img.url ? { ...item, status: "uploading" } : item
        )
      );

      try {
        const response = await fetch("/api/admin/deliverable-styles/import-urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: [img.url] }),
        });

        const data = await response.json();
        const result = data.results?.[0];

        if (result?.success) {
          setClassifiedImages((prev) =>
            prev.map((item) =>
              item.url === img.url ? { ...item, status: "done" } : item
            )
          );
          successCount++;
        } else {
          setClassifiedImages((prev) =>
            prev.map((item) =>
              item.url === img.url
                ? { ...item, status: "error", error: result?.error || "Upload failed" }
                : item
            )
          );
          errorCount++;
        }
      } catch {
        setClassifiedImages((prev) =>
          prev.map((item) =>
            item.url === img.url
              ? { ...item, status: "error", error: "Network error" }
              : item
          )
        );
        errorCount++;
      }

      setProgress(((i + 1) / toUpload.length) * 100);
    }

    setIsProcessing(false);

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} images`);
      onUploadComplete?.();
    }
    if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} images`);
    }
  };

  // Remove an image from the list
  const removeImage = (url: string) => {
    setClassifiedImages((prev) => prev.filter((img) => img.url !== url));
  };

  // Reset to start
  const handleReset = () => {
    setStep("input");
    setUrlInput("");
    setPageUrl("");
    setScrapedImages([]);
    setSelectedImages(new Set());
    setClassifiedImages([]);
    setProgress(0);
  };

  const classifiedCount = classifiedImages.filter((img) => img.status === "classified").length;
  const doneCount = classifiedImages.filter((img) => img.status === "done").length;
  const errorCount = classifiedImages.filter((img) => img.status === "error").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Import from Web
        </CardTitle>
        <CardDescription>
          Import design references by pasting URLs directly or scraping from any webpage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step indicator */}
        {step !== "input" && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={step === "select" ? "default" : "secondary"}>
                1. Select
              </Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant={step === "classify" ? "default" : "secondary"}>
                2. Classify
              </Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant={step === "review" ? "default" : "secondary"}>
                3. Review & Upload
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Start Over
            </Button>
          </div>
        )}

        {/* Input Step */}
        {step === "input" && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "urls" | "scrape")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="urls" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Paste Image URLs
              </TabsTrigger>
              <TabsTrigger value="scrape" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Scrape from Page
              </TabsTrigger>
            </TabsList>

            <TabsContent value="urls" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Image URLs (one per line)</Label>
                <Textarea
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={`https://example.com/design1.jpg\nhttps://dribbble.com/shots/123456/attachments/456/original/image.png`}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {parseUrls(urlInput).length} valid URL(s) detected
                </p>
              </div>
              <Button
                onClick={handleStartClassification}
                disabled={parseUrls(urlInput).length === 0}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Classify {parseUrls(urlInput).length} Image(s)
              </Button>
            </TabsContent>

            <TabsContent value="scrape" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Page URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={pageUrl}
                      onChange={(e) => setPageUrl(e.target.value)}
                      placeholder="https://dribbble.com/shots/123456"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleScrapePage}
                      disabled={!pageUrl || isScrapingPage}
                    >
                      {isScrapingPage ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Scrape
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Min size:</Label>
                    <Select value={minSize} onValueChange={setMinSize}>
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100px</SelectItem>
                        <SelectItem value="200">200px</SelectItem>
                        <SelectItem value="400">400px</SelectItem>
                        <SelectItem value="800">800px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="firecrawl-ds"
                      checked={useFirecrawl}
                      onCheckedChange={(checked) => setUseFirecrawl(checked === true)}
                    />
                    <Label htmlFor="firecrawl-ds" className="text-sm cursor-pointer">
                      Use Firecrawl (for JS-heavy sites)
                    </Label>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Tips:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Works with Dribbble shots, Behance projects, design blogs</li>
                    <li>Enable Firecrawl for sites that load images with JavaScript</li>
                    <li>Increase min size to filter out icons and thumbnails</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Selection Step (for scraped images) */}
        {step === "select" && scrapedImages.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Select Images to Import</h3>
                <p className="text-sm text-muted-foreground">
                  Found {scrapedImages.length} images • {selectedImages.size} selected
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllImages}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-[400px] overflow-y-auto p-1">
              {scrapedImages.map((img) => (
                <div
                  key={img.url}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                    selectedImages.has(img.url)
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-transparent hover:border-muted-foreground/30"
                  )}
                  onClick={() => toggleImageSelection(img.url)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt || ""}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' fill='%23999' font-size='12'%3EError%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  {selectedImages.has(img.url) && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  {img.source === "og" && (
                    <Badge className="absolute bottom-1 left-1 text-[10px] py-0" variant="secondary">
                      OG
                    </Badge>
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={handleStartClassification}
              disabled={selectedImages.size === 0}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Classify {selectedImages.size} Selected Image(s)
            </Button>
          </div>
        )}

        {/* Classification/Review Step */}
        {(step === "classify" || step === "review") && classifiedImages.length > 0 && (
          <div className="space-y-4">
            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-muted-foreground text-center">
                  Processing... {Math.round(progress)}%
                </p>
              </div>
            )}

            {/* Status summary */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {classifiedCount > 0 && `${classifiedCount} classified`}
                {doneCount > 0 && ` • ${doneCount} uploaded`}
                {errorCount > 0 && ` • ${errorCount} failed`}
              </div>
              {step === "review" && classifiedCount > 0 && (
                <Button onClick={handleUploadAll} disabled={isProcessing}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload All ({classifiedCount})
                </Button>
              )}
            </div>

            {/* Image list */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {classifiedImages.map((img) => (
                <div
                  key={img.url}
                  className={cn(
                    "border rounded-lg p-3 space-y-3",
                    img.status === "done" && "bg-green-500/5 border-green-500/20",
                    img.status === "error" && "bg-red-500/5 border-red-500/20"
                  )}
                >
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="w-20 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm truncate text-muted-foreground max-w-xs">
                          {img.url.split("/").pop()}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {img.status === "pending" && (
                            <Badge variant="outline">Pending</Badge>
                          )}
                          {img.status === "classifying" && (
                            <Badge variant="secondary">
                              <LoadingSpinner size="sm" className="mr-1" />
                              Classifying
                            </Badge>
                          )}
                          {img.status === "classified" && (
                            <Badge className="bg-blue-500">
                              <Check className="h-3 w-3 mr-1" />
                              Ready
                            </Badge>
                          )}
                          {img.status === "uploading" && (
                            <Badge variant="secondary">
                              <LoadingSpinner size="sm" className="mr-1" />
                              Uploading
                            </Badge>
                          )}
                          {img.status === "done" && (
                            <Badge className="bg-green-500">
                              <Check className="h-3 w-3 mr-1" />
                              Done
                            </Badge>
                          )}
                          {img.status === "error" && (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeImage(img.url)}
                            disabled={isProcessing}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {img.error && (
                        <p className="text-xs text-red-500 mt-1">{img.error}</p>
                      )}
                    </div>
                  </div>

                  {/* Classification details (editable) */}
                  {img.classification && img.status !== "done" && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={img.classification.name}
                            onChange={(e) =>
                              updateClassification(img.url, "name", e.target.value)
                            }
                            className="h-7 text-sm mt-1"
                          />
                        </div>
                        <div className="flex items-end">
                          <Badge variant="outline" className="text-xs">
                            {Math.round(img.classification.confidence * 100)}% confident
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Deliverable Type</Label>
                          <Select
                            value={img.classification.deliverableType}
                            onValueChange={(v) =>
                              updateClassification(img.url, "deliverableType", v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DELIVERABLE_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Style Axis</Label>
                          <Select
                            value={img.classification.styleAxis}
                            onValueChange={(v) =>
                              updateClassification(img.url, "styleAxis", v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STYLE_AXES.map((a) => (
                                <SelectItem key={a.value} value={a.value}>
                                  {a.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">Color</Label>
                          <Select
                            value={img.classification.colorTemperature || "neutral"}
                            onValueChange={(v) =>
                              updateClassification(img.url, "colorTemperature", v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="warm">Warm</SelectItem>
                              <SelectItem value="cool">Cool</SelectItem>
                              <SelectItem value="neutral">Neutral</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Energy</Label>
                          <Select
                            value={img.classification.energyLevel || "balanced"}
                            onValueChange={(v) =>
                              updateClassification(img.url, "energyLevel", v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="calm">Calm</SelectItem>
                              <SelectItem value="balanced">Balanced</SelectItem>
                              <SelectItem value="energetic">Energetic</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Density</Label>
                          <Select
                            value={img.classification.densityLevel || "balanced"}
                            onValueChange={(v) =>
                              updateClassification(img.url, "densityLevel", v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minimal">Minimal</SelectItem>
                              <SelectItem value="balanced">Balanced</SelectItem>
                              <SelectItem value="rich">Rich</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Formality</Label>
                          <Select
                            value={img.classification.formalityLevel || "balanced"}
                            onValueChange={(v) =>
                              updateClassification(img.url, "formalityLevel", v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="casual">Casual</SelectItem>
                              <SelectItem value="balanced">Balanced</SelectItem>
                              <SelectItem value="formal">Formal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Color samples and tags */}
                      <div className="flex items-center gap-4">
                        {img.classification.colorSamples && img.classification.colorSamples.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Colors:</span>
                            {img.classification.colorSamples.map((color, i) => (
                              <div
                                key={i}
                                className="w-4 h-4 rounded border"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        )}
                        {img.classification.industries && img.classification.industries.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {img.classification.industries.slice(0, 3).map((ind) => (
                              <Badge key={ind} variant="outline" className="text-[10px] py-0">
                                {ind}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
