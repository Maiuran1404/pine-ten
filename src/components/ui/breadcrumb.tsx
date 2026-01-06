"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  homeHref?: string;
  className?: string;
  separator?: React.ReactNode;
}

export function Breadcrumb({
  items,
  showHome = true,
  homeHref = "/dashboard",
  className,
  separator,
}: BreadcrumbProps) {
  const allItems = showHome
    ? [{ label: "Home", href: homeHref }, ...items]
    : items;

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isHome = showHome && index === 0;

          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <span className="text-muted-foreground/50" aria-hidden="true">
                  {separator || <ChevronRight className="h-4 w-4" />}
                </span>
              )}
              {isLast ? (
                <span
                  className="font-medium text-foreground"
                  aria-current="page"
                >
                  {isHome ? <Home className="h-4 w-4" /> : item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {isHome ? <Home className="h-4 w-4" /> : item.label}
                </Link>
              ) : (
                <span>{isHome ? <Home className="h-4 w-4" /> : item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Hook to generate breadcrumbs from pathname
export function useBreadcrumbs(pathname: string, customLabels?: Record<string, string>) {
  return React.useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const items: BreadcrumbItem[] = [];

    let currentPath = "";
    for (const segment of segments) {
      currentPath += `/${segment}`;

      // Skip numeric IDs in URLs
      if (/^[0-9a-f-]{36}$/i.test(segment)) {
        continue;
      }

      // Use custom label if provided, otherwise format the segment
      const label =
        customLabels?.[segment] ||
        segment
          .replace(/-/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());

      items.push({
        label,
        href: currentPath,
      });
    }

    // Remove href from the last item (current page)
    if (items.length > 0) {
      items[items.length - 1] = { label: items[items.length - 1].label };
    }

    return items;
  }, [pathname, customLabels]);
}

// Page header with breadcrumb
interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  showBreadcrumb?: boolean;
  homeHref?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  showBreadcrumb = true,
  homeHref,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {showBreadcrumb && breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb items={breadcrumbs} homeHref={homeHref} className="mb-4" />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
