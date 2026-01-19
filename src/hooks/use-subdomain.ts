"use client";

import { useState, useEffect } from "react";

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
  isHydrated: boolean;
}

const PORTAL_CONFIGS: Record<PortalType, Omit<PortalConfig, "isHydrated">> = {
  app: {
    type: "app",
    name: "Crafted",
    description: "Client Portal",
    tagline: "Professional design on demand",
    accentColor: "from-violet-600 to-indigo-600",
    bgGradient: "from-violet-500/10 via-transparent to-indigo-500/10",
    icon: "C",
    defaultRedirect: "/dashboard",
  },
  artist: {
    type: "artist",
    name: "Crafted",
    description: "Artist Portal",
    tagline: "Where creativity meets opportunity",
    accentColor: "from-emerald-600 to-teal-600",
    bgGradient: "from-emerald-500/10 via-transparent to-teal-500/10",
    icon: "A",
    defaultRedirect: "/portal",
  },
  superadmin: {
    type: "superadmin",
    name: "Crafted",
    description: "Admin Console",
    tagline: "Manage your platform",
    accentColor: "from-rose-600 to-orange-600",
    bgGradient: "from-rose-500/10 via-transparent to-orange-500/10",
    icon: "S",
    defaultRedirect: "/admin",
  },
  default: {
    type: "default",
    name: "Crafted",
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

// Default config used for SSR - must be consistent between server and client initial render
const DEFAULT_CONFIG: PortalConfig = {
  ...PORTAL_CONFIGS.app,
  isHydrated: false,
};

export function useSubdomain(): PortalConfig {
  // Start with default config to ensure consistent SSR
  const [portalConfig, setPortalConfig] = useState<PortalConfig>(DEFAULT_CONFIG);

  // Update to actual subdomain after hydration
  useEffect(() => {
    const hostname = window.location.hostname;
    const portalType = getPortalFromHostname(hostname);
    setPortalConfig({
      ...PORTAL_CONFIGS[portalType],
      isHydrated: true,
    });
  }, []);

  return portalConfig;
}

export { PORTAL_CONFIGS };
