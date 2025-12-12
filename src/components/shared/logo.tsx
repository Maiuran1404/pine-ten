"use client";

import Link from "next/link";
import { config } from "@/lib/config";

interface LogoProps {
  className?: string;
  href?: string;
}

export function Logo({ className = "", href = "/" }: LogoProps) {
  return (
    <Link href={href} className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
        <span className="text-lg font-bold text-primary-foreground">N</span>
      </div>
      <span className="text-xl font-semibold tracking-tight">
        {config.app.name}
      </span>
    </Link>
  );
}
