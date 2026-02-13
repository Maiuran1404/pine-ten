'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { signOut } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export interface UserSettings {
  id: string
  name: string
  email: string
  phone: string | null
  image: string | null
  createdAt: string
}

export function useSettings() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })

  useEffect(() => {
    let cancelled = false
    async function loadUserSettings() {
      try {
        const response = await fetch('/api/user/settings')
        if (response.ok && !cancelled) {
          const { data } = await response.json()
          setUserSettings(data.user)
          setFormData({
            name: data.user.name || '',
            phone: data.user.phone || '',
          })
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch settings:', error)
          toast.error('Failed to load settings')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }
    loadUserSettings()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSaveProfile = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
        }),
      })

      if (response.ok) {
        toast.success('Profile updated successfully')
      } else {
        throw new Error('Failed to update profile')
      }
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      router.push('/login')
    } catch {
      toast.error('Failed to log out')
      setIsLoggingOut(false)
    }
  }

  const getInitials = (name: string | undefined | null): string => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  return {
    isLoading,
    isSaving,
    isLoggingOut,
    userSettings,
    setUserSettings,
    formData,
    setFormData,
    handleSaveProfile,
    handleLogout,
    getInitials,
  }
}
