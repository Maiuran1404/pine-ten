"use client";

import Link from "next/link";

interface LogoProps {
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", href = "/", size = "md" }: LogoProps) {
  const sizes = {
    sm: { icon: "h-6 w-6", text: "text-sm", iconText: "text-xs" },
    md: { icon: "h-8 w-8", text: "text-lg", iconText: "text-sm" },
    lg: { icon: "h-10 w-10", text: "text-xl", iconText: "text-base" },
  };

  const { icon, text, iconText } = sizes[size];

  return (
    <Link href={href} className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex ${icon} items-center justify-center rounded-lg text-white font-bold ${iconText}`}
        style={{ background: "linear-gradient(135deg, #14b8a6 0%, #3b82f6 50%, #4338ca 100%)" }}
      >
        C
      </div>
      <span className={`font-semibold ${text} tracking-tight`}>
        Crafted
      </span>
    </Link>
  );
}
