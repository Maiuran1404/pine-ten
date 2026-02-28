'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCsrfContext } from '@/providers/csrf-provider'
import { queryKeys } from '@/hooks/use-queries'
import type { BrandData, Audience, TabId, TabCompletionStatus } from '../_lib/brand-types'
import { TAB_COMPLETION_FIELDS } from '../_lib/brand-constants'

async function fetchBrandData(): Promise<BrandData | null> {
  const response = await fetch('/api/brand')

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Failed to fetch brand')
  }

  const result = await response.json()
  return result.data
}

async function fetchAudiencesData(): Promise<Audience[]> {
  const response = await fetch('/api/audiences')
  if (!response.ok) {
    return []
  }
  const result = await response.json()
  return result.data || []
}

export function useBrandPage() {
  const { csrfFetch } = useCsrfContext()
  const queryClient = useQueryClient()

  // Local edits overlay — null means no unsaved changes
  const [localEdits, setLocalEdits] = useState<BrandData | null>(null)
  const [copiedColor, setCopiedColor] = useState<string | null>(null)
  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false)

  // ── Queries ──────────────────────────────────────────────────────

  const brandQuery = useQuery({
    queryKey: queryKeys.brand.current(),
    queryFn: fetchBrandData,
  })

  const audiencesQuery = useQuery({
    queryKey: queryKeys.audiences.list(),
    queryFn: fetchAudiencesData,
  })

  // The brand exposed to consumers: local edits take precedence over server data
  const brand = localEdits ?? brandQuery.data ?? null
  const audiences = useMemo(() => audiencesQuery.data ?? [], [audiencesQuery.data])
  const isLoading = brandQuery.isLoading || audiencesQuery.isLoading
  const hasChanges = localEdits !== null

  // Beforeunload warning when dirty
  useEffect(() => {
    if (!hasChanges) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  // ── Local field updates (optimistic, no server call) ─────────────

  const updateField = useCallback(
    (field: keyof BrandData, value: unknown) => {
      setLocalEdits((prev) => {
        // Start from existing local edits, or from server data
        const base = prev ?? brandQuery.data
        return base ? { ...base, [field]: value } : null
      })
    },
    [brandQuery.data]
  )

  const addBrandColor = useCallback(
    (color: string) => {
      if (brand && color && !brand.brandColors.includes(color)) {
        updateField('brandColors', [...brand.brandColors, color])
      }
    },
    [brand, updateField]
  )

  const removeBrandColor = useCallback(
    (index: number) => {
      if (brand) {
        updateField(
          'brandColors',
          brand.brandColors.filter((_, i) => i !== index)
        )
      }
    },
    [brand, updateField]
  )

  const copyColor = useCallback((color: string) => {
    navigator.clipboard.writeText(color)
    setCopiedColor(color)
    setTimeout(() => setCopiedColor(null), 2000)
  }, [])

  // ── Mutations ────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async (brandData: BrandData) => {
      const response = await csrfFetch('/api/brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandData),
      })
      if (!response.ok) {
        throw new Error('Failed to save')
      }
      return response.json()
    },
    onSuccess: () => {
      setLocalEdits(null)
      toast.success('Brand updated successfully!')
      queryClient.invalidateQueries({ queryKey: queryKeys.brand.all })
    },
    onError: () => {
      toast.error('Failed to save changes')
    },
  })

  const rescanMutation = useMutation({
    mutationFn: async (websiteUrl: string) => {
      const response = await csrfFetch('/api/brand/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl }),
      })
      if (!response.ok) {
        throw new Error('Scan failed')
      }
      const result = await response.json()
      return result.data
    },
    onSuccess: (data) => {
      setLocalEdits((prev) => {
        const base = prev ?? brandQuery.data
        return base
          ? {
              ...base,
              ...data,
              id: base.id,
            }
          : null
      })
      toast.success('Brand information refreshed from website!')
    },
    onError: () => {
      toast.error('Failed to scan website')
    },
  })

  const deleteAudienceMutation = useMutation({
    mutationFn: async (audienceId: string) => {
      const response = await csrfFetch(`/api/audiences/${audienceId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete')
      }
    },
    onSuccess: (_data, audienceId) => {
      queryClient.setQueryData<Audience[]>(
        queryKeys.audiences.list(),
        (old) => old?.filter((a) => a.id !== audienceId) ?? []
      )
      toast.success('Audience removed')
    },
    onError: () => {
      toast.error('Failed to remove audience')
    },
  })

  const deepScanMutation = useMutation({
    mutationFn: async (websiteUrl: string) => {
      const response = await csrfFetch('/api/brand/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl, deep: true }),
      })
      if (!response.ok) {
        throw new Error('Deep scan failed')
      }
      const result = await response.json()
      return result.data
    },
    onSuccess: (data) => {
      setLocalEdits((prev) => {
        const base = prev ?? brandQuery.data
        return base
          ? {
              ...base,
              ...data,
              id: base.id,
            }
          : null
      })
      toast.success('Deep scan complete — new brand data populated!')
    },
    onError: () => {
      toast.error('Deep scan failed. Try again later.')
    },
  })

  const enrichCompetitorsMutation = useMutation({
    mutationFn: async (competitors: Array<{ name: string; website?: string }>) => {
      const response = await csrfFetch('/api/brand/competitors/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitors }),
      })
      if (!response.ok) {
        throw new Error('Enrichment failed')
      }
      const result = await response.json()
      return result.data
    },
    onSuccess: (data) => {
      if (!data?.competitors) return
      setLocalEdits((prev) => {
        const base = prev ?? brandQuery.data
        if (!base) return null
        const existing = base.competitors || []
        const merged = existing.map((comp) => {
          const enriched = (
            data.competitors as Array<{
              name: string
              website: string | null
              description: string | null
              primaryColor: string | null
              logoUrl: string | null
              positioning: string | null
              strengths: string | null
              weaknesses: string | null
            }>
          ).find((e) => e.name.toLowerCase() === comp.name.toLowerCase())
          if (!enriched) return comp
          return {
            ...comp,
            website: enriched.website || comp.website,
            positioning: enriched.positioning || comp.positioning,
            strengths: enriched.strengths || comp.strengths,
            weaknesses: enriched.weaknesses || comp.weaknesses,
          }
        })
        return { ...base, competitors: merged }
      })
      toast.success(`Enriched ${data.enriched}/${data.total} competitors`)
    },
    onError: () => {
      toast.error('Failed to enrich competitors')
    },
  })

  const extractPdfMutation = useMutation({
    mutationFn: async (file: File) => {
      // Step 1: Upload PDF
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'brand')

      const uploadResponse = await csrfFetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload PDF')
      }
      const uploadResult = await uploadResponse.json()
      const pdfUrl = uploadResult.data?.url || uploadResult.url

      if (!pdfUrl) {
        throw new Error('No URL returned from upload')
      }

      // Step 2: Extract brand data from PDF
      const extractResponse = await csrfFetch('/api/brand/extract-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl }),
      })
      if (!extractResponse.ok) {
        throw new Error('Failed to extract brand data from PDF')
      }
      const extractResult = await extractResponse.json()
      return extractResult.data
    },
    onSuccess: (data) => {
      if (!data?.extracted) return
      setLocalEdits((prev) => {
        const base = prev ?? brandQuery.data
        if (!base) return null
        const extracted = data.extracted as Record<string, unknown>
        // Only merge non-null, non-empty fields
        const updates: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(extracted)) {
          if (value === null || value === undefined) continue
          if (Array.isArray(value) && value.length === 0) continue
          updates[key] = value
        }
        return { ...base, ...updates }
      })
      toast.success(`Extracted ${data.fieldsFound} fields from PDF!`)
    },
    onError: () => {
      toast.error('Failed to extract brand data from PDF')
    },
  })

  const setPrimaryAudienceMutation = useMutation({
    mutationFn: async (audienceId: string) => {
      const response = await csrfFetch(`/api/audiences/${audienceId}/primary`, {
        method: 'PUT',
      })
      if (!response.ok) {
        throw new Error('Failed to update')
      }
    },
    onSuccess: (_data, audienceId) => {
      queryClient.setQueryData<Audience[]>(
        queryKeys.audiences.list(),
        (old) =>
          old?.map((a) => ({
            ...a,
            isPrimary: a.id === audienceId,
          })) ?? []
      )
      toast.success('Primary audience updated')
    },
    onError: () => {
      toast.error('Failed to update primary audience')
    },
  })

  // ── Completeness calculation ─────────────────────────────────────

  const tabCompletionStatus = useMemo((): Record<TabId, TabCompletionStatus> => {
    if (!brand) {
      return {
        company: 'empty',
        colors: 'empty',
        typography: 'empty',
        social: 'empty',
        audiences: 'empty',
        positioning: 'empty',
        voice: 'empty',
        competitors: 'empty',
      }
    }

    const result = {} as Record<TabId, TabCompletionStatus>

    for (const [tabId, fields] of Object.entries(TAB_COMPLETION_FIELDS) as [TabId, string[]][]) {
      if (tabId === 'audiences') {
        result[tabId] = audiences.length > 0 ? 'complete' : 'empty'
        continue
      }

      if (fields.length === 0) {
        result[tabId] = 'empty'
        continue
      }

      let filled = 0
      for (const field of fields) {
        const value = brand[field as keyof BrandData]
        if (value == null) continue
        if (typeof value === 'string' && value.trim()) filled++
        else if (Array.isArray(value) && value.length > 0) filled++
        else if (typeof value === 'object' && !Array.isArray(value)) {
          const hasAny = Object.values(value as Record<string, unknown>).some(
            (v) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0)
          )
          if (hasAny) filled++
        }
      }

      if (filled === 0) result[tabId] = 'empty'
      else if (filled >= fields.length) result[tabId] = 'complete'
      else result[tabId] = 'partial'
    }

    return result
  }, [brand, audiences])

  const overallCompletion = useMemo((): number => {
    if (!brand) return 0

    const allFields = Object.entries(TAB_COMPLETION_FIELDS)
      .filter(([tabId]) => tabId !== 'audiences')
      .flatMap(([, fields]) => fields)

    let filled = 0
    const total = allFields.length + 1 // +1 for audiences

    for (const field of allFields) {
      const value = brand[field as keyof BrandData]
      if (value == null) continue
      if (typeof value === 'string' && value.trim()) filled++
      else if (Array.isArray(value) && value.length > 0) filled++
      else if (typeof value === 'object' && !Array.isArray(value)) {
        const hasAny = Object.values(value as Record<string, unknown>).some(
          (v) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0)
        )
        if (hasAny) filled++
      }
    }

    if (audiences.length > 0) filled++

    return Math.round((filled / total) * 100)
  }, [brand, audiences])

  // ── Handlers (stable references matching old API) ────────────────

  const handleSave = useCallback(async () => {
    if (!brand) return
    saveMutation.mutate(brand)
  }, [brand, saveMutation])

  const handleRescan = useCallback(async () => {
    if (!brand?.website) {
      toast.error('No website to scan')
      return
    }
    rescanMutation.mutate(brand.website)
  }, [brand, rescanMutation])

  const handleRedoOnboarding = useCallback(async () => {
    setIsResettingOnboarding(true)
    try {
      const response = await csrfFetch('/api/brand/reset-onboarding', { method: 'POST' })
      if (!response.ok) {
        throw new Error('Failed to reset onboarding')
      }
      // Hard navigation (not router.push) to tear down the React tree,
      // clear all React Query caches, and force a fresh session evaluation.
      window.location.href = '/onboarding?reset=true'
    } catch {
      setIsResettingOnboarding(false)
      toast.error('Failed to reset onboarding. Please try again.')
    }
  }, [csrfFetch])

  const handleDeepScan = useCallback(async () => {
    if (!brand?.website) {
      toast.error('No website to scan')
      return
    }
    deepScanMutation.mutate(brand.website)
  }, [brand, deepScanMutation])

  const handleEnrichCompetitors = useCallback(async () => {
    const competitors = brand?.competitors
    if (!competitors || competitors.length === 0) {
      toast.error('Add competitors first')
      return
    }
    const toEnrich = competitors
      .filter((c) => c.name.trim())
      .map((c) => ({ name: c.name, website: c.website }))
    if (toEnrich.length === 0) {
      toast.error('Competitors need names to enrich')
      return
    }
    enrichCompetitorsMutation.mutate(toEnrich)
  }, [brand, enrichCompetitorsMutation])

  const handleExtractPdf = useCallback(
    async (file: File) => {
      extractPdfMutation.mutate(file)
    },
    [extractPdfMutation]
  )

  const handleDeleteAudience = useCallback(
    async (audienceId: string) => {
      deleteAudienceMutation.mutate(audienceId)
    },
    [deleteAudienceMutation]
  )

  const handleSetPrimaryAudience = useCallback(
    async (audienceId: string) => {
      setPrimaryAudienceMutation.mutate(audienceId)
    },
    [setPrimaryAudienceMutation]
  )

  // ── Public interface (unchanged from original) ───────────────────

  return {
    brand,
    audiences,
    isLoading,
    isSaving: saveMutation.isPending,
    isRescanning: rescanMutation.isPending,
    isDeepScanning: deepScanMutation.isPending,
    isEnrichingCompetitors: enrichCompetitorsMutation.isPending,
    isExtractingPdf: extractPdfMutation.isPending,
    isResettingOnboarding,
    copiedColor,
    hasChanges,
    tabCompletionStatus,
    overallCompletion,
    updateField,
    addBrandColor,
    removeBrandColor,
    handleSave,
    handleRescan,
    handleDeepScan,
    handleEnrichCompetitors,
    handleExtractPdf,
    handleRedoOnboarding,
    handleDeleteAudience,
    handleSetPrimaryAudience,
    copyColor,
  }
}
