"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { LoadingSpinner } from "@/components/shared/loading";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

// Floating organic blob shapes
function FloatingBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full opacity-30 blur-3xl"
        style={{
          background: "radial-gradient(ellipse, #4a7c4a 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/4 -left-20 w-[350px] h-[450px] rounded-full opacity-25 blur-3xl"
        style={{
          background: "radial-gradient(ellipse, #6b9b6b 0%, transparent 70%)",
          transform: "rotate(-20deg)",
        }}
      />
      <div
        className="absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(ellipse, #8bb58b 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-20 left-10 w-[200px] h-[200px] rounded-full opacity-30 blur-2xl"
        style={{
          background: "radial-gradient(ellipse, #4a7c4a 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-20 right-1/4 w-[250px] h-[200px] rounded-full opacity-25 blur-2xl"
        style={{
          background: "radial-gradient(ellipse, #6b9b6b 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

// Scattered particle dots
function ParticleDots() {
  const particles = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.1,
      delay: Math.random() * 2,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
          }}
          animate={{
            opacity: [p.opacity, p.opacity * 0.3, p.opacity],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

// Brand logo with user menu
function Header({ userEmail }: { userEmail?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6 sm:p-8">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="grid grid-cols-2 gap-1">
          <div className="w-2 h-2 rounded-full bg-[#8bb58b]" />
          <div className="w-2 h-2 rounded-full bg-[#8bb58b]" />
          <div className="w-2 h-2 rounded-full bg-[#8bb58b]" />
          <div className="w-2 h-2 rounded-full bg-[#8bb58b]" />
        </div>
        <span className="text-white/90 text-sm font-medium tracking-wide uppercase">
          Crafted
        </span>
      </div>

      {/* User menu */}
      {userEmail && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm hover:bg-white/10 transition-colors"
          >
            {userEmail}
            <ChevronDown className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 shadow-xl">
              <button
                onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } })}
                className="w-full px-4 py-2 text-left text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

// Glowing card wrapper component
function GlowingCard({ children, glowColor = "#8bb58b" }: { children: React.ReactNode; glowColor?: string }) {
  return (
    <div className="relative">
      {/* Glow effect */}
      <div
        className="absolute -inset-1 rounded-3xl opacity-50 blur-xl"
        style={{
          background: `linear-gradient(135deg, ${glowColor}40, transparent, ${glowColor}40)`,
        }}
      />
      {/* Card */}
      <div
        className="relative rounded-2xl p-8 sm:p-10"
        style={{
          background: "rgba(15, 15, 15, 0.9)",
          backdropFilter: "blur(20px)",
          border: `1px solid ${glowColor}30`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Loading transition screen
function LoadingTransition({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center"
      >
        <Check className="w-8 h-8 text-white/60" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-white/70 text-lg"
        style={{ fontFamily: "'Times New Roman', serif" }}
      >
        {message}
      </motion.p>
    </motion.div>
  );
}

// Simple client onboarding - one step at a time
function SimpleClientOnboarding({ onComplete }: { onComplete: () => void }) {
  const { refetch: refetchSession } = useSession();
  const [step, setStep] = useState<"loading" | "company" | "industry" | "colors" | "submitting" | "complete">("loading");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4a7c4a");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial loading animation
  useEffect(() => {
    const timer = setTimeout(() => setStep("company"), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    setStep("submitting");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "client",
          data: {
            brand: {
              name: companyName,
              industry,
              primaryColor,
              secondaryColor: "#6b9b6b",
              description: "",
              website: "",
              creativeFocus: [],
              feelPlayfulSerious: 50,
              feelBoldMinimal: 50,
              feelExperimentalClassic: 50,
            },
            hasWebsite: false,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      await refetchSession();
      setStep("complete");

      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch {
      setIsSubmitting(false);
      setStep("colors");
    }
  };

  const colorPresets = ["#4a7c4a", "#6b9b6b", "#2d5a2d", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#ef4444"];

  return (
    <AnimatePresence mode="wait">
      {step === "loading" && (
        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LoadingTransition message="Setting up your account." />
        </motion.div>
      )}

      {step === "company" && (
        <motion.div
          key="company"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <GlowingCard>
            <div className="text-center mb-8">
              <h1 className="text-2xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
                What&apos;s your company called?
              </h1>
              <p className="text-white/50 text-sm">This helps us personalize your experience</p>
            </div>

            <div className="space-y-6">
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: "rgba(40, 40, 40, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-transparent py-4 px-4 text-white placeholder:text-white/30 focus:outline-none text-center text-lg"
                  placeholder="Acme Inc."
                  autoFocus
                />
              </div>

              <button
                onClick={() => companyName.trim() && setStep("industry")}
                disabled={!companyName.trim()}
                className="w-full py-4 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-40"
                style={{
                  background: companyName.trim() ? "#f5f5f0" : "rgba(245, 245, 240, 0.3)",
                  color: "#1a1a1a",
                }}
              >
                Continue
              </button>
            </div>
          </GlowingCard>
        </motion.div>
      )}

      {step === "industry" && (
        <motion.div
          key="industry"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <GlowingCard>
            <div className="text-center mb-8">
              <h1 className="text-2xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
                What industry are you in?
              </h1>
              <p className="text-white/50 text-sm">Help us match you with the right designers</p>
            </div>

            <div className="space-y-6">
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: "rgba(40, 40, 40, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-transparent py-4 px-4 text-white placeholder:text-white/30 focus:outline-none text-center text-lg"
                  placeholder="e.g. Technology, Fashion, Healthcare"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("company")}
                  className="flex-1 py-4 rounded-xl font-medium text-sm transition-all duration-200 border border-white/10 text-white/70 hover:bg-white/5"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("colors")}
                  className="flex-1 py-4 rounded-xl font-medium text-sm transition-all duration-200"
                  style={{
                    background: "#f5f5f0",
                    color: "#1a1a1a",
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </GlowingCard>
        </motion.div>
      )}

      {step === "colors" && (
        <motion.div
          key="colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <GlowingCard glowColor={primaryColor}>
            <div className="text-center mb-8">
              <h1 className="text-2xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
                Pick your brand color
              </h1>
              <p className="text-white/50 text-sm">Choose a color that represents {companyName || "your brand"}</p>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap justify-center gap-3">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    onClick={() => setPrimaryColor(color)}
                    className="w-12 h-12 rounded-xl transition-all duration-200 hover:scale-110"
                    style={{
                      backgroundColor: color,
                      boxShadow: primaryColor === color ? `0 0 0 3px rgba(255,255,255,0.3), 0 0 20px ${color}80` : "none",
                    }}
                  />
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("industry")}
                  className="flex-1 py-4 rounded-xl font-medium text-sm transition-all duration-200 border border-white/10 text-white/70 hover:bg-white/5"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-4 rounded-xl font-medium text-sm transition-all duration-200"
                  style={{
                    background: "#f5f5f0",
                    color: "#1a1a1a",
                  }}
                >
                  Complete Setup
                </button>
              </div>
            </div>
          </GlowingCard>
        </motion.div>
      )}

      {step === "submitting" && (
        <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LoadingTransition message="Creating your workspace." />
        </motion.div>
      )}

      {step === "complete" && (
        <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LoadingTransition message="You're all set!" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Simple freelancer onboarding
function SimpleFreelancerOnboarding({ onComplete }: { onComplete: () => void }) {
  const { refetch: refetchSession } = useSession();
  const [step, setStep] = useState<"loading" | "bio" | "skills" | "contact" | "submitting" | "complete">("loading");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [whatsapp, setWhatsapp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const skillOptions = [
    { id: "photoshop", label: "Photoshop" },
    { id: "illustrator", label: "Illustrator" },
    { id: "figma", label: "Figma" },
    { id: "after_effects", label: "After Effects" },
    { id: "canva", label: "Canva" },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setStep("bio"), 1500);
    return () => clearTimeout(timer);
  }, []);

  const toggleSkill = (id: string) => {
    setSkills((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    setStep("submitting");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "freelancer",
          data: {
            bio,
            skills,
            specializations: [],
            portfolioUrls: [],
            whatsappNumber: whatsapp,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      await refetchSession();
      setStep("complete");

      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch {
      setIsSubmitting(false);
      setStep("contact");
    }
  };

  return (
    <AnimatePresence mode="wait">
      {step === "loading" && (
        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LoadingTransition message="Setting up your profile." />
        </motion.div>
      )}

      {step === "bio" && (
        <motion.div
          key="bio"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <GlowingCard glowColor="#3b82f6">
            <div className="text-center mb-8">
              <h1 className="text-2xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
                Tell us about yourself
              </h1>
              <p className="text-white/50 text-sm">A brief intro to help clients get to know you</p>
            </div>

            <div className="space-y-6">
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: "rgba(40, 40, 40, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-transparent py-4 px-4 text-white placeholder:text-white/30 focus:outline-none text-sm min-h-[120px] resize-none"
                  placeholder="I'm a designer with 5 years of experience..."
                  autoFocus
                />
              </div>

              <button
                onClick={() => setStep("skills")}
                className="w-full py-4 rounded-xl font-medium text-sm transition-all duration-200"
                style={{
                  background: "#f5f5f0",
                  color: "#1a1a1a",
                }}
              >
                Continue
              </button>
            </div>
          </GlowingCard>
        </motion.div>
      )}

      {step === "skills" && (
        <motion.div
          key="skills"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <GlowingCard glowColor="#8b5cf6">
            <div className="text-center mb-8">
              <h1 className="text-2xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
                What tools do you use?
              </h1>
              <p className="text-white/50 text-sm">Select all that apply</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {skillOptions.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => toggleSkill(skill.id)}
                    className="py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 text-left"
                    style={{
                      background: skills.includes(skill.id) ? "rgba(139, 92, 246, 0.3)" : "rgba(40, 40, 40, 0.6)",
                      border: skills.includes(skill.id) ? "1px solid rgba(139, 92, 246, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
                      color: skills.includes(skill.id) ? "#fff" : "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    {skill.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("bio")}
                  className="flex-1 py-4 rounded-xl font-medium text-sm transition-all duration-200 border border-white/10 text-white/70 hover:bg-white/5"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep("contact")}
                  className="flex-1 py-4 rounded-xl font-medium text-sm transition-all duration-200"
                  style={{
                    background: "#f5f5f0",
                    color: "#1a1a1a",
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </GlowingCard>
        </motion.div>
      )}

      {step === "contact" && (
        <motion.div
          key="contact"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <GlowingCard glowColor="#ec4899">
            <div className="text-center mb-8">
              <h1 className="text-2xl text-white mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
                How can we reach you?
              </h1>
              <p className="text-white/50 text-sm">We&apos;ll notify you of new tasks via WhatsApp</p>
            </div>

            <div className="space-y-6">
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: "rgba(40, 40, 40, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full bg-transparent py-4 px-4 text-white placeholder:text-white/30 focus:outline-none text-center text-lg"
                  placeholder="+1 234 567 8900"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("skills")}
                  className="flex-1 py-4 rounded-xl font-medium text-sm transition-all duration-200 border border-white/10 text-white/70 hover:bg-white/5"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-4 rounded-xl font-medium text-sm transition-all duration-200"
                  style={{
                    background: "#f5f5f0",
                    color: "#1a1a1a",
                  }}
                >
                  Submit Application
                </button>
              </div>
            </div>
          </GlowingCard>
        </motion.div>
      )}

      {step === "submitting" && (
        <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LoadingTransition message="Submitting your application." />
        </motion.div>
      )}

      {step === "complete" && (
        <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <LoadingTransition message="Application submitted!" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const roleSetRef = useRef(false);

  const type = useMemo(() => {
    const typeParam = searchParams.get("type");
    return typeParam === "freelancer" ? "freelancer" : "client";
  }, [searchParams]);

  // Handle redirects
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
      return;
    }

    const user = session?.user as { onboardingCompleted?: boolean; role?: string } | undefined;
    if (user?.onboardingCompleted) {
      if (user.role === "FREELANCER") {
        router.push("/portal");
      } else {
        router.push("/dashboard");
      }
    }
  }, [session, isPending, router]);

  // Set role for freelancer
  useEffect(() => {
    if (type === "freelancer" && !roleSetRef.current) {
      roleSetRef.current = true;
      fetch("/api/auth/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "FREELANCER" }),
      }).catch(() => {});
    }
  }, [type]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleComplete = () => {
    if (type === "freelancer") {
      router.push("/portal");
    } else {
      router.push("/dashboard");
    }
  };

  const userEmail = session.user?.email || undefined;

  return (
    <div
      className="min-h-screen relative flex items-center justify-center"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        backgroundColor: "#0a0a0a",
      }}
    >
      {/* Background effects */}
      <FloatingBlobs />
      <ParticleDots />

      {/* Header */}
      <Header userEmail={userEmail} />

      {/* Main content */}
      <main className="relative z-10 w-full max-w-md px-4 py-24">
        {type === "freelancer" ? (
          <SimpleFreelancerOnboarding onComplete={handleComplete} />
        ) : (
          <SimpleClientOnboarding onComplete={handleComplete} />
        )}
      </main>

      {/* Footer */}
      <footer className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/30">
        <p>&copy; {new Date().getFullYear()} Crafted Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0a0a0a" }}>
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
