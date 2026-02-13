'use client'

import { Button } from '@/components/ui/button'
import { LogOut, Loader2 } from 'lucide-react'
import { SettingsCard, SettingsCardHeader } from '@/components/settings/settings-card'
import { cn } from '@/lib/utils'

interface SessionSectionProps {
  isLoggingOut: boolean
  onLogout: () => void
  description?: string
  className?: string
}

export function SessionSection({
  isLoggingOut,
  onLogout,
  description = 'You will need to sign in again to access your dashboard',
  className,
}: SessionSectionProps) {
  return (
    <SettingsCard>
      <SettingsCardHeader icon={LogOut} title="Session" description="Manage your current session" />
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Log out of your account</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <Button
            variant="outline"
            onClick={onLogout}
            disabled={isLoggingOut}
            className={cn(
              'border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive',
              className
            )}
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </>
            )}
          </Button>
        </div>
      </div>
    </SettingsCard>
  )
}
