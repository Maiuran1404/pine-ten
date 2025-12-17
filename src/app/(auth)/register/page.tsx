"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowRight, Sparkles, Palette, Briefcase } from "lucide-react";

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
import { LoadingSpinner, FullPageLoader } from "@/components/shared/loading";
import { signUp } from "@/lib/auth-client";
import { useSubdomain } from "@/hooks/use-subdomain";
import { cn } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

function RegisterContent() {
  const router = useRouter();
  const portal = useSubdomain();
  const searchParams = useSearchParams();
  const defaultType = searchParams.get("type") === "freelancer" ? "freelancer" : "client";
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<"client" | "freelancer">(
    portal.type === "artist" ? "freelancer" : defaultType
  );

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
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
        return;
      }

      toast.success("Account created successfully!");

      if (accountType === "freelancer") {
        router.push("/onboarding?type=freelancer");
      } else {
        router.push("/onboarding");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const gradientButtonClass = cn(
    "w-full h-12 text-base font-medium transition-all duration-300",
    "bg-gradient-to-r shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
    portal.accentColor,
    "text-white border-0"
  );

  // Hide account type selection for specific portals
  const showAccountTypeSelector = portal.type === "default" || portal.type === "app";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center lg:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-sm font-medium mb-4">
          <Sparkles className="w-4 h-4" />
          <span>{portal.description}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground">
          {portal.type === "artist"
            ? "Join our network of talented designers"
            : "Start getting professional designs today"
          }
        </p>
      </div>

      {/* Account type selector */}
      {showAccountTypeSelector && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAccountType("client")}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
              accountType === "client"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border/50 hover:border-border hover:bg-muted/50"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              accountType === "client" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">I need designs</p>
              <p className="text-xs text-muted-foreground">Get work done</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setAccountType("freelancer")}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200",
              accountType === "freelancer"
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border/50 hover:border-border hover:bg-muted/50"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              accountType === "freelancer" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <Palette className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">I&apos;m a designer</p>
              <p className="text-xs text-muted-foreground">Earn money</p>
            </div>
          </button>
        </div>
      )}

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Full name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="John Doe"
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
                      placeholder="Create a strong password"
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
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 8 characters
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {accountType === "freelancer" && (
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    WhatsApp Number
                    <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="+1 234 567 8900"
                      className="h-12 px-4 bg-background border-input/50 focus:border-primary transition-colors"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button
            type="submit"
            className={gradientButtonClass}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating account...
              </>
            ) : (
              <>
                {accountType === "freelancer" ? "Apply as Designer" : "Create Account"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </form>
      </Form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-4 text-muted-foreground">
            Already have an account?
          </span>
        </div>
      </div>

      {/* Sign in link */}
      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
        >
          Sign in instead
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
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
