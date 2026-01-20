"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
import {
  Search,
  Zap,
  Settings2,
  ChevronDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportResult {
  url: string;
  success: boolean;
  id?: string;
  name?: string;
  deliverableType?: string;
  styleAxis?: string;
  confidence?: number;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

interface ScraperSummary {
  totalScraped: number;
  totalAttempted: number;
  successful: number;
  failed: number;
  skipped: number;
}

interface BiggedKeywordScraperProps {
  onUploadComplete?: () => void;
}

export function BiggedKeywordScraper({ onUploadComplete }: BiggedKeywordScraperProps) {
  const [keyword, setKeyword] = useState("");
  const [limit, setLimit] = useState(20);
  const [confidenceThreshold, setConfidenceThreshold] = useState(50);
  const [parallelBatchSize, setParallelBatchSize] = useState(3);
  const [previewMode, setPreviewMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summary, setSummary] = useState<ScraperSummary | null>(null);

  const handleScrape = async () => {
    if (!keyword.trim()) {
      toast.error("Please enter a keyword to search");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStatus("Starting scraper...");
    setResults([]);
    setSummary(null);

    try {
      const response = await fetch("/api/admin/deliverable-styles/scrape-bigged", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: keyword.trim(),
          limit,
          confidenceThreshold: confidenceThreshold / 100,
          parallelBatchSize,
          preview: previewMode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.data.results || []);
        setSummary(data.data.summary || null);
        setProgress(100);
        setStatus("Complete!");

        if (!previewMode && data.data.summary?.successful > 0) {
          toast.success(`Successfully imported ${data.data.summary.successful} design reference(s)`);
          onUploadComplete?.();
        } else if (previewMode) {
          toast.success(`Preview complete. Found ${data.data.summary?.successful || 0} items ready for import.`);
        }
      } else {
        throw new Error(data.error || "Scraping failed");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to scrape");
      setStatus("Failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setResults([]);
    setSummary(null);
    setProgress(0);
    setStatus("");
  };

  const successfulResults = results.filter((r) => r.success && !r.skipped);
  const skippedResults = results.filter((r) => r.skipped);
  const failedResults = results.filter((r) => !r.success && !r.skipped);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-purple-500" />
          Bigged Ad Spy Scraper
        </CardTitle>
        <CardDescription>
          Search and import ad designs from Bigged Ad Spy by keyword
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search input */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keyword">Search Keyword</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="keyword"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g., skincare, fitness, tech startup"
                  className="pl-9"
                  disabled={isProcessing}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isProcessing) {
                      handleScrape();
                    }
                  }}
                />
              </div>
              <Button
                onClick={handleScrape}
                disabled={isProcessing || !keyword.trim()}
                className="px-6"
              >
                {isProcessing ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    {previewMode ? "Preview" : "Scrape & Import"}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Quick settings */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Limit:</Label>
              <Select
                value={String(limit)}
                onValueChange={(v) => setLimit(parseInt(v))}
                disabled={isProcessing}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="preview-mode"
                checked={previewMode}
                onCheckedChange={setPreviewMode}
                disabled={isProcessing}
              />
              <Label htmlFor="preview-mode" className="text-sm cursor-pointer">
                Preview only
              </Label>
            </div>
          </div>

          {/* Advanced settings */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Advanced Settings
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    showAdvanced && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Confidence Threshold</Label>
                  <span className="text-sm text-muted-foreground">{confidenceThreshold}%</span>
                </div>
                <Slider
                  value={[confidenceThreshold]}
                  onValueChange={([v]) => setConfidenceThreshold(v)}
                  min={0}
                  max={100}
                  step={5}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  Skip images with AI classification confidence below this threshold
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Parallel Batch Size</Label>
                  <span className="text-sm text-muted-foreground">{parallelBatchSize}</span>
                </div>
                <Slider
                  value={[parallelBatchSize]}
                  onValueChange={([v]) => setParallelBatchSize(v)}
                  min={1}
                  max={5}
                  step={1}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  Number of images to process simultaneously (higher = faster but more API usage)
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">{status}</p>
          </div>
        )}

        {/* Results */}
        {summary && (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold">{summary.totalScraped}</div>
                <div className="text-xs text-muted-foreground">Scraped</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{summary.successful}</div>
                <div className="text-xs text-muted-foreground">
                  {previewMode ? "Ready" : "Imported"}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">{summary.skipped}</div>
                <div className="text-xs text-muted-foreground">Skipped</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{summary.failed}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
            </div>

            {/* Successful imports */}
            {successfulResults.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {previewMode ? "Ready for Import" : "Imported"} ({successfulResults.length})
                </h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-[200px] overflow-y-auto">
                  {successfulResults.map((result, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={result.url}
                          alt={result.name || ""}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).parentElement!.innerHTML =
                              '<div class="w-full h-full flex items-center justify-center"><svg class="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>';
                          }}
                        />
                        {result.confidence !== undefined && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                            <span className="text-[10px] text-white">
                              {Math.round(result.confidence * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] truncate" title={result.name}>
                        {result.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped items */}
            {skippedResults.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  Skipped ({skippedResults.length})
                </h4>
                <div className="space-y-1 max-h-[100px] overflow-y-auto text-xs">
                  {skippedResults.slice(0, 5).map((result, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-yellow-600">
                      <span className="truncate flex-1">{result.skipReason}</span>
                    </div>
                  ))}
                  {skippedResults.length > 5 && (
                    <div className="text-muted-foreground">
                      +{skippedResults.length - 5} more skipped
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Failed items */}
            {failedResults.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  Failed ({failedResults.length})
                </h4>
                <div className="space-y-1 max-h-[100px] overflow-y-auto text-xs">
                  {failedResults.slice(0, 5).map((result, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-red-500">
                      <span className="truncate flex-1">{result.error}</span>
                    </div>
                  ))}
                  {failedResults.length > 5 && (
                    <div className="text-muted-foreground">
                      +{failedResults.length - 5} more failed
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Clear Results
              </Button>
            </div>
          </div>
        )}

        {/* Tips */}
        {!isProcessing && !summary && (
          <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium mb-2">Tips:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Try specific keywords like &quot;skincare ads&quot;, &quot;fitness marketing&quot;, &quot;tech startup&quot;</li>
              <li>Preview mode lets you see what will be imported without saving</li>
              <li>Duplicates are automatically detected and skipped</li>
              <li>Low confidence images are filtered based on your threshold setting</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
