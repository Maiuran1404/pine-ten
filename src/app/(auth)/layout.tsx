"use client";

import { useSubdomain } from "@/hooks/use-subdomain";

// Decorative curved lines component matching the Crafted design
function DecorativeLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 600 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Horizontal line across upper third */}
      <line
        x1="0"
        y1="250"
        x2="600"
        y2="250"
        stroke="white"
        strokeWidth="1.5"
        strokeOpacity="0.35"
      />
      {/* Horizontal line near bottom */}
      <line
        x1="0"
        y1="620"
        x2="600"
        y2="620"
        stroke="white"
        strokeWidth="1.5"
        strokeOpacity="0.35"
      />
      {/* Large curved arc forming S-shape */}
      <path
        d="M 420 0 L 420 250 Q 420 420 250 420 Q 80 420 80 590 L 80 620"
        stroke="white"
        strokeWidth="1.5"
        strokeOpacity="0.35"
        fill="none"
      />
      {/* Vertical continuation from arc */}
      <line
        x1="420"
        y1="0"
        x2="420"
        y2="250"
        stroke="white"
        strokeWidth="1.5"
        strokeOpacity="0.35"
      />
    </svg>
  );
}

// Grainy texture overlay for the aesthetic - matching Crafted design
function GrainOverlay() {
  return (
    <>
      {/* Primary grain layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          opacity: 0.35,
          mixBlendMode: "overlay",
        }}
      />
      {/* Secondary grain layer for more texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter2'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter2)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
          opacity: 0.25,
          mixBlendMode: "soft-light",
        }}
      />
    </>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const portal = useSubdomain();

  return (
    <div
      className="min-h-screen flex"
      style={{ fontFamily: "'Satoshi', sans-serif" }}
    >
      {/* Left side - Auth form */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Mobile header with gradient */}
        <header className="lg:hidden border-b relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, #4a7c4a 0%, #6b9b6b 50%, #8bb58b 100%)`,
            }}
          />
          <GrainOverlay />
          <div className="relative flex h-16 items-center px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <span className="text-lg font-bold text-white">
                  {portal.icon}
                </span>
              </div>
              <div>
                <span className="font-semibold text-white">{portal.name}</span>
                <span className="ml-2 text-xs text-white/70">
                  {portal.description}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Form container */}
        <main className="flex-1 flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-md">{children}</div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} Crafted Studio. All rights
            reserved.
          </p>
        </footer>
      </div>

      {/* Right side - Branding panel with Crafted design language */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        {/* Multi-stop gradient background matching the Crafted design */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 0% 0%, #6b9b6b 0%, transparent 50%),
              radial-gradient(ellipse at 100% 30%, #8bb58b 0%, transparent 50%),
              radial-gradient(ellipse at 50% 100%, #2d5a2d 0%, transparent 60%),
              radial-gradient(ellipse at 30% 70%, #4a7c4a 0%, transparent 50%),
              linear-gradient(180deg, #4a7c4a 0%, #6b9b6b 35%, #8bb58b 65%, #a8d4a8 100%)
            `,
          }}
        />

        {/* Grainy texture overlay */}
        <GrainOverlay />

        {/* Decorative curved lines */}
        <DecorativeLines />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="text-2xl font-bold">{portal.icon}</span>
            </div>
            <div>
              <span className="text-xl font-semibold tracking-tight">
                {portal.name}
              </span>
              <div className="text-sm text-white/70">{portal.description}</div>
            </div>
          </div>

          {/* Main message */}
          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
              {portal.type === "app" && "Turn your ideas into stunning designs"}
              {portal.type === "artist" &&
                "Showcase your talent, grow your career"}
              {portal.type === "superadmin" &&
                "Complete control at your fingertips"}
              {portal.type === "default" && "Professional design on demand"}
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              {portal.type === "app" &&
                "Connect with world-class designers who bring your vision to life. Fast, professional, and tailored to your needs."}
              {portal.type === "artist" &&
                "Join our network of talented freelancers. Get matched with exciting projects and build lasting client relationships."}
              {portal.type === "superadmin" &&
                "Monitor platform activity, manage users, and ensure smooth operations across all portals."}
              {portal.type === "default" &&
                "Get high-quality designs from vetted freelance designers. Simply describe what you need."}
            </p>
          </div>

          {/* Footer with dots and Crafted text */}
          <div className="flex items-center gap-4">
            {/* Dot indicators */}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-white" />
              <div className="w-3 h-3 rounded-full bg-white/60" />
              <div className="w-3 h-3 rounded-full bg-white/40" />
              <div className="w-3 h-3 rounded-full bg-white/30" />
            </div>
            {/* Crafted text */}
            <span className="text-4xl font-light tracking-wide text-white">
              Crafted
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
