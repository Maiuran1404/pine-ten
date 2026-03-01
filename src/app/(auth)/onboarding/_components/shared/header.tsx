'use client'

import { useState } from 'react'
import { signOut } from '@/lib/auth-client'
import { ChevronDown } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export function Header({
  userEmail,
  forceWhiteLogo,
}: {
  userEmail?: string
  forceWhiteLogo?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/craftedcombinedwhite.png"
          alt="Crafted"
          className={`h-6 sm:h-8 w-auto ${forceWhiteLogo ? 'block' : 'hidden dark:block'}`}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/craftedcombintedblack.png"
          alt="Crafted"
          className={`h-6 sm:h-8 w-auto ${forceWhiteLogo ? 'hidden' : 'block dark:hidden'}`}
        />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeToggle />
        {userEmail && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-muted border border-border text-muted-foreground text-xs sm:text-sm hover:bg-accent transition-colors max-w-[140px] sm:max-w-none truncate"
            >
              <span className="truncate">{userEmail}</span>
              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 py-2 rounded-lg bg-card border border-border shadow-xl">
                <button
                  onClick={() =>
                    signOut({
                      fetchOptions: {
                        onSuccess: () => {
                          window.location.href = '/login'
                        },
                      },
                    })
                  }
                  className="w-full px-4 py-2 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
