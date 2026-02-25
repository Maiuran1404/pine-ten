'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCsrfContext } from '@/providers/csrf-provider'
import { queryKeys } from '@/hooks/use-queries'
import type { BrandData, Audience } from '../_lib/brand-types'

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
  const audiences = audiencesQuery.data ?? []
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

  const handleRedoOnboarding = useCallback(() => {
    setIsResettingOnboarding(true)
    csrfFetch('/api/brand/reset-onboarding', { method: 'POST' }).catch(() => {})
    window.location.href = '/onboarding'
  }, [csrfFetch])

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
    isResettingOnboarding,
    copiedColor,
    hasChanges,
    updateField,
    addBrandColor,
    removeBrandColor,
    handleSave,
    handleRescan,
    handleRedoOnboarding,
    handleDeleteAudience,
    handleSetPrimaryAudience,
    copyColor,
  }
}
