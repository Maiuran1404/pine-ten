'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Bell,
  Mail,
  MessageCircle,
  Smartphone,
  Users,
  Briefcase,
  Shield,
  Loader2,
  RefreshCw,
  Edit2,
  Save,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationSetting {
  id: string
  eventType: string
  name: string
  description: string | null
  emailEnabled: boolean
  whatsappEnabled: boolean
  inAppEnabled: boolean
  notifyClient: boolean
  notifyFreelancer: boolean
  notifyAdmin: boolean
  emailSubject: string | null
  emailTemplate: string | null
  whatsappTemplate: string | null
  updatedAt: string
}

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('rounded-xl border border-border bg-card', className)}>{children}</div>
)

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [editingSetting, setEditingSetting] = useState<NotificationSetting | null>(null)
  const [editForm, setEditForm] = useState({
    emailSubject: '',
    emailTemplate: '',
    whatsappTemplate: '',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/notifications')
      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      } else {
        toast.error('Failed to load notification settings')
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      toast.error('Failed to load notification settings')
    } finally {
      setIsLoading(false)
    }
  }

  const updateSetting = async (id: string, updates: Partial<NotificationSetting>) => {
    setIsSaving(id)
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })

      if (response.ok) {
        setSettings((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
        toast.success('Setting updated')
      } else {
        toast.error('Failed to update setting')
      }
    } catch {
      toast.error('Failed to update setting')
    } finally {
      setIsSaving(null)
    }
  }

  const resetToDefaults = async () => {
    if (!confirm('Reset all notification settings to defaults? This cannot be undone.')) {
      return
    }
    setIsResetting(true)
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        toast.success('Settings reset to defaults')
      } else {
        toast.error('Failed to reset settings')
      }
    } catch {
      toast.error('Failed to reset settings')
    } finally {
      setIsResetting(false)
    }
  }

  const openTemplateEditor = (setting: NotificationSetting) => {
    setEditingSetting(setting)
    setEditForm({
      emailSubject: setting.emailSubject || '',
      emailTemplate: setting.emailTemplate || '',
      whatsappTemplate: setting.whatsappTemplate || '',
    })
  }

  const saveTemplates = async () => {
    if (!editingSetting) return

    await updateSetting(editingSetting.id, {
      emailSubject: editForm.emailSubject,
      emailTemplate: editForm.emailTemplate,
      whatsappTemplate: editForm.whatsappTemplate,
    })

    setEditingSetting(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-full p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Notification Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure which events trigger notifications and how they are sent
          </p>
        </div>
        <Button variant="outline" onClick={resetToDefaults} disabled={isResetting}>
          {isResetting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Reset to Defaults
        </Button>
      </div>

      {/* Legend */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">Email</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">WhatsApp</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-purple-500" />
            <span className="text-muted-foreground">In-App</span>
          </div>
          <div className="border-l border-border pl-6 flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-500" />
            <span className="text-muted-foreground">Client</span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-cyan-500" />
            <span className="text-muted-foreground">Freelancer</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            <span className="text-muted-foreground">Admin</span>
          </div>
        </div>
      </Card>

      {/* Settings List */}
      <div className="space-y-4">
        {settings.map((setting) => (
          <Card key={setting.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-foreground">{setting.name}</h3>
                    <p className="text-sm text-muted-foreground">{setting.description}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
                      {setting.eventType}
                    </p>
                  </div>
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={() => openTemplateEditor(setting)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Templates
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Channels */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={setting.emailEnabled}
                    onCheckedChange={(checked) =>
                      updateSetting(setting.id, { emailEnabled: checked })
                    }
                    disabled={isSaving === setting.id}
                  />
                  <Mail
                    className={cn(
                      'h-4 w-4',
                      setting.emailEnabled ? 'text-blue-500' : 'text-muted-foreground/40'
                    )}
                  />
                  <span className="text-sm text-muted-foreground">Email</span>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={setting.whatsappEnabled}
                    onCheckedChange={(checked) =>
                      updateSetting(setting.id, { whatsappEnabled: checked })
                    }
                    disabled={isSaving === setting.id}
                  />
                  <MessageCircle
                    className={cn(
                      'h-4 w-4',
                      setting.whatsappEnabled ? 'text-green-500' : 'text-muted-foreground/40'
                    )}
                  />
                  <span className="text-sm text-muted-foreground">WhatsApp</span>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={setting.inAppEnabled}
                    onCheckedChange={(checked) =>
                      updateSetting(setting.id, { inAppEnabled: checked })
                    }
                    disabled={isSaving === setting.id}
                  />
                  <Smartphone
                    className={cn(
                      'h-4 w-4',
                      setting.inAppEnabled ? 'text-purple-500' : 'text-muted-foreground/40'
                    )}
                  />
                  <span className="text-sm text-muted-foreground">In-App</span>
                </div>

                {/* Recipients */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={setting.notifyClient}
                    onCheckedChange={(checked) =>
                      updateSetting(setting.id, { notifyClient: checked })
                    }
                    disabled={isSaving === setting.id}
                  />
                  <Users
                    className={cn(
                      'h-4 w-4',
                      setting.notifyClient ? 'text-amber-500' : 'text-muted-foreground/40'
                    )}
                  />
                  <span className="text-sm text-muted-foreground">Client</span>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={setting.notifyFreelancer}
                    onCheckedChange={(checked) =>
                      updateSetting(setting.id, { notifyFreelancer: checked })
                    }
                    disabled={isSaving === setting.id}
                  />
                  <Briefcase
                    className={cn(
                      'h-4 w-4',
                      setting.notifyFreelancer ? 'text-cyan-500' : 'text-muted-foreground/40'
                    )}
                  />
                  <span className="text-sm text-muted-foreground">Freelancer</span>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={setting.notifyAdmin}
                    onCheckedChange={(checked) =>
                      updateSetting(setting.id, { notifyAdmin: checked })
                    }
                    disabled={isSaving === setting.id}
                  />
                  <Shield
                    className={cn(
                      'h-4 w-4',
                      setting.notifyAdmin ? 'text-red-500' : 'text-muted-foreground/40'
                    )}
                  />
                  <span className="text-sm text-muted-foreground">Admin</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Template Editor Dialog */}
      <Dialog open={!!editingSetting} onOpenChange={() => setEditingSetting(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Templates: {editingSetting?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Available Variables */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium text-foreground mb-2">Available Variables:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  '{{clientName}}',
                  '{{freelancerName}}',
                  '{{taskTitle}}',
                  '{{taskUrl}}',
                  '{{feedback}}',
                  '{{credits}}',
                  '{{portalUrl}}',
                  '{{creditsUrl}}',
                ].map((v) => (
                  <code key={v} className="px-2 py-1 rounded bg-background text-xs font-mono">
                    {v}
                  </code>
                ))}
              </div>
            </div>

            {/* Email Subject */}
            <div className="space-y-2">
              <Label htmlFor="emailSubject" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                Email Subject
              </Label>
              <Input
                id="emailSubject"
                value={editForm.emailSubject}
                onChange={(e) => setEditForm({ ...editForm, emailSubject: e.target.value })}
                placeholder="Email subject line..."
              />
            </div>

            {/* Email Template */}
            <div className="space-y-2">
              <Label htmlFor="emailTemplate" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" />
                Email Template (HTML)
              </Label>
              <Textarea
                id="emailTemplate"
                value={editForm.emailTemplate}
                onChange={(e) => setEditForm({ ...editForm, emailTemplate: e.target.value })}
                placeholder="<p>Hi {{clientName}},</p>..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>

            {/* WhatsApp Template */}
            <div className="space-y-2">
              <Label htmlFor="whatsappTemplate" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-500" />
                WhatsApp Template (Plain Text)
              </Label>
              <Textarea
                id="whatsappTemplate"
                value={editForm.whatsappTemplate}
                onChange={(e) => setEditForm({ ...editForm, whatsappTemplate: e.target.value })}
                placeholder="*Title*\n\nMessage..."
                rows={4}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use *text* for bold, _text_ for italic
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingSetting(null)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={saveTemplates} disabled={isSaving !== null}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Templates
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
