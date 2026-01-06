"use client";

import { useMemo } from "react";

export type PortalType = "app" | "artist" | "superadmin" | "default";

interface PortalConfig {
  type: PortalType;
  name: string;
  description: string;
  tagline: string;
  accentColor: string;
  bgGradient: string;
  icon: string;
  defaultRedirect: string;
}

const PORTAL_CONFIGS: Record<PortalType, PortalConfig> = {
  app: {
    type: "app",
    name: "Crafted Studio",
    description: "Client Portal",
    tagline: "Professional design on demand",
    accentColor: "from-violet-600 to-indigo-600",
    bgGradient: "from-violet-500/10 via-transparent to-indigo-500/10",
    icon: "C",
    defaultRedirect: "/dashboard",
  },
  artist: {
    type: "artist",
    name: "Crafted Studio",
    description: "Artist Portal",
    tagline: "Where creativity meets opportunity",
    accentColor: "from-emerald-600 to-teal-600",
    bgGradient: "from-emerald-500/10 via-transparent to-teal-500/10",
    icon: "A",
    defaultRedirect: "/portal",
  },
  superadmin: {
    type: "superadmin",
    name: "Crafted Studio",
    description: "Admin Console",
    tagline: "Manage your platform",
    accentColor: "from-rose-600 to-orange-600",
    bgGradient: "from-rose-500/10 via-transparent to-orange-500/10",
    icon: "S",
    defaultRedirect: "/admin",
  },
  default: {
    type: "default",
    name: "Crafted Studio",
    description: "Welcome",
    tagline: "Professional design on demand",
    accentColor: "from-gray-800 to-gray-900",
    bgGradient: "from-gray-500/5 via-transparent to-gray-500/5",
    icon: "C",
    defaultRedirect: "/dashboard",
  },
};

export function getPortalFromHostname(hostname: string): PortalType {
  const cleanHostname = hostname.split(":")[0]; // Remove port

  // Artist portal
  if (
    cleanHostname.startsWith("artist.") ||
    cleanHostname === "artist.localhost"
  ) {
    return "artist";
  }
  // Superadmin portal
  if (
    cleanHostname.startsWith("superadmin.") ||
    cleanHostname === "superadmin.localhost"
  ) {
    return "superadmin";
  }
  // App portal - default for localhost and app.* subdomains
  if (
    cleanHostname === "localhost" ||
    cleanHostname.startsWith("app.") ||
    cleanHostname === "app.localhost"
  ) {
    return "app";
  }

  // Fallback to app for any unrecognized domain
  return "app";
}

export function useSubdomain(): PortalConfig {
  // Use useMemo to compute the portal config on initial render
  // This avoids the setState-in-useEffect anti-pattern
  const portalConfig = useMemo(() => {
    // Check if we're on the client side
    if (typeof window === "undefined") {
      return PORTAL_CONFIGS.app;
    }
    const hostname = window.location.hostname;
    const portalType = getPortalFromHostname(hostname);
    return PORTAL_CONFIGS[portalType];
  }, []);

  return portalConfig;
}

export { PORTAL_CONFIGS };
