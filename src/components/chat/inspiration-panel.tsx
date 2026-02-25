/**
 * Inspiration panel for the chat right panel.
 *
 * Three states:
 * 1. Browsing — 2-column frameless gallery cards (click to preview)
 * 2. Previewing — full-panel iframe takeover with Select/Back
 * 3. Has selections — compact rows above the gallery
 */
'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UrlInput } from '@/components/website-flow/inspiration/url-input'
import { Skeleton } from '@/components/ui/skeleton'
import type { WebsiteInspiration } from '@/lib/ai/briefing-state-machine'

// =============================================================================
// TYPES
// =============================================================================

interface GalleryItem {
  id: string
  name: string
  url: string
  screenshotUrl: string
  industry: string[]
  styleTags: string[]
}

interface InspirationPanelProps {
  selectedInspirations: WebsiteInspiration[]
  inspirationGallery: GalleryItem[]
  selectedIds: string[]
  isGalleryLoading?: boolean
  isCapturingScreenshot?: boolean
  onSelectGalleryItem: (item: {
    id: string
    name: string
    url: string
    screenshotUrl: string
  }) => void
  onRemoveInspiration: (id: string) => void
  onCaptureScreenshot?: (url: string) => Promise<WebsiteInspiration>
  className?: string
}

// =============================================================================
// HELPERS
// =============================================================================

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// =============================================================================
// GALLERY CARD — frameless thumbnail with gradient overlay
// =============================================================================

function GalleryCard({
  item,
  selected,
  onPreview,
}: {
  item: GalleryItem
  selected: boolean
  onPreview: () => void
}) {
  const [hasError, setHasError] = useState(false)

  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer group border border-border/40 hover:border-border transition-colors"
      onClick={onPreview}
    >
      {/* Screenshot */}
      <div className="aspect-[4/3] bg-muted">
        {hasError ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-muted to-muted/80">
            <Globe className="w-6 h-6 text-muted-foreground/25" />
            <span className="text-[10px] text-muted-foreground/50">{getHostname(item.url)}</span>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.screenshotUrl}
            alt={item.name}
            className="w-full h-full object-cover object-top"
            loading="lazy"
            onError={() => setHasError(true)}
          />
        )}
      </div>

      {/* Bottom gradient + name */}
      <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 to-transparent flex items-end px-2.5 pb-2">
        <span className="text-[12px] font-medium text-white leading-tight truncate flex-1">
          {item.name}
        </span>
      </div>

      {/* Hover preview scrim */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <div className="bg-white/90 dark:bg-zinc-800/90 rounded-full p-2 shadow-sm">
          <Eye className="w-4 h-4 text-foreground" />
        </div>
      </div>

      {/* Selected ring */}
      {selected && (
        <div className="absolute inset-0 ring-2 ring-inset ring-emerald-500 rounded-lg pointer-events-none" />
      )}
    </div>
  )
}

// =============================================================================
// SITE PREVIEW — full-panel scrollable iframe (loaded via srcdoc to prevent
// navigation hijacking — the proxied site's JS can't navigate the iframe
// to our app domain since srcdoc resolves relative URLs to about:srcdoc)
// =============================================================================

function SitePreview({
  item,
  isSelected,
  onBack,
  onSelect,
}: {
  item: GalleryItem
  isSelected: boolean
  onBack: () => void
  onSelect: () => void
}) {
  const [srcdoc, setSrcdoc] = useState<string | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [fetchFailed, setFetchFailed] = useState(false)
  const proxyUrl = `/api/website-flow/proxy?url=${encodeURIComponent(item.url)}`

  // Fetch proxy HTML client-side and inject as srcdoc.
  // This prevents the proxied site's JS from navigating the iframe to our app.
  useEffect(() => {
    let cancelled = false
    fetch(proxyUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`)
        return res.text()
      })
      .then((html) => {
        if (!cancelled) setSrcdoc(html)
      })
      .catch(() => {
        if (!cancelled) setFetchFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [proxyUrl])

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="shrink-0 h-11 flex items-center gap-2 px-3 border-b border-border/40">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Gallery
        </button>
        <span className="flex-1 text-center text-xs text-muted-foreground truncate px-2">
          {getHostname(item.url)}
        </span>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          Visit <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Preview content */}
      <div className="relative flex-1 bg-muted/30">
        {fetchFailed ? (
          <div className="flex flex-col h-full items-center justify-center gap-2">
            <Globe className="w-8 h-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground/50">Preview unavailable</p>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-foreground hover:underline inline-flex items-center gap-1 mt-1"
            >
              Open in new tab <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <>
            {/* Screenshot + spinner while loading */}
            {!iframeLoaded && (
              <>
                {item.screenshotUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.screenshotUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground/40" />
                </div>
              </>
            )}
            {srcdoc && (
              <iframe
                srcDoc={srcdoc}
                title={item.name}
                sandbox="allow-scripts"
                className={cn('w-full h-full border-none', !iframeLoaded && 'opacity-0')}
                onLoad={() => setIframeLoaded(true)}
              />
            )}
          </>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 h-14 flex items-center gap-2 px-3 border-t border-border/40 bg-background">
        <button
          onClick={onSelect}
          className={cn(
            'flex-1 h-9 rounded-md text-sm font-medium transition-colors',
            isSelected
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-foreground text-background hover:bg-foreground/90'
          )}
        >
          {isSelected ? 'Selected' : 'Select this site'}
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3 h-9 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-1.5"
        >
          Open
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  )
}

// =============================================================================
// SELECTED CARD — compact row with expand/collapse for live iframe
// =============================================================================

function SelectedWebsiteCard({
  item,
  isExpanded,
  onToggleExpand,
  onRemove,
}: {
  item: WebsiteInspiration
  isExpanded: boolean
  onToggleExpand: () => void
  onRemove: () => void
}) {
  const handleVisit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.open(item.url, '_blank', 'noopener,noreferrer')
    },
    [item.url]
  )

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-lg border border-border/50 bg-card overflow-hidden"
    >
      {/* Compact row */}
      <div
        className="group flex items-center gap-3 p-2 hover:bg-accent/50 transition-colors cursor-pointer"
        onClick={onToggleExpand}
      >
        {/* Thumbnail */}
        <div className="shrink-0 w-14 h-10 rounded overflow-hidden bg-muted">
          {item.screenshotUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={item.screenshotUrl}
              alt={item.name}
              className="w-full h-full object-cover object-top"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Globe className="w-4 h-4 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">{item.name}</span>
          <span className="text-[11px] text-muted-foreground truncate block">
            {getHostname(item.url)}
          </span>
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1">
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <button
            onClick={handleVisit}
            className="p-1 rounded hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="p-1 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Expanded screenshot preview */}
      {isExpanded && item.screenshotUrl && (
        <div className="border-t border-border/30 max-h-[420px] overflow-hidden bg-muted/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.screenshotUrl}
            alt={item.name}
            className="w-full object-cover object-top"
          />
        </div>
      )}
    </motion.div>
  )
}

// =============================================================================
// MAIN PANEL
// =============================================================================

export function InspirationPanel({
  selectedInspirations,
  inspirationGallery,
  selectedIds,
  isGalleryLoading,
  isCapturingScreenshot,
  onSelectGalleryItem,
  onRemoveInspiration,
  onCaptureScreenshot,
  className,
}: InspirationPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [previewingItem, setPreviewingItem] = useState<GalleryItem | null>(null)

  // ── Preview mode — full-panel takeover ──
  if (previewingItem) {
    const isSelected = selectedIds.includes(previewingItem.id)

    return (
      <div className={cn('flex flex-col h-full', className)}>
        <SitePreview
          item={previewingItem}
          isSelected={isSelected}
          onBack={() => setPreviewingItem(null)}
          onSelect={() => {
            onSelectGalleryItem({
              id: previewingItem.id,
              name: previewingItem.name,
              url: previewingItem.url,
              screenshotUrl: previewingItem.screenshotUrl,
            })
          }}
        />
      </div>
    )
  }

  // ── Browse mode — selected rows + gallery grid ──
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="shrink-0 px-3 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold text-foreground">Inspiration</span>
        </div>
        <p className="text-xs text-muted-foreground/60 mt-1">
          {selectedInspirations.length === 0
            ? 'Tap a website to preview, then select the ones you like'
            : 'Add more references or continue chatting'}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-3 py-3 space-y-4">
          {/* Selected section */}
          {selectedInspirations.length > 0 && (
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60 mb-2 block">
                Selected ({selectedInspirations.length})
              </span>
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {selectedInspirations.map((item) => (
                    <SelectedWebsiteCard
                      key={item.id}
                      item={item}
                      isExpanded={expandedId === item.id}
                      onToggleExpand={() =>
                        setExpandedId((prev) => (prev === item.id ? null : item.id))
                      }
                      onRemove={() => onRemoveInspiration(item.id)}
                    />
                  ))}
                </div>
              </AnimatePresence>
            </div>
          )}

          {/* Gallery section */}
          {(isGalleryLoading || inspirationGallery.length > 0) && (
            <div>
              {selectedInspirations.length > 0 && (
                <div className="border-t border-dashed border-border/40 mb-4" />
              )}
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60 mb-2.5 block">
                Suggestions
              </span>

              {isGalleryLoading ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {inspirationGallery.map((item) => (
                    <GalleryCard
                      key={item.id}
                      item={item}
                      selected={selectedIds.includes(item.id)}
                      onPreview={() => setPreviewingItem(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* URL input */}
          {onCaptureScreenshot && (
            <div className="pt-3 border-t border-border/30">
              <UrlInput onSubmit={onCaptureScreenshot} isLoading={isCapturingScreenshot} />
            </div>
          )}

          {/* Capturing indicator */}
          {isCapturingScreenshot && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Capturing screenshot...
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
