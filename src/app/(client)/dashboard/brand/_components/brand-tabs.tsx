'use client'

import { TABS, TAB_GROUPS } from '../_lib/brand-constants'
import type { TabId, TabCompletionStatus } from '../_lib/brand-types'
import { cn } from '@/lib/utils'

interface BrandTabsProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  tabCompletionStatus: Record<TabId, TabCompletionStatus>
}

function CompletionDot({ status }: { status: TabCompletionStatus }) {
  return (
    <span
      className={cn(
        'w-1.5 h-1.5 rounded-full flex-shrink-0',
        status === 'complete' && 'bg-crafted-green',
        status === 'partial' && 'bg-crafted-mint',
        status === 'empty' && 'bg-border'
      )}
    />
  )
}

export function BrandTabs({ activeTab, onTabChange, tabCompletionStatus }: BrandTabsProps) {
  const tabsMap = Object.fromEntries(TABS.map((t) => [t.id, t]))

  return (
    <>
      {/* Desktop: vertical nav rail */}
      <nav className="hidden md:flex flex-col w-52 flex-shrink-0 border-r border-border pr-4 md:sticky md:top-0 md:self-start py-2">
        {TAB_GROUPS.map((group, groupIndex) => (
          <div key={group.id} className={cn(groupIndex > 0 && 'mt-5')}>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-1.5 block">
              {group.label}
            </span>
            <div className="space-y-0.5">
              {group.tabs.map((tabId) => {
                const tab = tabsMap[tabId]
                if (!tab) return null
                const isActive = activeTab === tabId
                const status = tabCompletionStatus[tabId] || 'empty'
                return (
                  <button
                    key={tabId}
                    onClick={() => onTabChange(tabId)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-crafted-green/10 text-crafted-forest dark:text-crafted-sage'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <tab.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left">{tab.label}</span>
                    <CompletionDot status={status} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Mobile: horizontal scrollable strip */}
      <div className="md:hidden overflow-x-auto -mx-4 px-4 mb-4">
        <div className="flex gap-1 p-1 bg-muted rounded-xl border border-border min-w-max">
          {TAB_GROUPS.map((group, groupIndex) => (
            <div key={group.id} className="contents">
              {groupIndex > 0 && (
                <div className="w-px bg-border self-stretch my-1.5 flex-shrink-0" />
              )}
              {group.tabs.map((tabId) => {
                const tab = tabsMap[tabId]
                if (!tab) return null
                const isActive = activeTab === tabId
                const status = tabCompletionStatus[tabId] || 'empty'
                return (
                  <button
                    key={tabId}
                    onClick={() => onTabChange(tabId)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                      isActive
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <tab.icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{tab.label}</span>
                    <CompletionDot status={status} />
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
