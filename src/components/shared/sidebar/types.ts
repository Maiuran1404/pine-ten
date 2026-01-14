import type { LucideIcon } from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export interface RecentItem {
  id: string;
  title: string;
  href: string;
  icon?: LucideIcon;
  iconClassName?: string;
}

export type AccentColor = "emerald" | "rose" | "blue" | "purple";

export const accentColorStyles: Record<AccentColor, {
  active: string;
  icon: string;
}> = {
  emerald: {
    active: "bg-emerald-950/80 text-emerald-400 hover:bg-emerald-950 hover:text-emerald-400",
    icon: "text-emerald-400",
  },
  rose: {
    active: "bg-rose-950/80 text-rose-400 hover:bg-rose-950 hover:text-rose-400",
    icon: "text-rose-400",
  },
  blue: {
    active: "bg-blue-950/80 text-blue-400 hover:bg-blue-950 hover:text-blue-400",
    icon: "text-blue-400",
  },
  purple: {
    active: "bg-purple-950/80 text-purple-400 hover:bg-purple-950 hover:text-purple-400",
    icon: "text-purple-400",
  },
};
