"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { type NavigationItem, type AccentColor, accentColorStyles } from "./types";

interface SidebarNavigationProps {
  items: NavigationItem[];
  basePath: string;
  accentColor?: AccentColor;
  onItemClick?: () => void;
}

/**
 * Reusable navigation menu for sidebar
 * Renders navigation items with active state styling
 */
export function SidebarNavigation({
  items,
  basePath,
  accentColor = "emerald",
  onItemClick,
}: SidebarNavigationProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const colorStyles = accentColorStyles[accentColor];

  const handleLinkClick = () => {
    setOpenMobile(false);
    onItemClick?.();
  };

  return (
    <SidebarMenu>
      {items.map((item) => {
        // For home path, only match exact path
        // For other routes, match if pathname starts with the href
        const isActive = item.href === basePath
          ? pathname === basePath
          : pathname.startsWith(item.href);

        return (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={item.name}
            >
              <Link href={item.href} onClick={handleLinkClick}>
                <item.icon className={isActive ? "opacity-100" : "opacity-60"} />
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
