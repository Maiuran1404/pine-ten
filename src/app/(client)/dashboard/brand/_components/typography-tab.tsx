'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { SectionCard } from './section-card'
import type { BrandData } from '../_lib/brand-types'

interface TypographyTabProps {
  brand: BrandData
  updateField: (field: keyof BrandData, value: BrandData[keyof BrandData]) => void
}

export function TypographyTab({ brand, updateField }: TypographyTabProps) {
  const [keywordInput, setKeywordInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Load Google Fonts dynamically
  const loadFont = useCallback((fontName: string) => {
    if (!fontName) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const encoded = encodeURIComponent(fontName)
      const id = `google-font-${encoded}`
      if (document.getElementById(id)) return
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;600;700&display=swap`
      document.head.appendChild(link)
    }, 500)
  }, [])

  useEffect(() => {
    if (brand.primaryFont) loadFont(brand.primaryFont)
  }, [brand.primaryFont, loadFont])

  useEffect(() => {
    if (brand.secondaryFont) loadFont(brand.secondaryFont)
  }, [brand.secondaryFont, loadFont])

  const addKeyword = () => {
    if (keywordInput.trim()) {
      updateField('keywords', [...brand.keywords, keywordInput.trim()])
      setKeywordInput('')
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Typefaces" description="Fonts used across your brand materials">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Primary Font (Headings)</Label>
            <Input
              value={brand.primaryFont || ''}
              onChange={(e) => updateField('primaryFont', e.target.value)}
              placeholder="e.g., Inter, Roboto"
              className="h-11"
            />
            {brand.primaryFont && (
              <p
                className="text-lg font-bold text-foreground mt-3 p-3 bg-muted rounded-lg border border-border"
                style={{ fontFamily: brand.primaryFont }}
              >
                The quick brown fox
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-sm">Secondary Font (Body)</Label>
            <Input
              value={brand.secondaryFont || ''}
              onChange={(e) => updateField('secondaryFont', e.target.value)}
              placeholder="e.g., Open Sans, Lato"
              className="h-11"
            />
            {brand.secondaryFont && (
              <p
                className="text-base text-muted-foreground mt-3 p-3 bg-muted rounded-lg border border-border"
                style={{ fontFamily: brand.secondaryFont }}
              >
                The quick brown fox
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Brand Keywords" description="Words that define your brand personality">
        <div className="flex flex-wrap gap-2">
          {brand.keywords.map((keyword, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm border border-primary/20"
            >
              {keyword}
              <button
                onClick={() =>
                  updateField(
                    'keywords',
                    brand.keywords.filter((_, i) => i !== index)
                  )
                }
                className="hover:text-destructive ml-1"
              >
                &times;
              </button>
            </span>
          ))}
          <div className="flex items-center gap-1">
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              placeholder="Add keyword..."
              className="w-32 h-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addKeyword()
                }
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={addKeyword}
              disabled={!keywordInput.trim()}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
