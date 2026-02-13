'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroupLabel,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  type NavigationItem,
  type NavigationGroup,
  type AccentColor,
  accentColorStyles,
} from './types'

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
}

/**
 * Reusable navigation menu for sidebar
 * Renders navigation items with active state styling
 */
export function SidebarNavigation({
  items,
  basePath,
  accentColor = 'emerald',
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
 */
export function SidebarGroupedNavigation({
  groups,
  basePath,
  accentColor = 'emerald',
  onItemClick,
}: SidebarGroupedNavigationProps) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  const handleLinkClick = () => {
    setOpenMobile(false)
    onItemClick?.()
  }

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => (
        <div key={group.label}>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-2 mb-1">
            {group.label}
          </SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => {
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
        </div>
      ))}
    </div>
  )
}
