'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ChevronDown,
  ChevronRight,
  Building2,
  Palette,
  Type,
  Globe,
  Link as LinkIcon,
  Image as ImageIcon,
  FileText,
  ExternalLink,
} from 'lucide-react'

interface BrandDNAProps {
  defaultExpanded?: boolean
  brandDNA: {
    name: string
    website?: string | null
    industry?: string | null
    description?: string | null
    logoUrl?: string | null
    faviconUrl?: string | null
    colors: {
      primary?: string | null
      secondary?: string | null
      accent?: string | null
      background?: string | null
      text?: string | null
      additional?: string[]
    }
    typography: {
      primaryFont?: string | null
      secondaryFont?: string | null
    }
    socialLinks?: {
      twitter?: string
      linkedin?: string
      facebook?: string
      instagram?: string
      youtube?: string
    } | null
    brandAssets?: {
      images?: string[]
      documents?: string[]
    } | null
    tagline?: string | null
    keywords?: string[] | null
  }
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-md border shadow-sm" style={{ backgroundColor: color }} />
      <div className="text-xs">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground uppercase">{color}</p>
      </div>
    </div>
  )
}

export function BrandDNA({ brandDNA, defaultExpanded = false }: BrandDNAProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded)

  const hasColors =
    brandDNA.colors.primary ||
    brandDNA.colors.secondary ||
    brandDNA.colors.accent ||
    brandDNA.colors.background ||
    brandDNA.colors.text ||
    (brandDNA.colors.additional && brandDNA.colors.additional.length > 0)

  const hasTypography = brandDNA.typography.primaryFont || brandDNA.typography.secondaryFont

  const hasSocialLinks =
    brandDNA.socialLinks && Object.values(brandDNA.socialLinks).some((link) => link)

  const hasAssets =
    brandDNA.brandAssets &&
    ((brandDNA.brandAssets.images && brandDNA.brandAssets.images.length > 0) ||
      (brandDNA.brandAssets.documents && brandDNA.brandAssets.documents.length > 0))

  return (
    <Card className="border-primary/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {brandDNA.name}
                    {brandDNA.industry && (
                      <Badge variant="secondary" className="font-normal">
                        {brandDNA.industry}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Brand Guidelines & Assets</p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Logo and Description */}
            <div className="flex gap-4">
              {brandDNA.logoUrl && (
                <div className="shrink-0">
                  <div className="w-20 h-20 relative border rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={brandDNA.logoUrl}
                      alt={`${brandDNA.name} logo`}
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                </div>
              )}
              <div className="flex-1 space-y-2">
                {brandDNA.tagline && (
                  <p className="text-sm italic text-muted-foreground">
                    &quot;{brandDNA.tagline}&quot;
                  </p>
                )}
                {brandDNA.description && <p className="text-sm">{brandDNA.description}</p>}
                {brandDNA.website && (
                  <a
                    href={
                      brandDNA.website.startsWith('http')
                        ? brandDNA.website
                        : `https://${brandDNA.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-3 w-3" />
                    {brandDNA.website}
                  </a>
                )}
              </div>
            </div>

            {/* Keywords */}
            {brandDNA.keywords && brandDNA.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {brandDNA.keywords.map((keyword, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}

            {/* Colors Section */}
            {hasColors && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">Brand Colors</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {brandDNA.colors.primary && (
                      <ColorSwatch color={brandDNA.colors.primary} label="Primary" />
                    )}
                    {brandDNA.colors.secondary && (
                      <ColorSwatch color={brandDNA.colors.secondary} label="Secondary" />
                    )}
                    {brandDNA.colors.accent && (
                      <ColorSwatch color={brandDNA.colors.accent} label="Accent" />
                    )}
                    {brandDNA.colors.background && (
                      <ColorSwatch color={brandDNA.colors.background} label="Background" />
                    )}
                    {brandDNA.colors.text && (
                      <ColorSwatch color={brandDNA.colors.text} label="Text" />
                    )}
                    {brandDNA.colors.additional &&
                      brandDNA.colors.additional.map((color, idx) => (
                        <ColorSwatch key={idx} color={color} label={`Color ${idx + 1}`} />
                      ))}
                  </div>
                </div>
              </>
            )}

            {/* Typography Section */}
            {hasTypography && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Type className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">Typography</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {brandDNA.typography.primaryFont && (
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Primary Font</p>
                        <p
                          className="text-lg font-semibold"
                          style={{
                            fontFamily: brandDNA.typography.primaryFont,
                          }}
                        >
                          {brandDNA.typography.primaryFont}
                        </p>
                      </div>
                    )}
                    {brandDNA.typography.secondaryFont && (
                      <div className="p-3 border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Secondary Font</p>
                        <p
                          className="text-lg"
                          style={{
                            fontFamily: brandDNA.typography.secondaryFont,
                          }}
                        >
                          {brandDNA.typography.secondaryFont}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Social Links */}
            {hasSocialLinks && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">Social Links</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {brandDNA.socialLinks?.twitter && (
                      <a
                        href={brandDNA.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                          Twitter/X
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Badge>
                      </a>
                    )}
                    {brandDNA.socialLinks?.instagram && (
                      <a
                        href={brandDNA.socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                          Instagram
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Badge>
                      </a>
                    )}
                    {brandDNA.socialLinks?.linkedin && (
                      <a
                        href={brandDNA.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                          LinkedIn
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Badge>
                      </a>
                    )}
                    {brandDNA.socialLinks?.facebook && (
                      <a
                        href={brandDNA.socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                          Facebook
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Badge>
                      </a>
                    )}
                    {brandDNA.socialLinks?.youtube && (
                      <a
                        href={brandDNA.socialLinks.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                          YouTube
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Badge>
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Brand Assets */}
            {hasAssets && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">Brand Assets</h4>
                  </div>
                  {brandDNA.brandAssets?.images && brandDNA.brandAssets.images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {brandDNA.brandAssets.images.map((img, idx) => (
                        <a
                          key={idx}
                          href={img}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative aspect-square border rounded-lg overflow-hidden bg-muted hover:ring-2 ring-primary transition-all"
                        >
                          <Image
                            src={img}
                            alt={`Brand asset ${idx + 1}`}
                            fill
                            className="object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                  {brandDNA.brandAssets?.documents && brandDNA.brandAssets.documents.length > 0 && (
                    <div className="space-y-1">
                      {brandDNA.brandAssets.documents.map((doc, idx) => (
                        <a
                          key={idx}
                          href={doc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 border rounded hover:bg-muted transition-colors"
                        >
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm truncate flex-1">
                            {doc.split('/').pop() || `Document ${idx + 1}`}
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
