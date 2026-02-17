'use client'

import Image from 'next/image'
import { Type } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { BrandDNA } from '@/components/task-detail/types'

interface BrandDNACardProps {
  brandDNA: BrandDNA
}

export function BrandDNACard({ brandDNA }: BrandDNACardProps) {
  const allColors = [
    brandDNA.colors.primary,
    brandDNA.colors.secondary,
    brandDNA.colors.accent,
    ...brandDNA.colors.additional,
  ].filter(Boolean) as string[]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {brandDNA.logoUrl ? (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/60">
              <Image
                src={brandDNA.logoUrl}
                alt={`${brandDNA.name} logo`}
                fill
                className="object-contain"
                sizes="40px"
              />
            </div>
          ) : brandDNA.faviconUrl ? (
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border/60">
              <Image
                src={brandDNA.faviconUrl}
                alt={`${brandDNA.name} favicon`}
                fill
                className="object-contain"
                sizes="40px"
              />
            </div>
          ) : null}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate">{brandDNA.name}</span>
              {brandDNA.industry && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {brandDNA.industry}
                </Badge>
              )}
            </div>
            {brandDNA.tagline && (
              <p className="text-sm text-muted-foreground truncate">{brandDNA.tagline}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Brand Colors */}
        {allColors.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Colors</span>
            <div className="flex gap-1.5">
              {allColors.map((color) => (
                <div
                  key={color}
                  className="h-5 w-5 rounded-full border border-border/60"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}

        {/* Typography */}
        {(brandDNA.typography.primaryFont || brandDNA.typography.secondaryFont) && (
          <div className="flex items-center gap-2">
            <Type className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2 text-sm">
              {brandDNA.typography.primaryFont && (
                <span className="font-medium">{brandDNA.typography.primaryFont}</span>
              )}
              {brandDNA.typography.primaryFont && brandDNA.typography.secondaryFont && (
                <span className="text-muted-foreground">/</span>
              )}
              {brandDNA.typography.secondaryFont && (
                <span className="text-muted-foreground">{brandDNA.typography.secondaryFont}</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
