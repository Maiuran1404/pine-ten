'use client'

import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ThemeToggle } from '@/components/theme-toggle'
import { signOut, useSession } from '@/lib/auth-client'
import { Settings, CreditCard, LogOut, ChevronsUpDown } from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export function SidebarUserMenu() {
  const router = useRouter()
  const { data: session } = useSession()
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  const user = session?.user
  if (!user) return null

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user.email?.[0].toUpperCase() || 'U'

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-3 w-full rounded-lg p-2 text-left transition-colors hover:bg-muted',
            isCollapsed && 'justify-center p-2'
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage
              src={user.image || undefined}
              alt={user.name || ''}
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="bg-crafted-green/15 text-crafted-forest dark:text-crafted-sage text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-56 p-1.5" sideOffset={8}>
        {/* Theme toggle row */}
        <div className="flex items-center justify-between px-2.5 py-2">
          <span className="text-sm text-foreground">Theme</span>
          <ThemeToggle />
        </div>

        <div className="h-px bg-border my-1" />

        {/* Navigation links */}
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 text-sm text-foreground rounded-md hover:bg-muted transition-colors"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
          Account
        </button>
        <button
          onClick={() => router.push('/dashboard/credits')}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 text-sm text-foreground rounded-md hover:bg-muted transition-colors"
        >
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          Credits
        </button>

        <div className="h-px bg-border my-1" />

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 text-sm text-foreground rounded-md hover:bg-muted transition-colors"
        >
          <LogOut className="h-4 w-4 text-muted-foreground" />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  )
}
