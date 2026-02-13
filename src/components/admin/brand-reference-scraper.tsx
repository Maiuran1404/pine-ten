'use client'

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
import {
  TONE_BUCKETS,
  ENERGY_BUCKETS,
  DENSITY_BUCKETS,
  COLOR_BUCKETS,
  TONE_BUCKET_LABELS,
  ENERGY_BUCKET_LABELS,
  DENSITY_BUCKET_LABELS,
  COLOR_BUCKET_LABELS,
} from '@/lib/constants/reference-libraries'
import { cn } from '@/lib/utils'
import { parseUrls, parsePageUrls } from './brand-reference-scraper.utils'
import { useBrandReferenceScraperData } from './useBrandReferenceScraperData'

interface BrandReferenceScraperProps {
  onUploadComplete?: () => void
}

export function BrandReferenceScraper({ onUploadComplete }: BrandReferenceScraperProps) {
  const {
    activeTab,
    setActiveTab,
    urlInput,
    setUrlInput,
    pageUrl,
    setPageUrl,
    pageUrls,
    setPageUrls,
    isScrapingPage,
    scrapeProgress,
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
    handleScrapePage,
    handleBulkScrape,
    toggleImageSelection,
    selectAllImages,
    clearSelection,
    handleStartClassification,
    updateClassification,
    handleUploadAll,
    removeImage,
    handleReset,
  } = useBrandReferenceScraperData({ onUploadComplete })

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
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'urls' | 'scrape')}>
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
                    <Button onClick={handleScrapePage} disabled={!pageUrl || isScrapingPage}>
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt || ''}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' fill='%23999' font-size='12'%3EError%3C/text%3E%3C/svg%3E"
                    }}
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
                    <div className="w-20 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
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

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">Tone</Label>
                          <Select
                            value={img.classification.toneBucket}
                            onValueChange={(v) => updateClassification(img.url, 'toneBucket', v)}
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
                            onValueChange={(v) => updateClassification(img.url, 'energyBucket', v)}
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
                            onValueChange={(v) => updateClassification(img.url, 'densityBucket', v)}
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
                            onValueChange={(v) => updateClassification(img.url, 'colorBucket', v)}
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
  )
}
