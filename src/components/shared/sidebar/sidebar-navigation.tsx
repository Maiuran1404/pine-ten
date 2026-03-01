'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroupLabel,
  useSidebar,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { type NavigationItem, type NavigationGroup, type AccentColor } from './types'

interface SidebarNavigationProps {
  items: NavigationItem[]
  basePath: string
  accentColor?: AccentColor
  onItemClick?: () => void
}

interface SidebarGroupedNavigationProps {
  groups: NavigationGroup[]
  basePath: string
  accentColor?: AccentColor
  onItemClick?: () => void
  /** Enable collapsible groups — auto-expands the group containing the active route */
  collapsible?: boolean
}

/**
 * Reusable navigation menu for sidebar
 * Renders navigation items with active state styling
 */
export function SidebarNavigation({
  items,
  basePath,
  accentColor: _accentColor = 'success',
  onItemClick,
}: SidebarNavigationProps) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  const handleLinkClick = () => {
    setOpenMobile(false)
    onItemClick?.()
  }

  return (
    <SidebarMenu>
      {items.map((item) => {
        // For home path, only match exact path
        // For other routes, match if pathname starts with the href
        const isActive =
          item.href === basePath ? pathname === basePath : pathname.startsWith(item.href)

        return (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
              <Link href={item.href} onClick={handleLinkClick}>
                <item.icon className={isActive ? 'opacity-100' : 'opacity-60'} />
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

/**
 * Grouped navigation with section headers
 * When collapsible=true, groups collapse/expand on click.
 * The group containing the active route auto-expands.
 */
export function SidebarGroupedNavigation({
  groups,
  basePath,
  accentColor: _accentColor = 'success',
  onItemClick,
  collapsible = false,
}: SidebarGroupedNavigationProps) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  const handleLinkClick = () => {
    setOpenMobile(false)
    onItemClick?.()
  }

  const isItemActive = (item: NavigationItem) =>
    item.href === basePath ? pathname === basePath : pathname.startsWith(item.href)

  const groupHasActiveItem = (group: NavigationGroup) => group.items.some(isItemActive)

  if (!collapsible) {
    return (
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-2 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive = isItemActive(item)
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                      <Link href={item.href} onClick={handleLinkClick}>
                        <item.icon className={isActive ? 'opacity-100' : 'opacity-60'} />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {groups.map((group, groupIndex) => {
        const hasActive = groupHasActiveItem(group)
        // All groups start open — users collapse what they don't need
        const defaultOpen = true

        return (
          <Collapsible key={group.label} defaultOpen={defaultOpen} className="group/collapsible">
            <CollapsibleTrigger className="flex w-full items-center gap-1 px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors">
              <ChevronRight className="size-3 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              <span>{group.label}</span>
              {hasActive && <span className="ml-auto size-1.5 rounded-full bg-foreground/30" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = isItemActive(item)
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.name}>
                        <Link href={item.href} onClick={handleLinkClick}>
                          <item.icon className={isActive ? 'opacity-100' : 'opacity-60'} />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </CollapsibleContent>
          </Collapsible>
        )
      })}
    </div>
  )
}
