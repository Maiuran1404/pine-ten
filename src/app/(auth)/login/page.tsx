"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { LoadingSpinner } from "@/components/shared/loading";
import { signIn, useSession } from "@/lib/auth-client";
import { useSubdomain } from "@/hooks/use-subdomain";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

// Google Icon Component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// Floating organic blob shapes
function FloatingBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[300px] sm:w-[500px] h-[200px] sm:h-[300px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(ellipse, #4a7c4a 0%, transparent 70%)" }}
      />
      <div
        className="hidden sm:block absolute top-1/4 -left-20 w-[350px] h-[450px] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(ellipse, #6b9b6b 0%, transparent 70%)", transform: "rotate(-20deg)" }}
      />
      <div
        className="hidden sm:block absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(ellipse, #8bb58b 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-20 left-10 w-[150px] sm:w-[200px] h-[150px] sm:h-[200px] rounded-full opacity-30 blur-2xl"
        style={{ background: "radial-gradient(ellipse, #4a7c4a 0%, transparent 70%)" }}
      />
      <div
        className="hidden sm:block absolute -bottom-20 right-1/4 w-[250px] h-[200px] rounded-full opacity-25 blur-2xl"
        style={{ background: "radial-gradient(ellipse, #6b9b6b 0%, transparent 70%)" }}
      />
    </div>
  );
}

// Brand logo component
function BrandLogo({ portalName }: { portalName: string }) {
  return (
    <div className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 sm:gap-3 z-20">
      <Image
        src="/craftedfigurewhite.png"
        alt="Crafted"
        width={24}
        height={24}
        className="sm:w-7 sm:h-7 object-contain"
      />
      <span className="text-white/90 text-xs sm:text-sm font-medium tracking-wide uppercase">
        {portalName}
      </span>
    </div>
  );
}

// Logo component for inside the card
function CardLogo() {
  return (
    <div className="flex justify-center mb-6">
      <Image
        src="/craftedfigurewhite.png"
        alt="Crafted"
        width={48}
        height={48}
        className="object-contain"
      />
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portal = useSubdomain();
  const { data: session, isPending } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSuperadmin = portal.type === "superadmin";
  const isArtist = portal.type === "artist";
  const showSocialLogin = !isSuperadmin && !isArtist;

  // Get redirect destination based on SUBDOMAIN (not user role)
  // Users should be redirected to the appropriate page for the subdomain they're on
  const getRedirectUrl = () => {
    const redirect = searchParams.get("redirect");
    if (redirect && redirect !== "/" && !redirect.includes("login")) {
      return redirect;
    }

    // Always use subdomain's default redirect, not role-based routing
    // This ensures users on app.getcrafted.ai go to /dashboard, not /admin
    return portal.defaultRedirect;
  };

  // Redirect if already logged in
  useEffect(() => {
    if (!isPending && session?.user) {
      const redirectUrl = getRedirectUrl();
      router.replace(redirectUrl);
    }
  }, [session, isPending, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginForm) {
    setIsLoading(true);

    try {
      const result = await signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        toast.error(result.error.message || "Invalid credentials");
        setIsLoading(false);
        return;
      }

      toast.success("Welcome back!");
    } catch {
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      const callbackURL = `${window.location.origin}${getRedirectUrl()}`;

      await signIn.social({
        provider: "google",
        callbackURL,
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("Failed to sign in with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  }

  // Show loading while checking initial session
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FloatingBlobs />
        <BrandLogo portalName={portal.name} />
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If already logged in, show redirecting state
  if (session?.user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <FloatingBlobs />
        <BrandLogo portalName={portal.name} />
        <LoadingSpinner size="lg" />
        <p className="text-sm text-white/50">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center relative py-16 sm:py-8">
      <FloatingBlobs />
      <BrandLogo portalName={portal.name} />

      <div className="relative z-10 w-full max-w-md px-4">
        <div
          className="rounded-2xl p-6 sm:p-8 md:p-10"
          style={{
            background: "rgba(20, 20, 20, 0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {/* Logo */}
          <CardLogo />

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
              {isSuperadmin ? "Admin Access" : `Welcome to ${portal.name}`}
            </h1>
            <p className="text-white/50 text-sm">
              {isSuperadmin
                ? "Enter your admin credentials"
                : "Sign in to your account"
              }
            </p>
          </div>

          {/* Google Sign In */}
          {showSocialLogin && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full py-3.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-3 mb-6 disabled:opacity-70"
                style={{
                  background: "rgba(40, 40, 40, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "rgba(255, 255, 255, 0.9)",
                }}
              >
                {isGoogleLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <GoogleIcon className="w-5 h-5" />
                )}
                Continue with Google
              </button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-4 text-white/40" style={{ background: "rgba(20, 20, 20, 0.8)" }}>
                    or continue with email
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: "rgba(40, 40, 40, 0.6)",
                  border: errors.email ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <label className="absolute left-4 top-2.5 text-xs text-white/40">
                  Email
                </label>
                <input
                  type="email"
                  {...register("email")}
                  className="w-full bg-transparent pt-7 pb-3 px-4 text-white placeholder:text-white/30 focus:outline-none text-sm"
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-400 px-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: "rgba(40, 40, 40, 0.6)",
                  border: errors.password ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <label className="absolute left-4 top-2.5 text-xs text-white/40">
                  Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  className="w-full bg-transparent pt-7 pb-3 px-4 pr-12 text-white placeholder:text-white/30 focus:outline-none text-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 px-1">{errors.password.message}</p>
              )}
            </div>

            {/* Terms */}
            <p className="text-center text-xs text-white/40 py-2">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="text-white/60 hover:text-white underline underline-offset-2">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-white/60 hover:text-white underline underline-offset-2">
                Privacy Policy
              </Link>
            </p>

            {/* Spacer */}
            <div className="pt-4" />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-70"
              style={{
                background: "#f5f5f0",
                color: "#1a1a1a",
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  Signing in...
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </form>

          {/* Sign up link */}
          {!isSuperadmin && (
            <div className="text-center mt-6 pt-6" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
              <p className="text-white/40 text-sm">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-[#8bb58b] hover:text-[#a8d4a8] transition-colors"
                >
                  Create one
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 sm:bottom-6 left-0 right-0 text-center text-[10px] sm:text-xs text-white/30 px-4">
        <p>&copy; {new Date().getFullYear()} Crafted. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
