'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/shared/loading'
import { Save } from 'lucide-react'

interface Settings {
  creditPrice?: number
  maxRevisions?: number
  platformFeePercent?: number
  maintenanceMode?: boolean
  newUserCredits?: number
  minWithdrawal?: number
}

export default function SettingsPage() {
  const [, setSettings] = useState<Settings>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [localSettings, setLocalSettings] = useState<Settings>({
    creditPrice: 49,
    maxRevisions: 2,
    platformFeePercent: 20,
    maintenanceMode: false,
    newUserCredits: 0,
    minWithdrawal: 100,
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        const merged = {
          creditPrice: data.settings.creditPrice ?? 49,
          maxRevisions: data.settings.maxRevisions ?? 2,
          platformFeePercent: data.settings.platformFeePercent ?? 20,
          maintenanceMode: data.settings.maintenanceMode ?? false,
          newUserCredits: data.settings.newUserCredits ?? 0,
          minWithdrawal: data.settings.minWithdrawal ?? 100,
        }
        setSettings(data.settings)
        setLocalSettings(merged)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const _saveSetting = async (key: string, value: unknown) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })

      if (!response.ok) throw new Error('Failed to save')

      toast.success('Setting saved successfully')
      setSettings((prev) => ({ ...prev, [key]: value }))
    } catch {
      toast.error('Failed to save setting')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    try {
      const promises = Object.entries(localSettings).map(([key, value]) =>
        fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        })
      )

      await Promise.all(promises)
      toast.success('All settings saved successfully')
      setSettings(localSettings)
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure platform settings</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Configure platform settings</p>
        </div>
        <Button onClick={handleSaveAll} disabled={isSaving}>
          {isSaving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4 mr-2" />}
          Save All Changes
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Pricing Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Configure credit pricing and fees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="creditPrice">Credit Price ($)</Label>
                <Input
                  id="creditPrice"
                  type="number"
                  value={localSettings.creditPrice}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      creditPrice: Number(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">Price per credit in USD</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="platformFee">Platform Fee (%)</Label>
                <Input
                  id="platformFee"
                  type="number"
                  value={localSettings.platformFeePercent}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      platformFeePercent: Number(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Percentage taken from each task payment
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Task Settings</CardTitle>
            <CardDescription>Configure default task parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxRevisions">Max Revisions</Label>
                <Input
                  id="maxRevisions"
                  type="number"
                  value={localSettings.maxRevisions}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      maxRevisions: Number(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">Default maximum revisions per task</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newUserCredits">New User Credits</Label>
                <Input
                  id="newUserCredits"
                  type="number"
                  value={localSettings.newUserCredits}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      newUserCredits: Number(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">Free credits given to new users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Freelancer Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Freelancer Settings</CardTitle>
            <CardDescription>Configure freelancer-related settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="minWithdrawal">Minimum Withdrawal ($)</Label>
              <Input
                id="minWithdrawal"
                type="number"
                value={localSettings.minWithdrawal}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    minWithdrawal: Number(e.target.value),
                  })
                }
                className="max-w-xs"
              />
              <p className="text-xs text-muted-foreground">
                Minimum amount freelancers can withdraw
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle>System</CardTitle>
            <CardDescription>System-wide settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Disable the platform for maintenance
                </p>
              </div>
              <Switch
                checked={localSettings.maintenanceMode}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, maintenanceMode: checked })
                }
              />
            </div>
            <Separator />
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                When maintenance mode is enabled, users will see a maintenance page and won&apos;t
                be able to access the platform.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
