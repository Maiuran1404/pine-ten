'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { useCsrfContext } from '@/providers/csrf-provider'
import type { BrandData, Audience } from '../_lib/brand-types'

export function useBrandPage() {
  const { csrfFetch } = useCsrfContext()
  const [brand, setBrand] = useState<BrandData | null>(null)
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isRescanning, setIsRescanning] = useState(false)
  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false)
  const [copiedColor, setCopiedColor] = useState<string | null>(null)

  const savedSnapshotRef = useRef<string | null>(null)

  const hasChanges = brand !== null && JSON.stringify(brand) !== savedSnapshotRef.current

  // Fetch brand data
  const fetchBrand = useCallback(async () => {
    try {
      const response = await fetch('/api/brand')

      if (response.status === 404) {
        setBrand(null)
        setIsLoading(false)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch brand')
      }
      const result = await response.json()
      setBrand(result.data)
      savedSnapshotRef.current = JSON.stringify(result.data)
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load brand information')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch audiences
  const fetchAudiences = useCallback(async () => {
    try {
      const response = await fetch('/api/audiences')
      if (response.ok) {
        const result = await response.json()
        setAudiences(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch audiences:', error)
    }
  }, [])

  useEffect(() => {
    fetchBrand()
    fetchAudiences()
  }, [fetchBrand, fetchAudiences])

  // Beforeunload warning when dirty
  useEffect(() => {
    if (!hasChanges) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  const updateField = useCallback((field: keyof BrandData, value: unknown) => {
    setBrand((prev) => (prev ? { ...prev, [field]: value } : null))
  }, [])

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

  const handleSave = useCallback(async () => {
    if (!brand) return

    setIsSaving(true)
    try {
      const response = await csrfFetch('/api/brand', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brand),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      savedSnapshotRef.current = JSON.stringify(brand)
      toast.success('Brand updated successfully!')
    } catch {
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }, [brand, csrfFetch])

  const handleRescan = useCallback(async () => {
    if (!brand?.website) {
      toast.error('No website to scan')
      return
    }

    setIsRescanning(true)
    try {
      const response = await csrfFetch('/api/brand/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: brand.website }),
      })

      if (!response.ok) {
        throw new Error('Scan failed')
      }

      const result = await response.json()
      setBrand((prev) =>
        prev
          ? {
              ...prev,
              ...result.data,
              id: prev.id,
            }
          : null
      )
      toast.success('Brand information refreshed from website!')
    } catch {
      toast.error('Failed to scan website')
    } finally {
      setIsRescanning(false)
    }
  }, [brand?.website, csrfFetch])

  const handleRedoOnboarding = useCallback(() => {
    setIsResettingOnboarding(true)
    csrfFetch('/api/brand/reset-onboarding', { method: 'POST' }).catch(() => {})
    window.location.href = '/onboarding'
  }, [csrfFetch])

  const handleDeleteAudience = useCallback(
    async (audienceId: string) => {
      try {
        const response = await csrfFetch(`/api/audiences/${audienceId}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          setAudiences((prev) => prev.filter((a) => a.id !== audienceId))
          toast.success('Audience removed')
        } else {
          throw new Error('Failed to delete')
        }
      } catch {
        toast.error('Failed to remove audience')
      }
    },
    [csrfFetch]
  )

  const handleSetPrimaryAudience = useCallback(
    async (audienceId: string) => {
      try {
        const response = await csrfFetch(`/api/audiences/${audienceId}/primary`, {
          method: 'PUT',
        })
        if (response.ok) {
          setAudiences((prev) =>
            prev.map((a) => ({
              ...a,
              isPrimary: a.id === audienceId,
            }))
          )
          toast.success('Primary audience updated')
        } else {
          throw new Error('Failed to update')
        }
      } catch {
        toast.error('Failed to update primary audience')
      }
    },
    [csrfFetch]
  )

  const copyColor = useCallback((color: string) => {
    navigator.clipboard.writeText(color)
    setCopiedColor(color)
    setTimeout(() => setCopiedColor(null), 2000)
  }, [])

  return {
    brand,
    audiences,
    isLoading,
    isSaving,
    isRescanning,
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
