"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  AudioLines,
  User,
  PlayCircle,
  FileText,
  MoreHorizontal,
  Zap,
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
    icon: User,
    label: "Any advice for me?",
  },
  {
    id: "youtube",
    icon: PlayCircle,
    label: "Some youtube video idea",
  },
  {
    id: "lessons",
    icon: FileText,
    label: "Life lessons from kratos",
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
    <div className="relative flex flex-col items-center justify-center min-h-full px-4 bg-[#0a0a0a]">
      {/* Gradient light rays effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px]"
          style={{
            background: `
              radial-gradient(ellipse 600px 400px at 50% 50%, rgba(50, 50, 60, 0.4) 0%, transparent 70%),
              linear-gradient(180deg, transparent 0%, transparent 30%, rgba(30, 30, 40, 0.2) 50%, transparent 70%),
              repeating-linear-gradient(
                90deg,
                transparent 0px,
                transparent 60px,
                rgba(60, 60, 70, 0.1) 60px,
                rgba(60, 60, 70, 0.1) 62px,
                transparent 62px,
                transparent 120px
              )
            `,
            maskImage:
              "radial-gradient(ellipse 100% 100% at 50% 0%, black 0%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 100% 100% at 50% 0%, black 0%, transparent 70%)",
          }}
        />
        {/* Vertical light beams */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[500px]"
          style={{
            background: `
              linear-gradient(90deg,
                transparent 0%,
                transparent 20%,
                rgba(80, 80, 90, 0.08) 25%,
                transparent 30%,
                transparent 35%,
                rgba(80, 80, 90, 0.06) 40%,
                transparent 45%,
                transparent 50%,
                rgba(80, 80, 90, 0.08) 55%,
                transparent 60%,
                transparent 65%,
                rgba(80, 80, 90, 0.06) 70%,
                transparent 75%,
                transparent 100%
              )
            `,
            maskImage:
              "linear-gradient(180deg, black 0%, black 30%, transparent 80%)",
            WebkitMaskImage:
              "linear-gradient(180deg, black 0%, black 30%, transparent 80%)",
          }}
        />
      </div>

      {/* Center Content */}
      <div className="relative flex flex-col items-center text-center max-w-2xl mx-auto space-y-6 z-10">
        {/* Logo Icon */}
        <div className="w-20 h-20 rounded-2xl bg-[#1a1a1f] flex items-center justify-center shadow-2xl mb-2 border border-[#2a2a30]/50">
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
        <div className="w-full max-w-xl mt-8">
          {/* Pro Plan Banner */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-t-xl border border-b-0 border-[#2a2a30]/60"
            style={{
              background:
                "linear-gradient(180deg, rgba(25, 25, 28, 0.8) 0%, rgba(20, 20, 23, 0.9) 100%)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div className="flex items-center gap-2 text-[#6b6b6b] text-sm">
              <Zap className="h-4 w-4" />
              <span>Unlock more features with the Pro plan.</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              <span className="text-[#6b6b6b]">Active extensions</span>
            </div>
          </div>

          {/* Input Field with Glassy Effect */}
          <div
            className="relative flex items-center rounded-b-xl border border-[#2a2a30]/60"
            style={{
              background:
                "linear-gradient(180deg, rgba(20, 20, 23, 0.9) 0%, rgba(15, 15, 18, 0.95) 100%)",
              backdropFilter: "blur(10px)",
            }}
          >
            <button className="p-3 text-[#6b6b6b] hover:text-white transition-colors">
              <Plus className="h-5 w-5" />
            </button>
            <div className="h-5 w-px bg-[#2a2a30]"></div>
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
              <AudioLines className="h-5 w-5" />
            </button>
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
            <MoreHorizontal className="w-4 h-4" />
          </button>
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
