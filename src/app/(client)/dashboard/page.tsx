"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Send,
  Paperclip,
  Image as ImageIcon,
  Presentation,
  Share2,
  Layout,
  BookOpen,
  ArrowRight,
  FileText,
  Palette,
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
    id: "social",
    icon: Share2,
    label: "Social media post",
    prompt: "Create a social media post for",
    color: "bg-pink-100 text-pink-600",
  },
  {
    id: "presentation",
    icon: Presentation,
    label: "Pitch deck slide",
    prompt: "Design a pitch deck slide about",
    color: "bg-amber-100 text-amber-600",
  },
  {
    id: "landing",
    icon: Layout,
    label: "Landing page hero",
    prompt: "Design a landing page hero section for",
    color: "bg-blue-100 text-blue-600",
  },
  {
    id: "guidelines",
    icon: BookOpen,
    label: "Brand guidelines",
    prompt: "Create brand guidelines for",
    color: "bg-purple-100 text-purple-600",
  },
];

const DESIGN_TEMPLATES = [
  {
    id: "instagram",
    title: "Instagram Post",
    description: "Square format, eye-catching visuals",
    icon: Share2,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    id: "linkedin",
    title: "LinkedIn Banner",
    description: "Professional cover image",
    icon: FileText,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    id: "pitch",
    title: "Pitch Deck",
    description: "Investor-ready slides",
    icon: Presentation,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    id: "brand",
    title: "Brand Kit",
    description: "Logo, colors, typography",
    icon: Palette,
    gradient: "from-purple-500 to-indigo-500",
  },
];

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Handle payment success/cancel
    const payment = searchParams.get("payment");
    const credits = searchParams.get("credits");

    if (payment === "success" && credits) {
      toast.success(`Successfully purchased ${credits} credits!`);
    } else if (payment === "cancelled") {
      toast.info("Payment was cancelled");
    }

    // Fetch dashboard data
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
    // Navigate to chat page with the initial message
    router.push(`/dashboard/chat?message=${encodeURIComponent(chatInput.trim())}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setChatInput(prompt + " ");
    textareaRef.current?.focus();
  };

  const handleTemplateClick = (templateId: string) => {
    const prompts: Record<string, string> = {
      instagram: "Create an Instagram post for my brand",
      linkedin: "Design a LinkedIn banner for my profile",
      pitch: "Create a pitch deck presentation",
      brand: "Design a brand kit with logo and colors",
    };
    setChatInput(prompts[templateId] || "");
    textareaRef.current?.focus();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12" style={{ fontFamily: "'Satoshi', sans-serif" }}>
      {/* Hero Section with Chat */}
      <div className="text-center space-y-8 pt-8">
        {/* Logo Icon */}
        <div className="flex justify-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #14b8a6 0%, #3b82f6 50%, #4338ca 100%)" }}
          >
            <Sparkles className="w-8 h-8" />
          </div>
        </div>

        {/* Welcome Text */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            What would you like to create?
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Describe your design and we&apos;ll bring it to life. On-brand, every time.
          </p>
        </div>

        {/* Chat Input */}
        <div className="relative max-w-2xl mx-auto">
          <div className="relative rounded-2xl border-2 border-border bg-background shadow-sm focus-within:border-foreground/20 focus-within:shadow-lg transition-all duration-200">
            <Textarea
              ref={textareaRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to create..."
              className="min-h-[120px] resize-none border-0 bg-transparent px-4 pt-4 pb-14 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-muted-foreground hover:text-foreground"
                >
                  <Paperclip className="h-4 w-4 mr-1.5" />
                  Attach
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-muted-foreground hover:text-foreground"
                >
                  <ImageIcon className="h-4 w-4 mr-1.5" />
                  Image
                </Button>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!chatInput.trim() || isSending}
                size="sm"
                className="h-9 px-4 rounded-xl"
                style={{ background: chatInput.trim() ? "linear-gradient(135deg, #14b8a6 0%, #3b82f6 50%, #4338ca 100%)" : undefined }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Prompts */}
        <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => handleQuickPrompt(prompt.prompt)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-background hover:bg-muted transition-colors text-sm"
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${prompt.color}`}>
                <prompt.icon className="w-3.5 h-3.5" />
              </div>
              {prompt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Design Templates Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Start with a template</h2>
          <Link
            href="/dashboard/tasks"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {DESIGN_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateClick(template.id)}
              className="group relative overflow-hidden rounded-2xl border border-border bg-background p-5 text-left hover:border-foreground/20 hover:shadow-lg transition-all duration-300"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${template.gradient} flex items-center justify-center mb-4`}>
                <template.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{template.title}</h3>
              <p className="text-xs text-muted-foreground">{template.description}</p>
              <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent Work Section */}
      {!isLoading && tasks.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent work</h2>
            <Link
              href="/dashboard/tasks"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.slice(0, 3).map((task) => (
              <Link
                key={task.id}
                href={`/dashboard/tasks/${task.id}`}
                className="group rounded-2xl border border-border bg-background p-5 hover:border-foreground/20 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-700"
                      : task.status === "IN_PROGRESS"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {task.status === "COMPLETED" ? "Done" : task.status === "IN_PROGRESS" ? "In Progress" : "Pending"}
                  </span>
                </div>
                <h3 className="font-medium text-foreground mb-1 line-clamp-1">{task.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(task.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State for Recent Work */}
      {!isLoading && tasks.length === 0 && (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">No designs yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start by describing what you want to create above
          </p>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 pt-8">
      <div className="text-center space-y-8">
        <Skeleton className="w-16 h-16 rounded-2xl mx-auto" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-80 mx-auto" />
          <Skeleton className="h-6 w-64 mx-auto" />
        </div>
        <Skeleton className="h-32 max-w-2xl mx-auto rounded-2xl" />
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
