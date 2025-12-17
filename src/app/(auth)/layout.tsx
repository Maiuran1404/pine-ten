"use client";

import { useSubdomain } from "@/hooks/use-subdomain";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const portal = useSubdomain();

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding panel */}
      <div className={`hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-gradient-to-br ${portal.accentColor}`}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Floating shapes */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-black/10 rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm border border-white/20">
              <span className="text-2xl font-bold">{portal.icon}</span>
            </div>
            <div>
              <span className="text-xl font-semibold tracking-tight">{portal.name}</span>
              <div className="text-sm text-white/80">{portal.description}</div>
            </div>
          </div>

          {/* Main message */}
          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
              {portal.type === "app" && "Turn your ideas into stunning designs"}
              {portal.type === "artist" && "Showcase your talent, grow your career"}
              {portal.type === "superadmin" && "Complete control at your fingertips"}
              {portal.type === "default" && "Professional design on demand"}
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              {portal.type === "app" && "Connect with world-class designers who bring your vision to life. Fast, professional, and tailored to your needs."}
              {portal.type === "artist" && "Join our network of talented freelancers. Get matched with exciting projects and build lasting client relationships."}
              {portal.type === "superadmin" && "Monitor platform activity, manage users, and ensure smooth operations across all portals."}
              {portal.type === "default" && "Get high-quality designs from vetted freelance designers. Simply describe what you need."}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 text-sm text-white/60">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-xs font-medium">
                  {["JD", "AK", "MR", "SL"][i]}
                </div>
              ))}
            </div>
            <span className="ml-2">Trusted by 1,000+ users worldwide</span>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className={`flex-1 flex flex-col bg-gradient-to-br ${portal.bgGradient} bg-background`}>
        {/* Mobile header */}
        <header className="lg:hidden border-b bg-background/80 backdrop-blur-sm">
          <div className="flex h-16 items-center px-6">
            <div className="flex items-center gap-2">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${portal.accentColor}`}>
                <span className="text-lg font-bold text-white">{portal.icon}</span>
              </div>
              <div>
                <span className="font-semibold">{portal.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{portal.description}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Form container */}
        <main className="flex-1 flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-md">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Crafted Studio. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
