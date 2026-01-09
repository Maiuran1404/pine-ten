"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portal = useSubdomain();
  const { data: session, isPending } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSuperadmin = portal.type === "superadmin";

  // Get redirect destination based on user role
  const getRedirectUrl = (userRole?: string) => {
    const redirect = searchParams.get("redirect");
    if (redirect && redirect !== "/" && !redirect.includes("login")) {
      return redirect;
    }

    if (userRole) {
      switch (userRole) {
        case "ADMIN":
          return "/admin";
        case "FREELANCER":
          return "/portal";
        case "CLIENT":
        default:
          return "/dashboard";
      }
    }

    return portal.defaultRedirect;
  };

  // Redirect if already logged in
  useEffect(() => {
    if (!isPending && session?.user) {
      const user = session.user as { role?: string };
      const redirectUrl = getRedirectUrl(user.role);
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
          {isSuperadmin ? "Admin Access" : `Welcome to ${portal.name}`}
        </h1>
        <p className="text-white/50 text-sm">
          {isSuperadmin
            ? "Enter your admin credentials"
            : "Sign in to your account"
          }
        </p>
      </div>

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
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
