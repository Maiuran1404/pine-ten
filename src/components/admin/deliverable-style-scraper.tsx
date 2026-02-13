'use client'

import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/shared/loading'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
} from 'lucide-react'
import { DELIVERABLE_TYPES, STYLE_AXES } from '@/lib/constants/reference-libraries'
import { cn } from '@/lib/utils'
import { parseUrls, parseDribbbleUrls } from './deliverable-style-scraper.utils'
import { useDeliverableStyleScraperData } from './useDeliverableStyleScraperData'

interface DeliverableStyleScraperProps {
  onUploadComplete?: () => void
}

export function DeliverableStyleScraper({ onUploadComplete }: DeliverableStyleScraperProps) {
  const {
    activeTab,
    setActiveTab,
    urlInput,
    setUrlInput,
    dribbbleInput,
    setDribbbleInput,
    isDribbbleProcessing,
    dribbbleDryRun,
    setDribbbleDryRun,
    dribbbleResults,
    dribbbleSummary,
    pageUrl,
    setPageUrl,
    isScrapingPage,
    scrapedImages,
    selectedImages,
    useFirecrawl,
    setUseFirecrawl,
    minSize,
    setMinSize,
    classifiedImages,
    isProcessing,
    progress,
    step,
    classifiedCount,
    doneCount,
    errorCount,
    handleDribbbleImport,
    handleDribbbleReset,
    handleScrapePage,
    toggleImageSelection,
    selectAllImages,
    clearSelection,
    handleStartClassification,
    updateClassification,
    handleUploadAll,
    removeImage,
    handleReset,
  } = useDeliverableStyleScraperData({ onUploadComplete })

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
        {step !== 'input' && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={step === 'select' ? 'default' : 'secondary'}>1. Select</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant={step === 'classify' ? 'default' : 'secondary'}>2. Classify</Badge>
              <span className="text-muted-foreground">→</span>
              <Badge variant={step === 'review' ? 'default' : 'secondary'}>
                3. Review & Upload
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Start Over
            </Button>
          </div>
        )}

        {/* Input Step */}
        {step === 'input' && (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'urls' | 'scrape' | 'dribbble')}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="urls" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Paste URLs
              </TabsTrigger>
              <TabsTrigger value="scrape" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Scrape Page
              </TabsTrigger>
              <TabsTrigger value="dribbble" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Dribbble
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
                    <Button onClick={handleScrapePage} disabled={!pageUrl || isScrapingPage}>
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

            <TabsContent value="dribbble" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Dribbble Shot URLs (one per line)</Label>
                  <Textarea
                    value={dribbbleInput}
                    onChange={(e) => setDribbbleInput(e.target.value)}
                    placeholder={`https://dribbble.com/shots/123456-Design-Name\nhttps://dribbble.com/shots/789012-Another-Design`}
                    rows={8}
                    className="font-mono text-sm"
                    disabled={isDribbbleProcessing}
                  />
                  <p className="text-xs text-muted-foreground">
                    {parseDribbbleUrls(dribbbleInput).length} valid Dribbble URL(s) detected
                    {parseDribbbleUrls(dribbbleInput).length > 20 &&
                      ` (max 20 per request, ${parseDribbbleUrls(dribbbleInput).length - 20} will be queued)`}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="dribbble-dry-run"
                      checked={dribbbleDryRun}
                      onCheckedChange={(checked) => setDribbbleDryRun(checked === true)}
                      disabled={isDribbbleProcessing}
                    />
                    <Label htmlFor="dribbble-dry-run" className="text-sm cursor-pointer">
                      Dry run (preview only, don&apos;t import)
                    </Label>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium mb-2">How it works:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Paste Dribbble shot URLs (e.g., dribbble.com/shots/123456-Name)</li>
                    <li>Server fetches og:image from each shot page</li>
                    <li>AI classifies type, style, colors, and more</li>
                    <li>Images are uploaded to storage and added to library</li>
                    <li>Duplicates are automatically detected and skipped</li>
                  </ul>
                </div>

                <Button
                  onClick={handleDribbbleImport}
                  disabled={parseDribbbleUrls(dribbbleInput).length === 0 || isDribbbleProcessing}
                  className="w-full"
                >
                  {isDribbbleProcessing ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processing...
                    </>
                  ) : dribbbleDryRun ? (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Preview {parseDribbbleUrls(dribbbleInput).length} URL(s)
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {parseDribbbleUrls(dribbbleInput).length} URL(s)
                    </>
                  )}
                </Button>

                {/* Results display */}
                {dribbbleSummary && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="font-medium">Results: </span>
                        {dribbbleSummary.successful > 0 && (
                          <Badge className="bg-green-500 mr-1">
                            {dribbbleSummary.successful} imported
                          </Badge>
                        )}
                        {dribbbleSummary.skipped > 0 && (
                          <Badge variant="secondary" className="mr-1">
                            {dribbbleSummary.skipped} skipped
                          </Badge>
                        )}
                        {dribbbleSummary.failed > 0 && (
                          <Badge variant="destructive" className="mr-1">
                            {dribbbleSummary.failed} failed
                          </Badge>
                        )}
                        {dribbbleSummary.remaining > 0 && (
                          <span className="text-muted-foreground ml-2">
                            ({dribbbleSummary.remaining} remaining in queue)
                          </span>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleDribbbleReset}>
                        Clear Results
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {dribbbleResults.map((result, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'border rounded-lg p-3 flex gap-3',
                            result.success &&
                              result.imported &&
                              'bg-green-500/5 border-green-500/20',
                            result.skipped && 'bg-yellow-500/5 border-yellow-500/20',
                            !result.success && 'bg-red-500/5 border-red-500/20'
                          )}
                        >
                          {result.cdnUrl && (
                            <div className="relative w-16 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                              <Image
                                src={result.cdnUrl}
                                alt=""
                                fill
                                sizes="64px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate text-muted-foreground">
                              {result.dribbbleUrl.replace('https://dribbble.com/shots/', '')}
                            </p>
                            {result.imported && (
                              <p className="text-sm font-medium truncate">{result.imported.name}</p>
                            )}
                            {result.skipped && (
                              <p className="text-xs text-yellow-600">{result.skipReason}</p>
                            )}
                            {result.error && <p className="text-xs text-red-500">{result.error}</p>}
                            {result.imported && (
                              <div className="flex items-center gap-1 mt-1">
                                <Badge variant="outline" className="text-[10px] py-0">
                                  {result.imported.deliverableType}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] py-0">
                                  {result.imported.styleAxis}
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {result.success && result.imported && (
                              <Badge className="bg-green-500">
                                <Check className="h-3 w-3" />
                              </Badge>
                            )}
                            {result.skipped && <Badge variant="secondary">Skipped</Badge>}
                            {!result.success && (
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Selection Step (for scraped images) */}
        {step === 'select' && scrapedImages.length > 0 && (
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
                    'relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all',
                    selectedImages.has(img.url)
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-transparent hover:border-muted-foreground/30'
                  )}
                  onClick={() => toggleImageSelection(img.url)}
                >
                  <Image
                    src={img.url}
                    alt={img.alt || ''}
                    fill
                    sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 16vw"
                    className="object-cover"
                    unoptimized
                  />
                  {selectedImages.has(img.url) && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                  {img.source === 'og' && (
                    <Badge
                      className="absolute bottom-1 left-1 text-[10px] py-0"
                      variant="secondary"
                    >
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
        {(step === 'classify' || step === 'review') && classifiedImages.length > 0 && (
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
              {step === 'review' && classifiedCount > 0 && (
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
                    'border rounded-lg p-3 space-y-3',
                    img.status === 'done' && 'bg-green-500/5 border-green-500/20',
                    img.status === 'error' && 'bg-red-500/5 border-red-500/20'
                  )}
                >
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="relative w-20 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <Image
                        src={img.url}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm truncate text-muted-foreground max-w-xs">
                          {img.url.split('/').pop()}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {img.status === 'pending' && <Badge variant="outline">Pending</Badge>}
                          {img.status === 'classifying' && (
                            <Badge variant="secondary">
                              <LoadingSpinner size="sm" className="mr-1" />
                              Classifying
                            </Badge>
                          )}
                          {img.status === 'classified' && (
                            <Badge className="bg-blue-500">
                              <Check className="h-3 w-3 mr-1" />
                              Ready
                            </Badge>
                          )}
                          {img.status === 'uploading' && (
                            <Badge variant="secondary">
                              <LoadingSpinner size="sm" className="mr-1" />
                              Uploading
                            </Badge>
                          )}
                          {img.status === 'done' && (
                            <Badge className="bg-green-500">
                              <Check className="h-3 w-3 mr-1" />
                              Done
                            </Badge>
                          )}
                          {img.status === 'error' && (
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

                      {img.error && <p className="text-xs text-red-500 mt-1">{img.error}</p>}
                    </div>
                  </div>

                  {/* Classification details (editable) */}
                  {img.classification && img.status !== 'done' && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Name</Label>
                          <Input
                            value={img.classification.name}
                            onChange={(e) => updateClassification(img.url, 'name', e.target.value)}
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
                              updateClassification(img.url, 'deliverableType', v)
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
                            onValueChange={(v) => updateClassification(img.url, 'styleAxis', v)}
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
                            value={img.classification.colorTemperature || 'neutral'}
                            onValueChange={(v) =>
                              updateClassification(img.url, 'colorTemperature', v)
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
                            value={img.classification.energyLevel || 'balanced'}
                            onValueChange={(v) => updateClassification(img.url, 'energyLevel', v)}
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
                            value={img.classification.densityLevel || 'balanced'}
                            onValueChange={(v) => updateClassification(img.url, 'densityLevel', v)}
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
                            value={img.classification.formalityLevel || 'balanced'}
                            onValueChange={(v) =>
                              updateClassification(img.url, 'formalityLevel', v)
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
                        {img.classification.colorSamples &&
                          img.classification.colorSamples.length > 0 && (
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
                        {img.classification.industries &&
                          img.classification.industries.length > 0 && (
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
  )
}
