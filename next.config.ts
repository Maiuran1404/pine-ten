import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "framerusercontent.com",
      },
    ],
  },
  // Externalize pino and its dependencies to avoid Turbopack bundling issues
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
};

export default nextConfig;
