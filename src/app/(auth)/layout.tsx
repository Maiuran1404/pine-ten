"use client";

import { useSubdomain } from "@/hooks/use-subdomain";

// Floating organic blob shapes - similar to Cosmos design
function FloatingBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Top center blob */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-30 blur-3xl"
        style={{
          background: "radial-gradient(ellipse, #4a7c4a 0%, transparent 70%)",
        }}
      />

      {/* Left blob */}
      <div
        className="absolute top-1/4 -left-20 w-[350px] h-[450px] rounded-full opacity-25 blur-3xl"
        style={{
          background: "radial-gradient(ellipse, #6b9b6b 0%, transparent 70%)",
          transform: "rotate(-20deg)",
        }}
      />

      {/* Right blob */}
      <div
        className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(ellipse, #8bb58b 0%, transparent 70%)",
        }}
      />

      {/* Bottom left blob */}
      <div
        className="absolute bottom-20 left-10 w-[200px] h-[200px] rounded-full opacity-30 blur-2xl"
        style={{
          background: "radial-gradient(ellipse, #4a7c4a 0%, transparent 70%)",
        }}
      />

      {/* Bottom right blob */}
      <div
        className="absolute -bottom-20 right-1/4 w-[250px] h-[200px] rounded-full opacity-25 blur-2xl"
        style={{
          background: "radial-gradient(ellipse, #6b9b6b 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

// Brand logo component - dot pattern like Cosmos
function BrandLogo() {
  const portal = useSubdomain();

  return (
    <div className="absolute top-8 left-8 flex items-center gap-3">
      <div className="grid grid-cols-2 gap-1">
        <div className="w-2 h-2 rounded-full bg-[#8bb58b]" />
        <div className="w-2 h-2 rounded-full bg-[#8bb58b]" />
        <div className="w-2 h-2 rounded-full bg-[#8bb58b]" />
        <div className="w-2 h-2 rounded-full bg-[#8bb58b]" />
      </div>
      <span className="text-white/90 text-sm font-medium tracking-wide uppercase">
        {portal.name}
      </span>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-screen relative flex items-center justify-center"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        backgroundColor: "#0a0a0a",
      }}
    >
      {/* Floating blobs background */}
      <FloatingBlobs />

      {/* Brand logo */}
      <BrandLogo />

      {/* Main content - centered card */}
      <main className="relative z-10 w-full max-w-md px-4">
        {children}
      </main>

      {/* Subtle footer */}
      <footer className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/30">
        <p>&copy; {new Date().getFullYear()} Crafted Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}
