"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/shared/loading";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Clock,
  User,
  Palette,
  Phone,
  Sparkles,
} from "lucide-react";

interface FreelancerOnboardingProps {
  onComplete: () => void;
}

const skills = [
  { id: "photoshop", label: "Adobe Photoshop" },
  { id: "illustrator", label: "Adobe Illustrator" },
  { id: "figma", label: "Figma" },
  { id: "canva", label: "Canva" },
  { id: "after_effects", label: "After Effects" },
  { id: "premiere", label: "Premiere Pro" },
  { id: "other", label: "Other" },
];

const specializations = [
  { id: "static_ads", label: "Static Ads" },
  { id: "video_motion", label: "Video/Motion Graphics" },
  { id: "social_media", label: "Social Media Content" },
  { id: "branding", label: "Branding & Identity" },
  { id: "ui_ux", label: "UI/UX Design" },
];

// Decorative curved lines component
function DecorativeLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 600 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <line x1="0" y1="250" x2="600" y2="250" stroke="white" strokeWidth="1.5" strokeOpacity="0.35" />
      <line x1="0" y1="620" x2="600" y2="620" stroke="white" strokeWidth="1.5" strokeOpacity="0.35" />
      <path
        d="M 420 0 L 420 250 Q 420 420 250 420 Q 80 420 80 590 L 80 620"
        stroke="white"
        strokeWidth="1.5"
        strokeOpacity="0.35"
        fill="none"
      />
    </svg>
  );
}

// Grainy texture overlay
function GrainOverlay() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          opacity: 0.35,
          mixBlendMode: "overlay",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter2'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter2)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
          opacity: 0.25,
          mixBlendMode: "soft-light",
        }}
      />
    </>
  );
}

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

  const totalSteps = 4;
  const progress = (step / (totalSteps - 1)) * 100;

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

  // Gradient button style
  const gradientButtonStyle = {
    background: "linear-gradient(135deg, #14b8a6 0%, #3b82f6 50%, #4338ca 100%)",
  };

  return (
    <div className="fixed inset-0 z-50 flex" style={{ fontFamily: "'Satoshi', sans-serif" }}>
      {/* Left side - Form content */}
      <div className="flex-1 flex flex-col bg-background overflow-y-auto">
        {/* Progress bar */}
        <div className="sticky top-0 z-10 bg-background">
          <Progress value={progress} className="h-1 rounded-none" />
        </div>

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-lg">
            <AnimatePresence mode="wait">
              {/* Welcome Step */}
              {step === 0 && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 text-sm font-medium mb-4">
                      <Sparkles className="w-4 h-4" />
                      <span>Designer Application</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Join Crafted</h1>
                    <p className="text-muted-foreground text-lg">
                      Tell us about yourself so we can match you with the perfect projects.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {[
                      { icon: User, title: "Create Profile", desc: "Share your story" },
                      { icon: Palette, title: "Show Skills", desc: "Highlight expertise" },
                      { icon: Phone, title: "Get Connected", desc: "Start receiving tasks" },
                    ].map((item) => (
                      <div key={item.title} className="flex items-center gap-4 p-4 rounded-xl border bg-muted/30">
                        <div className="p-2 rounded-lg bg-teal-500/10">
                          <item.icon className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    size="lg"
                    onClick={() => setStep(1)}
                    className="w-full h-12 text-white border-0 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                    style={gradientButtonStyle}
                  >
                    Get Started
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </motion.div>
              )}

              {/* About You Step */}
              {step === 1 && (
                <motion.div
                  key="about"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">About You</h2>
                    <p className="text-muted-foreground">Tell us about your experience</p>
                  </div>

                  <div className="p-4 rounded-xl border space-y-4">
                    <div>
                      <Label>Bio</Label>
                      <Textarea
                        placeholder="Tell us about yourself and your design experience..."
                        value={formData.bio}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                        className="mt-1 min-h-[150px]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(0)} className="flex-1 h-12">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(2)}
                      className="flex-1 h-12 text-white border-0"
                      style={gradientButtonStyle}
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Skills Step */}
              {step === 2 && (
                <motion.div
                  key="skills"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Your Skills</h2>
                    <p className="text-muted-foreground">What are you great at?</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border space-y-3">
                      <Label>Tools & Software</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {skills.map((skill) => (
                          <div
                            key={skill.id}
                            onClick={() => handleSkillToggle(skill.id)}
                            className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-all ${
                              formData.skills.includes(skill.id)
                                ? "border-teal-500 bg-teal-50 dark:bg-teal-950/20"
                                : "hover:border-muted-foreground/50"
                            }`}
                          >
                            <Checkbox
                              checked={formData.skills.includes(skill.id)}
                              onCheckedChange={() => handleSkillToggle(skill.id)}
                            />
                            <span className="text-sm font-medium">{skill.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border space-y-3">
                      <Label>Specializations</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {specializations.map((spec) => (
                          <div
                            key={spec.id}
                            onClick={() => handleSpecializationToggle(spec.id)}
                            className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-all ${
                              formData.specializations.includes(spec.id)
                                ? "border-teal-500 bg-teal-50 dark:bg-teal-950/20"
                                : "hover:border-muted-foreground/50"
                            }`}
                          >
                            <Checkbox
                              checked={formData.specializations.includes(spec.id)}
                              onCheckedChange={() => handleSpecializationToggle(spec.id)}
                            />
                            <span className="text-sm font-medium">{spec.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={() => setStep(3)}
                      className="flex-1 h-12 text-white border-0"
                      style={gradientButtonStyle}
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Contact Step */}
              {step === 3 && (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Contact & Portfolio</h2>
                    <p className="text-muted-foreground">How can clients reach you?</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border space-y-4">
                      <div>
                        <Label>WhatsApp Number</Label>
                        <Input
                          type="tel"
                          placeholder="+1 234 567 8900"
                          value={formData.whatsappNumber}
                          onChange={(e) => setFormData((prev) => ({ ...prev, whatsappNumber: e.target.value }))}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">We&apos;ll notify you of new tasks via WhatsApp</p>
                      </div>
                      <div>
                        <Label>Portfolio Links</Label>
                        <Textarea
                          placeholder="Behance, Dribbble, or personal website URLs (comma-separated)"
                          value={formData.portfolioUrls}
                          onChange={(e) => setFormData((prev) => ({ ...prev, portfolioUrls: e.target.value }))}
                          className="mt-1 min-h-[80px]"
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border bg-muted/30 p-4">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-teal-600 mt-0.5" />
                        <div>
                          <p className="font-medium">What happens next?</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Our team will review your application within 24-48 hours. Once approved,
                            you&apos;ll start receiving task notifications matching your skills.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(2)} disabled={isLoading} className="flex-1 h-12">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="flex-1 h-12 text-white border-0"
                      style={gradientButtonStyle}
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
        <footer className="p-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Crafted. All rights reserved.</p>
        </footer>
      </div>

      {/* Right side - Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 0% 0%, #2dd4bf 0%, transparent 50%),
              radial-gradient(ellipse at 100% 30%, #3b82f6 0%, transparent 50%),
              radial-gradient(ellipse at 50% 100%, #1e3a8a 0%, transparent 60%),
              radial-gradient(ellipse at 30% 70%, #4338ca 0%, transparent 50%),
              linear-gradient(180deg, #14b8a6 0%, #3b82f6 35%, #4338ca 65%, #1e3a8a 100%)
            `,
          }}
        />

        <GrainOverlay />
        <DecorativeLines />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="text-2xl font-bold">C</span>
            </div>
            <div>
              <span className="text-xl font-semibold tracking-tight">Crafted</span>
              <div className="text-sm text-white/70">Designer Portal</div>
            </div>
          </div>

          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
              Showcase your talent, grow your career
            </h1>
            <p className="text-lg text-white/70 leading-relaxed">
              Join our network of talented freelancers. Get matched with exciting projects and build lasting client relationships.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-white" />
              <div className="w-3 h-3 rounded-full bg-white/60" />
              <div className="w-3 h-3 rounded-full bg-white/40" />
              <div className="w-3 h-3 rounded-full bg-white/30" />
            </div>
            <span className="text-4xl font-light tracking-wide text-white">Crafted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
