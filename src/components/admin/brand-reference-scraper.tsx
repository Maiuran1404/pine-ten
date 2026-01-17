"use client";

import { useState, useCallback } from "react";
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
  ImageIcon,
  Sparkles,
  Upload,
  Download,
} from "lucide-react";
import {
  TONE_BUCKETS,
  ENERGY_BUCKETS,
  DENSITY_BUCKETS,
  COLOR_BUCKETS,
  TONE_BUCKET_LABELS,
  ENERGY_BUCKET_LABELS,
  DENSITY_BUCKET_LABELS,
  COLOR_BUCKET_LABELS,
  type ToneBucket,
  type EnergyBucket,
  type DensityBucket,
  type ColorBucket,
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
    toneBucket: ToneBucket;
    energyBucket: EnergyBucket;
    densityBucket: DensityBucket;
    colorBucket: ColorBucket;
    colorSamples: string[];
    confidence: number;
  };
  error?: string;
}

interface BrandReferenceScraperProps {
  onUploadComplete?: () => void;
}

export function BrandReferenceScraper({ onUploadComplete }: BrandReferenceScraperProps) {
  const [activeTab, setActiveTab] = useState<"urls" | "scrape">("urls");

  // URL Import state
  const [urlInput, setUrlInput] = useState("");

  // Page Scraper state
  const [pageUrl, setPageUrl] = useState("");
  const [pageUrls, setPageUrls] = useState(""); // For bulk URL input
  const [isScrapingPage, setIsScrapingPage] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState({ current: 0, total: 0, currentUrl: "" });
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

  // Parse page URLs from textarea
  const parsePageUrls = (input: string): string[] => {
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

  // Scrape a single page for images
  const scrapeSinglePage = async (url: string): Promise<ScrapedImage[]> => {
    const response = await fetch("/api/admin/brand-references/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
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
    return data.images || [];
  };

  // Scrape a page for images (single URL)
  const handleScrapePage = async () => {
    if (!pageUrl) {
      toast.error("Please enter a URL");
      return;
    }

    setIsScrapingPage(true);
    setScrapedImages([]);
    setSelectedImages(new Set());
    setScrapeProgress({ current: 0, total: 1, currentUrl: pageUrl });

    try {
      const images = await scrapeSinglePage(pageUrl);
      setScrapedImages(images);

      if (images.length === 0) {
        toast.error("No images found on this page");
      } else {
        toast.success(`Found ${images.length} images`);
        setStep("select");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to scrape page");
    } finally {
      setIsScrapingPage(false);
      setScrapeProgress({ current: 0, total: 0, currentUrl: "" });
    }
  };

  // Scrape multiple pages for images (bulk)
  const handleBulkScrape = async () => {
    const urls = parsePageUrls(pageUrls);
    if (urls.length === 0) {
      toast.error("No valid URLs found");
      return;
    }

    setIsScrapingPage(true);
    setScrapedImages([]);
    setSelectedImages(new Set());

    const allImages: ScrapedImage[] = [];
    const seenUrls = new Set<string>();
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      setScrapeProgress({ current: i + 1, total: urls.length, currentUrl: url });

      try {
        const images = await scrapeSinglePage(url);
        // Deduplicate images by URL
        for (const img of images) {
          if (!seenUrls.has(img.url)) {
            seenUrls.add(img.url);
            allImages.push(img);
          }
        }
        successCount++;
      } catch (error) {
        console.error(`Failed to scrape ${url}:`, error);
        errorCount++;
      }
    }

    setScrapedImages(allImages);
    setIsScrapingPage(false);
    setScrapeProgress({ current: 0, total: 0, currentUrl: "" });

    if (allImages.length === 0) {
      toast.error("No images found from any of the pages");
    } else {
      toast.success(`Found ${allImages.length} unique images from ${successCount} pages${errorCount > 0 ? ` (${errorCount} failed)` : ""}`);
      setStep("select");
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

  // Fetch image client-side and convert to base64
  const fetchImageAsBase64 = async (url: string): Promise<{ base64: string; mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" }> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1]; // Remove data:image/xxx;base64, prefix
        let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/png";
        if (contentType.includes("jpeg") || contentType.includes("jpg")) {
          mediaType = "image/jpeg";
        } else if (contentType.includes("gif")) {
          mediaType = "image/gif";
        } else if (contentType.includes("webp")) {
          mediaType = "image/webp";
        }
        resolve({ base64, mediaType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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

    // Process images in batches of 3 for parallel classification
    const batchSize = 3;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);

      // Mark batch as classifying
      setClassifiedImages((prev) =>
        prev.map((img) =>
          batch.includes(img.url) ? { ...img, status: "classifying" } : img
        )
      );

      // Process batch in parallel
      await Promise.all(
        batch.map(async (url) => {
          try {
            // Fetch image client-side and convert to base64
            const { base64, mediaType } = await fetchImageAsBase64(url);

            // Send base64 to server for classification
            const response = await fetch("/api/admin/brand-references/import-urls", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ images: [{ url, base64, mediaType }] }),
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
                  ? { ...img, status: "error", error: error instanceof Error ? error.message : "Network error" }
                  : img
              )
            );
          }
        })
      );

      setProgress(((Math.min(i + batchSize, urls.length)) / urls.length) * 100);
    }

    setIsProcessing(false);
    setStep("review");
  };

  // Update classification for an image
  const updateClassification = (url: string, field: string, value: string) => {
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

    // Process in batches of 2 (uploads are heavier than classification)
    const batchSize = 2;
    for (let i = 0; i < toUpload.length; i += batchSize) {
      const batch = toUpload.slice(i, i + batchSize);

      // Mark batch as uploading
      setClassifiedImages((prev) =>
        prev.map((item) =>
          batch.some((b) => b.url === item.url) ? { ...item, status: "uploading" } : item
        )
      );

      // Process batch in parallel
      await Promise.all(
        batch.map(async (img) => {
          try {
            // Fetch image client-side and convert to base64
            const { base64, mediaType } = await fetchImageAsBase64(img.url);

            const response = await fetch("/api/admin/brand-references/import-urls", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                images: [{
                  url: img.url,
                  base64,
                  mediaType,
                  classification: img.classification,
                }],
              }),
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
          } catch (error) {
            setClassifiedImages((prev) =>
              prev.map((item) =>
                item.url === img.url
                  ? { ...item, status: "error", error: error instanceof Error ? error.message : "Network error" }
                  : item
              )
            );
            errorCount++;
          }
        })
      );

      setProgress(((Math.min(i + batchSize, toUpload.length)) / toUpload.length) * 100);
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
    setPageUrls("");
    setScrapedImages([]);
    setSelectedImages(new Set());
    setClassifiedImages([]);
    setProgress(0);
    setScrapeProgress({ current: 0, total: 0, currentUrl: "" });
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
          Import brand images by pasting URLs directly or scraping from any webpage
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
                  placeholder={`https://example.com/image1.jpg\nhttps://example.com/image2.png\nhttps://dribbble.com/shots/123456/attachments/456/original/image.png`}
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
                {/* Single URL input */}
                <div className="space-y-2">
                  <Label>Single Page URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={pageUrl}
                      onChange={(e) => setPageUrl(e.target.value)}
                      placeholder="https://dribbble.com/shots/123456"
                      className="flex-1"
                      disabled={isScrapingPage}
                    />
                    <Button
                      onClick={handleScrapePage}
                      disabled={!pageUrl || isScrapingPage}
                    >
                      {isScrapingPage && scrapeProgress.total === 1 ? (
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

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or bulk scrape</span>
                  </div>
                </div>

                {/* Bulk URL input */}
                <div className="space-y-2">
                  <Label>Multiple Page URLs (one per line)</Label>
                  <Textarea
                    value={pageUrls}
                    onChange={(e) => setPageUrls(e.target.value)}
                    placeholder={`https://dribbble.com/shots/123456\nhttps://dribbble.com/shots/789012\nhttps://behance.net/gallery/123456`}
                    rows={6}
                    className="font-mono text-sm"
                    disabled={isScrapingPage}
                  />
                  <p className="text-xs text-muted-foreground">
                    {parsePageUrls(pageUrls).length} valid URL(s) detected
                  </p>
                  <Button
                    onClick={handleBulkScrape}
                    disabled={parsePageUrls(pageUrls).length === 0 || isScrapingPage}
                    className="w-full"
                  >
                    {isScrapingPage && scrapeProgress.total > 1 ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Scraping {scrapeProgress.current}/{scrapeProgress.total}...
                      </>
                    ) : (
                      <>
                        <Globe className="h-4 w-4 mr-2" />
                        Scrape {parsePageUrls(pageUrls).length} Page(s)
                      </>
                    )}
                  </Button>
                </div>

                {/* Progress indicator for bulk scrape */}
                {isScrapingPage && scrapeProgress.total > 1 && (
                  <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                    <Progress value={(scrapeProgress.current / scrapeProgress.total) * 100} />
                    <p className="text-xs text-muted-foreground truncate">
                      Processing: {scrapeProgress.currentUrl}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Min size:</Label>
                    <Select value={minSize} onValueChange={setMinSize} disabled={isScrapingPage}>
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
                      id="firecrawl"
                      checked={useFirecrawl}
                      onCheckedChange={(checked) => setUseFirecrawl(checked === true)}
                      disabled={isScrapingPage}
                    />
                    <Label htmlFor="firecrawl" className="text-sm cursor-pointer">
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
                    <li>For bulk scraping, paste multiple URLs (one per line)</li>
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

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">Tone</Label>
                          <Select
                            value={img.classification.toneBucket}
                            onValueChange={(v) =>
                              updateClassification(img.url, "toneBucket", v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TONE_BUCKETS.map((b) => (
                                <SelectItem key={b} value={b}>
                                  {TONE_BUCKET_LABELS[b]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Energy</Label>
                          <Select
                            value={img.classification.energyBucket}
                            onValueChange={(v) =>
                              updateClassification(img.url, "energyBucket", v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ENERGY_BUCKETS.map((b) => (
                                <SelectItem key={b} value={b}>
                                  {ENERGY_BUCKET_LABELS[b]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Density</Label>
                          <Select
                            value={img.classification.densityBucket}
                            onValueChange={(v) =>
                              updateClassification(img.url, "densityBucket", v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DENSITY_BUCKETS.map((b) => (
                                <SelectItem key={b} value={b}>
                                  {DENSITY_BUCKET_LABELS[b]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Color</Label>
                          <Select
                            value={img.classification.colorBucket}
                            onValueChange={(v) =>
                              updateClassification(img.url, "colorBucket", v)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COLOR_BUCKETS.map((b) => (
                                <SelectItem key={b} value={b}>
                                  {COLOR_BUCKET_LABELS[b]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Color samples */}
                      {img.classification.colorSamples.length > 0 && (
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
