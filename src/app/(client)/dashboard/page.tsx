"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  ArrowUp,
  Sparkles,
  Image as ImageIcon,
  Upload,
  FileText,
  FileVideo,
  FileArchive,
  File,
  X,
  MoreHorizontal,
  MessageSquare,
  Clock,
  FolderKanban,
  Download,
  Megaphone,
  Share2,
  PenTool,
  LayoutGrid,
} from "lucide-react";
import { CreditPurchaseDialog } from "@/components/shared/credit-purchase-dialog";
import { LoadingSpinner } from "@/components/shared/loading";
import { useSession } from "@/lib/auth-client";
import { getDrafts, type ChatDraft } from "@/lib/chat-drafts";

interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

interface BrandData {
  id: string;
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  brandColors: string[];
  primaryFont: string | null;
  secondaryFont: string | null;
  brandAssets: {
    images?: string[];
    documents?: string[];
  } | null;
}

// Prompt templates organized by category
const PROMPT_TEMPLATES = [
  {
    category: "Social Media",
    icon: Share2,
    color: "blue",
    templates: [
      {
        title: "Instagram Post",
        prompt: "I need social media content - specifically an Instagram post design with eye-catching visuals and on-brand colors.",
      },
      {
        title: "Instagram Story",
        prompt: "I need social media content - specifically Instagram story designs that are engaging and interactive.",
      },
      {
        title: "LinkedIn Post",
        prompt: "I need social media content - specifically a professional LinkedIn post graphic that's clean and on-brand.",
      },
      {
        title: "Twitter/X Banner",
        prompt: "I need social media content - specifically a Twitter/X header banner that showcases our brand identity.",
      },
    ],
  },
  {
    category: "Advertising",
    icon: Megaphone,
    color: "emerald",
    templates: [
      {
        title: "Facebook Ad",
        prompt: "I need static ad graphics - specifically a high-converting Facebook ad with a clear CTA.",
      },
      {
        title: "Google Display Ad",
        prompt: "I need static ad graphics - specifically Google Display ads in multiple sizes (300x250, 728x90, 160x600).",
      },
      {
        title: "Video Ad",
        prompt: "I need video/motion content - specifically a short video ad that hooks viewers and highlights key benefits.",
      },
      {
        title: "Retargeting Ad",
        prompt: "I need static ad graphics - specifically retargeting ads with a special offer to convert visitors.",
      },
    ],
  },
  {
    category: "Branding",
    icon: PenTool,
    color: "violet",
    templates: [
      {
        title: "Logo Variations",
        prompt: "I need UI/UX design work - specifically logo variations for different use cases (primary, icon-only, single-color).",
      },
      {
        title: "Brand Guidelines",
        prompt: "I need UI/UX design work - specifically a brand guidelines document showing logo usage, colors, and typography.",
      },
      {
        title: "Business Card",
        prompt: "I need static ad graphics - specifically a professional business card design with our brand identity.",
      },
      {
        title: "Email Signature",
        prompt: "I need UI/UX design work - specifically an email signature design with logo and contact details.",
      },
    ],
  },
  {
    category: "Marketing",
    icon: LayoutGrid,
    color: "amber",
    templates: [
      {
        title: "Email Newsletter",
        prompt: "I need UI/UX design work - specifically an email newsletter template that's mobile-responsive and on-brand.",
      },
      {
        title: "Landing Page Hero",
        prompt: "I need UI/UX design work - specifically a landing page hero section with headline, CTA, and hero image.",
      },
      {
        title: "Presentation Deck",
        prompt: "I need static ad graphics - specifically a presentation template with title, content, and closing slides.",
      },
      {
        title: "Infographic",
        prompt: "I need static ad graphics - specifically an infographic to visualize data in an easy-to-understand way.",
      },
    ],
  },
];

// Brand asset display component
const BrandAssetCard = ({
  brand,
  type,
}: {
  brand: BrandData | null;
  type: "logo" | "primary" | "secondary" | "accent" | "fonts";
}) => {
  const companyInitial = brand?.name?.charAt(0)?.toUpperCase() || "C";

  switch (type) {
    case "logo":
      return (
        <div className="flex flex-col items-center gap-2">
          {brand?.logoUrl ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-border/50">
              <img
                src={brand.logoUrl}
                alt="Logo"
                className="object-cover w-full h-full"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-muted border border-border/50 flex items-center justify-center">
              <span className="text-muted-foreground font-semibold text-lg">
                {companyInitial}
              </span>
            </div>
          )}
          <span className="text-xs text-muted-foreground">Logo</span>
        </div>
      );
    case "primary":
      return (
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg border border-border/30 shadow-sm"
            style={{ backgroundColor: brand?.primaryColor || "#e5e5e5" }}
          />
          <span className="text-xs text-muted-foreground">Primary</span>
        </div>
      );
    case "secondary":
      return (
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg border border-border/30 shadow-sm"
            style={{ backgroundColor: brand?.secondaryColor || "#d4d4d4" }}
          />
          <span className="text-xs text-muted-foreground">Secondary</span>
        </div>
      );
    case "accent":
      return (
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg border border-border/30 shadow-sm"
            style={{ backgroundColor: brand?.accentColor || "#c4c4c4" }}
          />
          <span className="text-xs text-muted-foreground">Accent</span>
        </div>
      );
    case "fonts":
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-muted border border-border/50 flex items-center justify-center">
            <span
              className="text-foreground/80 text-lg font-semibold"
              style={{ fontFamily: brand?.primaryFont || "Inter" }}
            >
              Aa
            </span>
          </div>
          <span className="text-xs text-muted-foreground">Fonts</span>
        </div>
      );
    default:
      return null;
  }
};


function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(PROMPT_TEMPLATES[0].category);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [recentChats, setRecentChats] = useState<ChatDraft[]>([]);
  const [recentTasks, setRecentTasks] = useState<Array<{ id: string; title: string; status: string; createdAt: string }>>([]);
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const userName = session?.user?.name?.split(" ")[0] || "there";

  useEffect(() => {
    const payment = searchParams.get("payment");
    const creditsParam = searchParams.get("credits");

    if (payment === "success" && creditsParam) {
      toast.success(`Successfully purchased ${creditsParam} credits!`);
    } else if (payment === "cancelled") {
      toast.info("Payment was cancelled");
    }

    // Fetch credits
    fetch("/api/user/credits")
      .then((res) => res.json())
      .then((data) => setCredits(data.credits))
      .catch(console.error);

    // Fetch brand data
    fetch("/api/brand")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setBrandData(data.data);
        }
      })
      .catch(console.error);

    // Fetch recent tasks
    fetch("/api/tasks?limit=5")
      .then((res) => res.json())
      .then((data) => {
        if (data.tasks) {
          setRecentTasks(data.tasks);
        }
      })
      .catch(console.error);

    // Load chat drafts
    setRecentChats(getDrafts().slice(0, 5));
  }, [searchParams]);

  // Auto-resize textarea when template is selected
  useEffect(() => {
    if (inputRef.current && chatInput) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + 'px';
    }
  }, [chatInput]);

  // Credit indicator colors
  const getCreditColor = () => {
    if (credits === null) return { dot: "bg-gray-500", text: "text-muted-foreground" };
    if (credits === 0) return { dot: "bg-red-500", text: "text-red-500" };
    if (credits <= 2) return { dot: "bg-yellow-500", text: "text-yellow-500" };
    return { dot: "bg-green-500", text: "text-green-500" };
  };
  const creditColors = getCreditColor();

  // File upload logic
  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = fileArray.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "attachments");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || errorData.message || "Upload failed");
        }

        const data = await response.json();
        return data.file as UploadedFile;
      });

      const newFiles = await Promise.all(uploadPromises);
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) uploaded successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
  };

  const removeFile = (fileUrl: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.fileUrl !== fileUrl));
  };

  const handleSubmit = async (message?: string) => {
    const finalMessage = message || chatInput.trim();
    if ((!finalMessage && uploadedFiles.length === 0) || isSending) return;

    if (credits === 0) {
      setShowCreditDialog(true);
      return;
    }

    setIsSending(true);

    // Store files in sessionStorage for the chat page to pick up
    if (uploadedFiles.length > 0) {
      sessionStorage.setItem("pending_chat_files", JSON.stringify(uploadedFiles));
    }
    setUploadedFiles([]);
    setChatInput("");

    router.push(`/dashboard/chat?message=${encodeURIComponent(finalMessage || `Attached ${uploadedFiles.length} file(s)`)}`);
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-foreground" />;
    if (fileType?.startsWith("video/")) return <FileVideo className="h-5 w-5 text-foreground" />;
    if (fileType === "application/pdf") return <FileText className="h-5 w-5 text-foreground" />;
    if (fileType?.includes("zip") || fileType?.includes("archive")) return <FileArchive className="h-5 w-5 text-foreground" />;
    return <File className="h-5 w-5 text-foreground" />;
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
      ASSIGNED: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
      IN_PROGRESS: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
      IN_REVIEW: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
      COMPLETED: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
    };
    return statusColors[status] || "bg-muted text-muted-foreground";
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div
      className="relative flex flex-col min-h-full px-6 md:px-10 py-10 bg-background overflow-auto"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
        accept="image/*,video/*,.pdf,.zip,.rar,.pptx,.ppt,.doc,.docx,.ai,.eps,.psd"
      />

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <p className="text-xl font-medium text-foreground">Drop files here</p>
              <p className="text-sm text-muted-foreground mt-2">Images, videos, PDFs, and more</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section - Chat as Main CTA */}
      <div className="flex flex-col items-center text-center mb-12 pt-6">
        {/* Welcome Header */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Welcome back, {userName}!
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-8">
          What would you like to create today?
        </p>

        {/* Main Chat Input - Hero CTA */}
        <div className="w-full max-w-3xl">
          <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-card shadow-xl shadow-primary/5 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
            {/* Uploaded files preview */}
            {uploadedFiles.length > 0 && (
              <div className="px-4 py-3 border-b border-border/50">
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.filter(Boolean).map((file) => (
                    <div
                      key={file.fileUrl}
                      className="relative group flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/50"
                    >
                      {file.fileType?.startsWith("image/") ? (
                        <img
                          src={file.fileUrl}
                          alt={file.fileName}
                          className="h-6 w-6 rounded object-cover"
                        />
                      ) : (
                        <span className="[&>svg]:h-4 [&>svg]:w-4">{getFileIcon(file.fileType)}</span>
                      )}
                      <span className="text-xs max-w-[120px] truncate text-foreground">
                        {file.fileName}
                      </span>
                      <button
                        onClick={() => removeFile(file.fileUrl)}
                        className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label="Remove file"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input Row */}
            <div className="relative flex items-start gap-2 px-5 pt-4 pb-2">
              <textarea
                ref={inputRef}
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                  // Auto-resize textarea
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={uploadedFiles.length > 0 ? "Add a message or just send..." : "Describe what you want to create..."}
                className="flex-1 bg-transparent py-1 text-foreground placeholder:text-muted-foreground focus:outline-none text-base resize-none min-h-[28px] max-h-[150px]"
                rows={1}
              />
              <button
                onClick={() => handleSubmit()}
                disabled={isSending || isUploading || (!chatInput.trim() && uploadedFiles.length === 0)}
                className="p-2 bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 mt-0.5"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>

            {/* Toolbar Row */}
            <div className="flex items-center gap-1 px-4 pb-3 pt-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
              >
                <ImageIcon className="h-4 w-4" />
              </button>

              <div className="w-px h-4 bg-border mx-1" />

              {/* Improve Prompt button */}
              <button
                disabled={!chatInput.trim()}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Improve Prompt</span>
              </button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Credits indicator */}
              <button
                onClick={() => credits === 0 && setShowCreditDialog(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${creditColors.dot}`}></span>
                <span>{credits === null ? "..." : credits} credits</span>
              </button>
            </div>
          </div>
        </div>

        {/* Template Categories */}
        <div className="mt-8 w-full max-w-3xl">
          {/* Category Tabs */}
          <div className="flex justify-center gap-2 mb-4 overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PROMPT_TEMPLATES.map((cat) => {
              const isActive = selectedCategory === cat.category;
              const colorClasses = {
                blue: isActive ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30" : "",
                emerald: isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30" : "",
                violet: isActive ? "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/30" : "",
                amber: isActive ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30" : "",
              };

              return (
                <button
                  key={cat.category}
                  onClick={() => setSelectedCategory(cat.category)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap border transition-all ${
                    isActive
                      ? colorClasses[cat.color as keyof typeof colorClasses]
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-muted/50"
                  }`}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.category}
                </button>
              );
            })}
          </div>

          {/* Template Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROMPT_TEMPLATES.find(c => c.category === selectedCategory)?.templates.map((template, idx) => {
              const currentCategory = PROMPT_TEMPLATES.find(c => c.category === selectedCategory);
              const categoryColor = currentCategory?.color || "emerald";
              const bgClasses = {
                blue: "bg-blue-50 dark:bg-blue-500/10",
                emerald: "bg-emerald-50 dark:bg-emerald-500/10",
                violet: "bg-violet-50 dark:bg-violet-500/10",
                amber: "bg-amber-50 dark:bg-amber-500/10",
              };
              const iconClasses = {
                blue: "text-blue-600 dark:text-blue-400",
                emerald: "text-emerald-600 dark:text-emerald-400",
                violet: "text-violet-600 dark:text-violet-400",
                amber: "text-amber-600 dark:text-amber-400",
              };
              const hoverClasses = {
                blue: "hover:border-blue-300 dark:hover:border-blue-500/40",
                emerald: "hover:border-emerald-300 dark:hover:border-emerald-500/40",
                violet: "hover:border-violet-300 dark:hover:border-violet-500/40",
                amber: "hover:border-amber-300 dark:hover:border-amber-500/40",
              };

              return (
                <button
                  key={idx}
                  onClick={() => {
                    setChatInput(template.prompt);
                    inputRef.current?.focus();
                  }}
                  className={`group flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-card text-left transition-all duration-200 ${hoverClasses[categoryColor as keyof typeof hoverClasses]} hover:shadow-md`}
                >
                  <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${bgClasses[categoryColor as keyof typeof bgClasses]}`}>
                    {currentCategory?.icon && <currentCategory.icon className={`h-5 w-5 ${iconClasses[categoryColor as keyof typeof iconClasses]}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-foreground mb-0.5 group-hover:text-primary transition-colors">
                      {template.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.prompt}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Brand Assets Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Your Brand</h2>
          <Link
            href="/dashboard/brand"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Manage brand →
          </Link>
        </div>
        <Link
          href="/dashboard/brand"
          className="group block rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-md transition-all bg-card overflow-hidden"
        >
          <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-6">
              {/* Brand assets in a row */}
              <div className="flex items-center gap-6 md:gap-8">
                <BrandAssetCard brand={brandData} type="logo" />
                <div className="w-px h-12 bg-border/50 hidden sm:block" />
                <BrandAssetCard brand={brandData} type="primary" />
                <BrandAssetCard brand={brandData} type="secondary" />
                <BrandAssetCard brand={brandData} type="accent" />
                <div className="w-px h-12 bg-border/50 hidden sm:block" />
                <BrandAssetCard brand={brandData} type="fonts" />
              </div>

              {/* Arrow on hover */}
              <div className="hidden md:flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors">
                <span className="text-sm">Edit</span>
                <Download className="w-4 h-4 -rotate-90" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Items Section */}
      {(recentChats.length > 0 || recentTasks.length > 0) && (
        <div className="w-full">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent</h2>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-5">Name</div>
              <div className="col-span-3">Type</div>
              <div className="col-span-3">Created</div>
              <div className="col-span-1"></div>
            </div>

            {/* Chat Drafts */}
            {recentChats.map((chat) => (
              <Link
                key={chat.id}
                href={`/dashboard/chat?draft=${chat.id}`}
                className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors items-center"
              >
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{chat.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Last edited {formatDate(chat.updatedAt)}
                    </p>
                  </div>
                </div>
                <div className="col-span-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Chat
                  </span>
                </div>
                <div className="col-span-3 text-sm text-muted-foreground">
                  {formatDate(chat.createdAt)}
                </div>
                <div className="col-span-1 flex justify-end">
                  <button className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </Link>
            ))}

            {/* Tasks */}
            {recentTasks.map((task) => (
              <Link
                key={task.id}
                href={`/dashboard/tasks/${task.id}`}
                className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors items-center"
              >
                <div className="col-span-5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatStatus(task.status)}
                    </p>
                  </div>
                </div>
                <div className="col-span-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(task.status)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                    Task
                  </span>
                </div>
                <div className="col-span-3 text-sm text-muted-foreground">
                  {formatDate(task.createdAt)}
                </div>
                <div className="col-span-1 flex justify-end">
                  <button className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </Link>
            ))}

            {/* Empty state */}
            {recentChats.length === 0 && recentTasks.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent items yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Credit Purchase Dialog */}
      <CreditPurchaseDialog
        open={showCreditDialog}
        onOpenChange={setShowCreditDialog}
        currentCredits={credits || 0}
        requiredCredits={1}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col min-h-full px-6 md:px-10 py-10 bg-background">
      <div className="mb-8">
        <Skeleton className="h-10 w-72 mb-2" />
        <Skeleton className="h-6 w-56" />
      </div>
      <Skeleton className="h-32 w-full max-w-3xl rounded-2xl mb-6" />
      <div className="flex gap-2 mb-12">
        <Skeleton className="h-10 w-48 rounded-full" />
        <Skeleton className="h-10 w-44 rounded-full" />
        <Skeleton className="h-10 w-52 rounded-full" />
      </div>
      <Skeleton className="h-6 w-24 mb-4" />
      <Skeleton className="h-[88px] w-full rounded-xl mb-12" />
      <Skeleton className="h-6 w-24 mb-4" />
      <Skeleton className="h-48 w-full rounded-xl" />
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
