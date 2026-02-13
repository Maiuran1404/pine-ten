'use client'

import { Calendar } from 'lucide-react'
import { SettingsCard, SettingsCardHeader } from '@/components/settings/settings-card'
import type { UserSettings } from '@/hooks/use-settings'

interface AccountInfoSectionProps {
  userSettings: UserSettings | null
  children?: React.ReactNode
}

export function AccountInfoSection({ userSettings, children }: AccountInfoSectionProps) {
  return (
    <SettingsCard>
      <SettingsCardHeader
        icon={Calendar}
        title="Account Information"
        description="Your account details"
      />
      <div className="p-5">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Account ID</span>
            <span className="font-mono text-xs text-muted-foreground">
              {userSettings?.id?.slice(0, 8)}...
            </span>
          </div>
          <div className="h-px bg-border" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Member Since</span>
            <span className="text-foreground">
              {userSettings?.createdAt
                ? new Date(userSettings.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '-'}
            </span>
          </div>
          {children}
        </div>
      </div>
    </SettingsCard>
  )
}
