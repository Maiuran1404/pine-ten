"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Paperclip,
  ArrowUp,
  Lightbulb,
  Video,
  BookOpen,
  Grip,
  Sparkles,
  Image,
  Palette,
  Type,
  FileImage,
  Layers,
  Download,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  creditsUsed: number;
}

const QUICK_PROMPTS = [
  {
    id: "advice",
    icon: Lightbulb,
    label: "Any advice for me?",
  },
  {
    id: "youtube",
    icon: Video,
    label: "Some youtube video idea",
  },
  {
    id: "lessons",
    icon: BookOpen,
    label: "Life lessons from kratos",
  },
];

const DESIGN_ASSETS = [
  {
    id: "logo",
    icon: Image,
    title: "Logo Pack",
    description: "Primary and secondary logos in various formats",
    fileCount: 12,
  },
  {
    id: "colors",
    icon: Palette,
    title: "Brand Colors",
    description: "Color palette with hex codes and usage guidelines",
    fileCount: 8,
  },
  {
    id: "typography",
    icon: Type,
    title: "Typography",
    description: "Font files and typographic scale definitions",
    fileCount: 6,
  },
  {
    id: "icons",
    icon: FileImage,
    title: "Icon Set",
    description: "Custom icons for web and mobile applications",
    fileCount: 48,
  },
  {
    id: "templates",
    icon: Layers,
    title: "Templates",
    description: "Social media and presentation templates",
    fileCount: 15,
  },
  {
    id: "mockups",
    icon: Image,
    title: "Mockups",
    description: "Product mockups and brand imagery",
    fileCount: 24,
  },
];

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const credits = searchParams.get("credits");

    if (payment === "success" && credits) {
      toast.success(`Successfully purchased ${credits} credits!`);
    } else if (payment === "cancelled") {
      toast.info("Payment was cancelled");
    }

    fetchDashboardData();
  }, [searchParams]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/tasks?limit=5");
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!chatInput.trim() || isSending) return;

    setIsSending(true);
    router.push(
      `/dashboard/chat?message=${encodeURIComponent(chatInput.trim())}`
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setChatInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex flex-col items-center justify-start min-h-full px-4 pt-16 pb-20 bg-[#0a0a0a] overflow-auto">
      {/* Noise texture to prevent gradient banding */}
      <svg className="hidden">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
      </svg>

      {/* Curtain light from top - subtle ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[800px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 0%,
            rgba(255, 255, 255, 0.06) 0%,
            rgba(255, 255, 255, 0.04) 20%,
            rgba(255, 255, 255, 0.025) 40%,
            rgba(255, 255, 255, 0.012) 60%,
            rgba(255, 255, 255, 0.004) 80%,
            transparent 100%
          )`,
          animation: 'curtainPulse 14s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          filter: 'blur(40px)',
        }}
      />
      <style jsx>{`
        @keyframes curtainPulse {
          0%, 100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* Center Content */}
      <div className="relative flex flex-col items-center text-center max-w-2xl mx-auto space-y-6 z-10">
        {/* Logo Icon */}
        <div
          className="w-20 h-20 rounded-2xl bg-[#18181b] flex items-center justify-center mb-2 border border-[#27272a]/60"
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 12C6 8.68629 8.68629 6 12 6C13.5217 6 14.911 6.55301 16 7.46793V7C16 6.44772 16.4477 6 17 6C17.5523 6 18 6.44772 18 7V10C18 10.5523 17.5523 11 17 11H14C13.4477 11 13 10.5523 13 10C13 9.44772 13.4477 9 14 9H14.7639C14.0883 8.38625 13.1894 8 12.2 8C9.88041 8 8 9.88041 8 12.2C8 14.5196 9.88041 16.4 12.2 16.4C13.8484 16.4 15.2727 15.4988 16.0018 14.1644C16.2608 13.6906 16.8518 13.5144 17.3256 13.7735C17.7994 14.0325 17.9756 14.6235 17.7165 15.0973C16.6929 16.9709 14.6021 18.2 12.2 18.2C8.77583 18.2 6 15.4242 6 12Z"
              fill="white"
            />
          </svg>
        </div>

        {/* Welcome Text */}
        <div className="space-y-2">
          <h1
            className="text-3xl sm:text-4xl font-normal tracking-tight"
            style={{
              background:
                "linear-gradient(90deg, #9ca3af 0%, #6b7280 50%, #4b5563 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Good to see you!
          </h1>
          <h2
            className="text-2xl sm:text-3xl font-normal tracking-tight"
            style={{
              background:
                "linear-gradient(90deg, #e5e7eb 0%, #9ca3af 40%, #6b7280 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            How can I help you today?
          </h2>
          <p className="text-[#6b7280] text-base mt-4">
            Im available 24/7 for you, ask me anything.
          </p>
        </div>

        {/* Input Container with Glassy Effect */}
        <div className="w-full max-w-xl mt-8 relative">
          {/* Glass container */}
          <div
            className="relative rounded-xl overflow-hidden border border-[#2a2a30]/50"
            style={{
              background: 'linear-gradient(180deg, rgba(20, 20, 24, 0.8) 0%, rgba(12, 12, 15, 0.9) 100%)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 30px rgba(255,255,255,0.02), inset 0 1px 0 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* Pro Plan Banner */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a30]/40">
              <div className="flex items-center gap-2 text-[#6b6b6b] text-sm">
                <Sparkles className="h-4 w-4" />
                <span>Unlock more features with the Pro plan.</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                <span className="text-[#6b6b6b]">Active extensions</span>
              </div>
            </div>

            {/* Input Field */}
            <div className="relative flex items-center">
              <button className="p-3 text-[#6b6b6b] hover:text-white transition-colors">
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="h-5 w-px bg-[#2a2a30]/50"></div>
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything ..."
                className="flex-1 bg-transparent px-4 py-3.5 text-white placeholder:text-[#4a4a4a] focus:outline-none text-sm"
              />
              <button
                onClick={handleSubmit}
                className="p-3 text-[#6b6b6b] hover:text-white transition-colors"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => handleQuickPrompt(prompt.label)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[#2a2a30]/60 hover:border-[#3a3a40]/80 transition-all text-sm text-[#6b6b6b] hover:text-white"
              style={{
                background: "rgba(20, 20, 23, 0.6)",
                backdropFilter: "blur(8px)",
              }}
            >
              <prompt.icon className="w-4 h-4" />
              {prompt.label}
            </button>
          ))}
          <button
            className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#2a2a30]/60 hover:border-[#3a3a40]/80 transition-all text-[#6b6b6b] hover:text-white"
            style={{
              background: "rgba(20, 20, 23, 0.6)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Grip className="w-4 h-4" />
          </button>
        </div>

        {/* Design Assets Grid */}
        <div className="w-full max-w-3xl mt-10">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {DESIGN_ASSETS.map((asset) => (
              <div
                key={asset.id}
                className="group relative rounded-xl overflow-hidden border border-[#2a2a30]/50 hover:border-[#3a3a40]/80 transition-all cursor-pointer"
                style={{
                  background: 'linear-gradient(180deg, rgba(20, 20, 24, 0.6) 0%, rgba(12, 12, 15, 0.8) 100%)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div className="p-4 space-y-3">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center border border-[#2a2a30]/60"
                    style={{
                      background: 'rgba(24, 24, 27, 0.8)',
                    }}
                  >
                    <asset.icon className="w-5 h-5 text-[#6b6b6b] group-hover:text-white transition-colors" />
                  </div>

                  {/* Content */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                      {asset.title}
                    </h3>
                    <p className="text-xs text-[#4a4a4a] leading-relaxed line-clamp-2">
                      {asset.description}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#2a2a30]/40">
                    <span className="text-xs text-[#4a4a4a]">
                      {asset.fileCount} files
                    </span>
                    <Download className="w-3.5 h-3.5 text-[#4a4a4a] group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-10">
        <p className="text-sm text-[#4a4a4a]">
          Unlock new era with Crafted.{" "}
          <Link
            href="/share"
            className="underline hover:text-[#6b6b6b] transition-colors"
          >
            share us
          </Link>
        </p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 bg-[#0a0a0a]">
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-6">
        <Skeleton className="w-20 h-20 rounded-2xl bg-[#1a1a1f]" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 mx-auto bg-[#1a1a1f]" />
          <Skeleton className="h-10 w-80 mx-auto bg-[#1a1a1f]" />
          <Skeleton className="h-5 w-56 mx-auto mt-4 bg-[#1a1a1f]" />
        </div>
        <Skeleton className="h-24 w-full max-w-xl rounded-xl mt-8 bg-[#1a1a1f]" />
        <div className="flex gap-3 mt-6">
          <Skeleton className="h-10 w-40 rounded-full bg-[#1a1a1f]" />
          <Skeleton className="h-10 w-48 rounded-full bg-[#1a1a1f]" />
          <Skeleton className="h-10 w-44 rounded-full bg-[#1a1a1f]" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
