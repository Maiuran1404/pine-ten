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

import { LoadingSpinner, FullPageLoader } from "@/components/shared/loading";
import { signUp, signIn, useSession } from "@/lib/auth-client";
import { useSubdomain } from "@/hooks/use-subdomain";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

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
function BrandLogo() {
  return (
    <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-20">
      <Image
        src="/craftedcombinedwhite.png"
        alt="Crafted"
        width={140}
        height={40}
        className="object-contain"
      />
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

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portal = useSubdomain();
  const { data: session, isPending } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Determine account type based on portal
  const isArtistPortal = portal.type === "artist";
  const accountType = isArtistPortal ? "freelancer" : "client";
  const showSocialLogin = !isArtistPortal;

  // Get redirect destination
  const getRedirectUrl = () => {
    const redirect = searchParams.get("redirect");
    if (redirect && redirect !== "/" && !redirect.includes("register")) {
      return redirect;
    }
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
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: RegisterForm) {
    setIsLoading(true);

    try {
      const result = await signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (result.error) {
        toast.error(result.error.message || "Failed to create account");
        setIsLoading(false);
        return;
      }

      // Note: Don't set role to FREELANCER here - let the onboarding API handle it
      // The onboarding API will update the role when the freelancer submits their application
      // Setting it here would cause the API to reject with 403 (only CLIENT role can onboard)

      toast.success("Account created successfully!");

      if (accountType === "freelancer") {
        router.push("/onboarding?type=freelancer");
      } else {
        router.push("/onboarding");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      // For Google sign-up, we'll redirect to onboarding after auth
      const callbackURL = `${window.location.origin}/onboarding`;

      await signIn.social({
        provider: "google",
        callbackURL,
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("Failed to sign up with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  }

  // Show loading while checking initial session
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FloatingBlobs />
        <BrandLogo />
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If already logged in, show redirecting state
  if (session?.user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <FloatingBlobs />
        <BrandLogo />
        <LoadingSpinner size="lg" />
        <p className="text-sm text-white/50">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center relative py-16 sm:py-8">
      <FloatingBlobs />
      <BrandLogo />

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
              Welcome to {portal.name}
            </h1>
            <p className="text-white/50 text-sm">
              Begin by creating an account
            </p>
          </div>

          {/* Google Sign Up */}
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
            {/* Name Field */}
            <div className="space-y-2">
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: "rgba(40, 40, 40, 0.6)",
                  border: errors.name ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <label className="absolute left-4 top-2.5 text-xs text-white/40">
                  Full Name
                </label>
                <input
                  type="text"
                  {...register("name")}
                  className="w-full bg-transparent pt-7 pb-3 px-4 text-white placeholder:text-white/30 focus:outline-none text-sm"
                  placeholder="John Doe"
                />
              </div>
              {errors.name && (
                <p className="text-xs text-red-400 px-1">{errors.name.message}</p>
              )}
            </div>

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
                  placeholder="Create a strong password"
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
              {errors.password ? (
                <p className="text-xs text-red-400 px-1">{errors.password.message}</p>
              ) : (
                <p className="text-xs text-white/30 px-1">Must be at least 8 characters</p>
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
                  Creating account...
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </form>

          {/* Sign in link */}
          <div className="text-center mt-6 pt-6" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <p className="text-white/40 text-sm">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#8bb58b] hover:text-[#a8d4a8] transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 sm:bottom-6 left-0 right-0 text-center text-[10px] sm:text-xs text-white/30 px-4">
        <p>&copy; {new Date().getFullYear()} Crafted. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <RegisterContent />
    </Suspense>
  );
}
