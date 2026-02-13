'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SettingsCard, SettingsCardHeader } from '@/components/settings/settings-card'
import { User, Mail, Loader2 } from 'lucide-react'

interface ProfileSectionProps {
  session: { user?: { name?: string | null; email?: string | null; image?: string | null } } | null
  initials: string
  formData: { name: string; phone: string }
  setFormData: (data: { name: string; phone: string }) => void
  isSaving: boolean
  onSave: () => void
  emailValue: string
  phoneLabel?: string
  phoneIcon?: React.ElementType
  phonePlaceholder?: string
  phoneHint?: string
}

export function ProfileSection({
  session,
  initials,
  formData,
  setFormData,
  isSaving,
  onSave,
  emailValue,
  phoneLabel = 'Phone Number',
  phoneIcon: PhoneIcon,
  phonePlaceholder = '+1 (555) 000-0000',
  phoneHint,
}: ProfileSectionProps) {
  return (
    <SettingsCard>
      <SettingsCardHeader
        icon={User}
        title="Profile Information"
        description="Update your personal details"
      />
      <div className="p-5 space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={session?.user?.image || undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">{session?.user?.name}</p>
            <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="grid gap-4 max-w-md">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              id="email"
              value={emailValue}
              disabled
              className="bg-muted text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              {PhoneIcon && <PhoneIcon className="h-4 w-4" />}
              {phoneLabel}
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={phonePlaceholder}
            />
            {phoneHint && <p className="text-xs text-muted-foreground">{phoneHint}</p>}
          </div>
        </div>

        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </SettingsCard>
  )
}
