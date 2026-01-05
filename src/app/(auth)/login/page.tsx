"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, Sparkles, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingSpinner } from "@/components/shared/loading";
import { signIn } from "@/lib/auth-client";
import { useSubdomain } from "@/hooks/use-subdomain";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

// Google Icon Component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
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

export default function LoginPage() {
  const router = useRouter();
  const portal = useSubdomain();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSuperadmin = portal.type === "superadmin";
  const showSocialLogin = !isSuperadmin;

  const form = useForm<LoginForm>({
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
        return;
      }

      toast.success("Welcome back!");
      router.push(portal.defaultRedirect);
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      // Use absolute URL so we redirect back to the correct subdomain after OAuth
      const callbackURL = `${window.location.origin}${portal.defaultRedirect}`;
      await signIn.social({
        provider: "google",
        callbackURL,
      });
    } catch {
      toast.error("Failed to sign in with Google");
      setIsGoogleLoading(false);
    }
  }

  // Crafted design language button - teal to blue gradient
  const gradientButtonStyle = {
    background: "linear-gradient(135deg, #14b8a6 0%, #3b82f6 50%, #4338ca 100%)",
  };

  const gradientButtonClass = cn(
    "w-full h-12 text-base font-medium transition-all duration-300",
    "shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
    "text-white border-0"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center lg:text-left">
        <div className={cn(
          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4",
          isSuperadmin ? "bg-rose-500/10 text-rose-600" : "bg-blue-500/10 text-blue-600"
        )}>
          {isSuperadmin ? <Shield className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          <span>{portal.description}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isSuperadmin ? "Admin Access" : "Welcome back"}
        </h1>
        <p className="text-muted-foreground">
          {isSuperadmin
            ? "Enter your admin credentials to continue"
            : "Sign in to access your account"
          }
        </p>
      </div>

      {/* Google Sign In - Only for app and artist portals */}
      {showSocialLogin && (
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base font-medium"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <GoogleIcon className="w-5 h-5 mr-3" />
            )}
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground">
                or continue with email
              </span>
            </div>
          </div>
        </>
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Email address</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className="h-12 px-4 bg-background border-input/50 focus:border-primary transition-colors"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="h-12 px-4 pr-12 bg-background border-input/50 focus:border-primary transition-colors"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className={gradientButtonClass}
            style={gradientButtonStyle}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </form>
      </Form>

      {/* Sign up link - Only for app and artist portals */}
      {showSocialLogin && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground">
                New to {portal.name}?
              </span>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
            >
              Create an account
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </>
      )}

      {/* Portal-specific note */}
      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-center text-muted-foreground">
          {portal.type === "app" && "Need design work done? You're in the right place."}
          {portal.type === "artist" && "Join 500+ designers earning on their own terms."}
          {portal.type === "superadmin" && "Authorized personnel only. All actions are logged."}
        </p>
      </div>
    </div>
  );
}
