"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, ArrowRight } from "lucide-react";

import { LoadingSpinner, FullPageLoader } from "@/components/shared/loading";

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  name: z.string().optional(),
  referralSource: z.string().optional(),
});

type WaitlistForm = z.infer<typeof waitlistSchema>;

const referralOptions = [
  { value: "", label: "Select an option" },
  { value: "google", label: "Google Search" },
  { value: "twitter", label: "Twitter / X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "friend", label: "Friend or Colleague" },
  { value: "producthunt", label: "Product Hunt" },
  { value: "other", label: "Other" },
];

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

function WaitlistContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WaitlistForm>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      email: "",
      name: "",
      referralSource: "",
    },
  });

  async function onSubmit(data: WaitlistForm) {
    setIsLoading(true);

    try {
      const response = await fetch("/api/early-access/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setIsSuccess(true);
        toast.success("You're on the list!");
      } else {
        toast.error(result.error || "Something went wrong. Please try again.");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  // Success state
  if (isSuccess) {
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

            {/* Success Message */}
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <h1 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: "'Satoshi', sans-serif" }}>
                You're on the list!
              </h1>

              <p className="text-white/50 text-sm mb-8">
                We'll send you an email with an invite code when a spot opens up.
                Thanks for your interest in Crafted!
              </p>

              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-[#8bb58b] hover:text-[#a8d4a8] text-sm transition-colors"
              >
                Already have a code? Sign up
                <ArrowRight className="w-4 h-4" />
              </Link>
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
            <h1 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: "'Satoshi', sans-serif" }}>
              Join the Waitlist
            </h1>
            <p className="text-white/50 text-sm">
              We're currently in early access. Leave your email and we'll notify you when a spot opens up.
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
                  Email *
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

            {/* Name Field (Optional) */}
            <div className="space-y-2">
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: "rgba(40, 40, 40, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <label className="absolute left-4 top-2.5 text-xs text-white/40">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  {...register("name")}
                  className="w-full bg-transparent pt-7 pb-3 px-4 text-white placeholder:text-white/30 focus:outline-none text-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Referral Source (Optional) */}
            <div className="space-y-2">
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: "rgba(40, 40, 40, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <label className="absolute left-4 top-2.5 text-xs text-white/40">
                  How did you hear about us? (Optional)
                </label>
                <select
                  {...register("referralSource")}
                  className="w-full bg-transparent pt-7 pb-3 px-4 text-white focus:outline-none text-sm appearance-none cursor-pointer"
                  style={{ background: "transparent" }}
                >
                  {referralOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-[#1a1a1a] text-white"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

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
                  Joining...
                </span>
              ) : (
                "Join Waitlist"
              )}
            </button>
          </form>

          {/* Sign up link */}
          <div className="text-center mt-6 pt-6" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <p className="text-white/40 text-sm">
              Already have an invite code?{" "}
              <Link
                href="/register"
                className="text-[#8bb58b] hover:text-[#a8d4a8] transition-colors"
              >
                Sign up here
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

export default function WaitlistPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <WaitlistContent />
    </Suspense>
  );
}
