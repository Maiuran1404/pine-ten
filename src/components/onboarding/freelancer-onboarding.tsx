"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSession, signOut } from "@/lib/auth-client";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/shared/loading";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Clock,
  User,
  Palette,
  Phone,
  Sparkles,
  Briefcase,
  Code,
  PenTool,
  Layers,
  Video,
  Share2,
  CheckCircle2,
} from "lucide-react";

interface FreelancerOnboardingProps {
  onComplete: () => void;
}

const skills = [
  { id: "photoshop", label: "Adobe Photoshop", icon: Layers },
  { id: "illustrator", label: "Adobe Illustrator", icon: PenTool },
  { id: "figma", label: "Figma", icon: Layers },
  { id: "canva", label: "Canva", icon: Palette },
  { id: "after_effects", label: "After Effects", icon: Video },
  { id: "premiere", label: "Premiere Pro", icon: Video },
  { id: "other", label: "Other", icon: Code },
];

const specializations = [
  { id: "static_ads", label: "Static Ads" },
  { id: "video_motion", label: "Video/Motion Graphics" },
  { id: "social_media", label: "Social Media Content" },
  { id: "branding", label: "Branding & Identity" },
  { id: "ui_ux", label: "UI/UX Design" },
];

// Step configuration for progress bar
const FREELANCER_STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
];

export function FreelancerOnboarding({ onComplete }: FreelancerOnboardingProps) {
  const { refetch: refetchSession } = useSession();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    bio: "",
    skills: [] as string[],
    specializations: [] as string[],
    portfolioUrls: "",
    whatsappNumber: "",
  });

  const handleSkillToggle = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(id)
        ? prev.skills.filter((s) => s !== id)
        : [...prev.skills, id],
    }));
  };

  const handleSpecializationToggle = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(id)
        ? prev.specializations.filter((s) => s !== id)
        : [...prev.specializations, id],
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "freelancer",
          data: {
            ...formData,
            portfolioUrls: formData.portfolioUrls
              .split(",")
              .map((url) => url.trim())
              .filter(Boolean),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete onboarding");
      }

      // Await session refresh to ensure onboardingCompleted is updated before navigating
      await refetchSession();

      toast.success("Application submitted! We'll review it shortly.");
      onComplete();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" style={{ fontFamily: "'Satoshi', sans-serif" }}>
      {/* Left side - Form content */}
      <div className="flex-1 flex flex-col bg-background overflow-y-auto">
        {/* Header with progress */}
        <header className="sticky top-0 z-10 bg-background border-b">
          <div className="px-6 sm:px-10 lg:px-16 py-4">
            {/* Segmented Progress Bar */}
            <div className="flex gap-2">
              {FREELANCER_STEPS.map((stepConfig, index) => (
                <div
                  key={stepConfig.id}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-300",
                    index <= step ? "bg-foreground" : "bg-muted-foreground/20"
                  )}
                />
              ))}
            </div>
          </div>
        </header>

        {/* Logo */}
        <div className="px-6 sm:px-10 lg:px-16 pt-8">
          <div className="flex items-center gap-2">
            <Image
              src="/craftedfigurewhite.png"
              alt="Crafted"
              width={32}
              height={32}
              className="dark:block hidden"
            />
            <Image
              src="/craftedfigureblack.png"
              alt="Crafted"
              width={32}
              height={32}
              className="dark:hidden block"
            />
            <span className="font-semibold text-lg tracking-tight">Crafted</span>
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 px-6 sm:px-10 lg:px-16 py-10">
          <div className="max-w-md lg:max-w-xl">
            <AnimatePresence mode="wait">
              {/* Welcome Step */}
              {step === 0 && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      Join Crafted as a Designer
                    </h1>
                    <p className="text-muted-foreground">
                      Tell us about yourself so we can match you with the perfect projects.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { icon: User, title: "Create your profile", desc: "Share your story and experience" },
                      { icon: Palette, title: "Showcase your skills", desc: "Highlight your expertise and tools" },
                      { icon: Phone, title: "Get connected", desc: "Start receiving tasks that match your skills" },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-background hover:border-foreground/20 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center flex-shrink-0">
                          <item.icon className="h-5 w-5 text-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    size="lg"
                    onClick={() => setStep(1)}
                    className="w-full h-12 font-semibold"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* About You Step */}
              {step === 1 && (
                <motion.div
                  key="about"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      Tell us about yourself
                    </h1>
                    <p className="text-muted-foreground">
                      Help clients understand your experience and background.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Bio</Label>
                    <Textarea
                      placeholder="Share your design experience, what you're passionate about, and what makes you unique..."
                      value={formData.bio}
                      onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                      className="min-h-[180px] text-base resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be visible to clients when reviewing your profile.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep(0)}
                      className="h-12"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(2)}
                      className="flex-1 h-12 font-semibold"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Skills Step */}
              {step === 2 && (
                <motion.div
                  key="skills"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      What are you great at?
                    </h1>
                    <p className="text-muted-foreground">
                      Select the tools you use and your areas of expertise.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Tools & Software */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Tools & Software</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {skills.map((skill) => {
                          const isSelected = formData.skills.includes(skill.id);
                          return (
                            <button
                              key={skill.id}
                              onClick={() => handleSkillToggle(skill.id)}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-200",
                                isSelected
                                  ? "border-foreground bg-foreground/5"
                                  : "border-border hover:border-foreground/50 bg-background"
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleSkillToggle(skill.id)}
                                className="pointer-events-none"
                              />
                              <span className="text-sm font-medium">{skill.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Specializations */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Specializations</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {specializations.map((spec) => {
                          const isSelected = formData.specializations.includes(spec.id);
                          return (
                            <button
                              key={spec.id}
                              onClick={() => handleSpecializationToggle(spec.id)}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-200",
                                isSelected
                                  ? "border-foreground bg-foreground/5"
                                  : "border-border hover:border-foreground/50 bg-background"
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleSpecializationToggle(spec.id)}
                                className="pointer-events-none"
                              />
                              <span className="text-sm font-medium">{spec.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="h-12"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      className="flex-1 h-12 font-semibold"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Contact Step */}
              {step === 3 && (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                      How can we reach you?
                    </h1>
                    <p className="text-muted-foreground">
                      Share your contact info and portfolio links.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">WhatsApp Number</Label>
                      <Input
                        type="tel"
                        placeholder="+1 234 567 8900"
                        value={formData.whatsappNumber}
                        onChange={(e) => setFormData((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
                        className="h-12 text-base"
                      />
                      <p className="text-xs text-muted-foreground">
                        We&apos;ll notify you of new tasks via WhatsApp.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold">Portfolio Links</Label>
                      <Textarea
                        placeholder="Behance, Dribbble, or personal website URLs (comma-separated)"
                        value={formData.portfolioUrls}
                        onChange={(e) => setFormData((prev) => ({ ...prev, portfolioUrls: e.target.value }))}
                        className="min-h-[100px] text-base resize-none"
                      />
                    </div>

                    {/* What happens next */}
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
                      <div className="w-10 h-10 rounded-lg bg-foreground/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">What happens next?</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Our team will review your application within 24-48 hours. Once approved,
                          you&apos;ll start receiving task notifications matching your skills.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                      disabled={isLoading}
                      className="h-12"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="flex-1 h-12 font-semibold"
                    >
                      {isLoading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Application
                          <Check className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 sm:px-10 lg:px-16 py-6 border-t mt-auto">
          <div className="max-w-md space-y-3">
            <p className="text-sm text-muted-foreground">
              You can continue anytime. We&apos;ve saved your progress.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <a href="#" className="text-muted-foreground hover:text-foreground underline underline-offset-4">
                Have questions? Contact us.
              </a>
            </div>
            <button
              onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } })}
              className="text-sm text-muted-foreground hover:text-foreground font-medium cursor-pointer"
            >
              Log out
            </button>
          </div>
        </footer>
      </div>

      {/* Right side - Preview panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden bg-muted">
        {/* Dynamic Content based on step */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 w-full">
          <AnimatePresence mode="wait">
            {/* Welcome Step - Welcome state */}
            {step === 0 && (
              <motion.div
                key="preview-welcome"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-8"
              >
                <div className="relative">
                  <motion.div
                    className="w-32 h-32 rounded-3xl bg-background border border-border shadow-lg flex items-center justify-center mx-auto"
                    animate={{
                      boxShadow: ["0 4px 20px rgba(0,0,0,0.08)", "0 8px 30px rgba(0,0,0,0.12)", "0 4px 20px rgba(0,0,0,0.08)"]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="w-16 h-16 text-muted-foreground/60" />
                  </motion.div>
                </div>
                <div className="space-y-3 max-w-sm">
                  <h2 className="text-2xl font-bold text-foreground">Welcome, Designer</h2>
                  <p className="text-muted-foreground">
                    Join our network of talented creatives and get matched with exciting projects.
                  </p>
                </div>
              </motion.div>
            )}

            {/* About Step - Profile preview */}
            {step === 1 && (
              <motion.div
                key="preview-about"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-sm"
              >
                {/* Profile Card Preview */}
                <motion.div
                  className="bg-background rounded-3xl border border-border shadow-xl overflow-hidden"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {/* Card Header */}
                  <div
                    className="h-20 relative"
                    style={{
                      background: "linear-gradient(135deg, #14b8a6, #3b82f6)"
                    }}
                  >
                    <div className="absolute inset-0 bg-black/10" />
                  </div>

                  {/* Avatar */}
                  <div className="relative px-6 -mt-10">
                    <motion.div
                      className="w-20 h-20 rounded-2xl bg-background shadow-xl border border-border flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                    >
                      <User className="w-10 h-10 text-muted-foreground" />
                    </motion.div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 pt-4 space-y-4">
                    <div>
                      <motion.h3
                        className="text-xl font-bold text-foreground"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        Your Profile
                      </motion.h3>
                      <motion.p
                        className="text-muted-foreground text-sm mt-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                      >
                        Designer
                      </motion.p>
                    </div>

                    {formData.bio ? (
                      <motion.p
                        className="text-muted-foreground text-sm line-clamp-3"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        key={formData.bio}
                      >
                        {formData.bio}
                      </motion.p>
                    ) : (
                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <div className="h-2.5 bg-muted rounded-full w-full" />
                        <div className="h-2.5 bg-muted rounded-full w-3/4" />
                        <div className="h-2.5 bg-muted rounded-full w-1/2" />
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                <motion.p
                  className="text-center text-muted-foreground text-sm mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  Preview of your profile card
                </motion.p>
              </motion.div>
            )}

            {/* Skills Step - Skills preview */}
            {step === 2 && (
              <motion.div
                key="preview-skills"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-sm"
              >
                <motion.div
                  className="bg-background rounded-3xl border border-border shadow-xl p-8 space-y-6"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Your expertise</h3>
                    <p className="text-sm text-muted-foreground">
                      {formData.skills.length + formData.specializations.length > 0
                        ? `${formData.skills.length + formData.specializations.length} selected`
                        : "Select your skills"}
                    </p>
                  </div>

                  {/* Selected skills */}
                  <div className="space-y-3">
                    {formData.skills.length > 0 || formData.specializations.length > 0 ? (
                      <>
                        {formData.skills.map((skillId) => {
                          const skill = skills.find((s) => s.id === skillId);
                          return (
                            <motion.div
                              key={skillId}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center gap-3 p-3 rounded-lg bg-foreground/5"
                            >
                              <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                                <Palette className="w-4 h-4 text-background" />
                              </div>
                              <span className="text-sm font-medium text-foreground">{skill?.label}</span>
                            </motion.div>
                          );
                        })}
                        {formData.specializations.map((specId) => {
                          const spec = specializations.find((s) => s.id === specId);
                          return (
                            <motion.div
                              key={specId}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center gap-3 p-3 rounded-lg bg-foreground/5"
                            >
                              <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
                                <Briefcase className="w-4 h-4 text-background" />
                              </div>
                              <span className="text-sm font-medium text-foreground">{spec?.label}</span>
                            </motion.div>
                          );
                        })}
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Select skills to see them here
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Contact Step - Complete preview */}
            {step === 3 && (
              <motion.div
                key="preview-contact"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                className="text-center space-y-8"
              >
                {/* Summary card */}
                <motion.div
                  className="bg-background rounded-3xl border border-border shadow-xl p-8 max-w-sm mx-auto space-y-6"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Application summary</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Bio status */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        formData.bio ? "bg-foreground" : "bg-muted"
                      )}>
                        {formData.bio ? (
                          <CheckCircle2 className="w-4 h-4 text-background" />
                        ) : (
                          <User className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">Bio</p>
                        <p className="text-xs text-muted-foreground">
                          {formData.bio ? "Added" : "Not added"}
                        </p>
                      </div>
                    </div>

                    {/* Skills status */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        formData.skills.length > 0 ? "bg-foreground" : "bg-muted"
                      )}>
                        {formData.skills.length > 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-background" />
                        ) : (
                          <Palette className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">Skills</p>
                        <p className="text-xs text-muted-foreground">
                          {formData.skills.length > 0 ? `${formData.skills.length} selected` : "None selected"}
                        </p>
                      </div>
                    </div>

                    {/* Contact status */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        formData.whatsappNumber ? "bg-foreground" : "bg-muted"
                      )}>
                        {formData.whatsappNumber ? (
                          <CheckCircle2 className="w-4 h-4 text-background" />
                        ) : (
                          <Phone className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">Contact</p>
                        <p className="text-xs text-muted-foreground">
                          {formData.whatsappNumber ? "Added" : "Not added"}
                        </p>
                      </div>
                    </div>

                    {/* Portfolio status */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        formData.portfolioUrls ? "bg-foreground" : "bg-muted"
                      )}>
                        {formData.portfolioUrls ? (
                          <CheckCircle2 className="w-4 h-4 text-background" />
                        ) : (
                          <Share2 className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">Portfolio</p>
                        <p className="text-xs text-muted-foreground">
                          {formData.portfolioUrls ? "Added" : "Not added"}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.p
                  className="text-muted-foreground text-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Ready to submit your application
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
