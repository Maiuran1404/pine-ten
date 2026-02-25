'use client'

import { TABS } from '../_lib/brand-constants'
import type { TabId } from '../_lib/brand-types'
import { cn } from '@/lib/utils'

interface BrandTabsProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function BrandTabs({ activeTab, onTabChange }: BrandTabsProps) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-xl mb-4 sm:mb-6 border border-border overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex-1 justify-center whitespace-nowrap min-w-0',
            activeTab === tab.id
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="hidden xs:inline sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
