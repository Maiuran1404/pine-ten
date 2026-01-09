"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { LoadingSpinner, FullPageLoader } from "@/components/shared/loading";
import { signUp, useSession } from "@/lib/auth-client";
import { useSubdomain } from "@/hooks/use-subdomain";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

// Logo dots component
function LogoDots() {
  return (
    <div className="flex justify-center mb-6">
      <div className="grid grid-cols-3 gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-[#8bb58b]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#8bb58b]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#8bb58b]" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#8bb58b]" />
        <div className="w-2.5 h-2.5 rounded-full bg-transparent" />
        <div className="w-2.5 h-2.5 rounded-full bg-[#8bb58b]" />
      </div>
    </div>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portal = useSubdomain();
  const { data: session, isPending } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Determine account type based on portal
  const isArtistPortal = portal.type === "artist";
  const accountType = isArtistPortal ? "freelancer" : "client";

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

      // If registering as freelancer, set the role immediately
      if (accountType === "freelancer") {
        try {
          await fetch("/api/auth/set-role", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: "FREELANCER" }),
          });
        } catch {
          // Continue even if role update fails - onboarding will handle it
        }
      }

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

  // Show loading while checking initial session
  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If already logged in, show redirecting state
  if (session?.user) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-white/50">Redirecting...</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-8 sm:p-10"
      style={{
        background: "rgba(20, 20, 20, 0.8)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {/* Logo */}
      <LogoDots />

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
          Welcome to {portal.name}
        </h1>
        <p className="text-white/50 text-sm">
          {portal.type === "artist"
            ? "Begin by creating an account"
            : "Begin by creating an account"
          }
        </p>
      </div>

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
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <RegisterContent />
    </Suspense>
  );
}
