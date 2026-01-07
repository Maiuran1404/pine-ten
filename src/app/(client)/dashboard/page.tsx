"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  ArrowUp,
  Video,
  Sparkles,
  Image as ImageIcon,
  Palette,
  Type,
  Layers,
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
  FileImage,
  Megaphone,
  Share2,
  PenTool,
  LayoutGrid,
  Mail,
  Presentation,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// Quick prompts as feature cards
const QUICK_PROMPTS = [
  {
    id: "static-ad",
    icon: ImageIcon,
    title: "Static Ad Design",
    description: "Create eye-catching banner ads and display creatives.",
    prompt: "I need a static ad design",
    color: "emerald",
  },
  {
    id: "video-ad",
    icon: Video,
    title: "Video Ad Creator",
    description: "Produce engaging video content for any platform.",
    prompt: "Create a video ad for me",
    color: "blue",
  },
  {
    id: "social-content",
    icon: Layers,
    title: "Social Media Content",
    description: "Design scroll-stopping posts and stories.",
    prompt: "Design social media content",
    color: "violet",
  },
];

// Brand asset cards
const DESIGN_ASSETS = [
  {
    id: "logo",
    title: "Logo Pack",
    fileCount: 12,
    gridClass: "col-span-1 md:col-span-5",
    visual: "logo",
  },
  {
    id: "colors",
    title: "Brand Colors",
    fileCount: 8,
    gridClass: "col-span-1 md:col-span-4",
    visual: "colors",
  },
  {
    id: "typography",
    title: "Typography",
    fileCount: 6,
    gridClass: "col-span-1 md:col-span-3",
    visual: "typography",
  },
];

const AssetVisual = ({
  type,
  brand,
}: {
  type: string;
  brand: BrandData | null;
}) => {
  const colors = brand?.brandColors?.length
    ? brand.brandColors
    : ([
        brand?.primaryColor,
        brand?.secondaryColor,
        brand?.accentColor,
        brand?.backgroundColor,
        brand?.textColor,
      ].filter(Boolean) as string[]);

  const primaryFont = brand?.primaryFont || "Inter";
  const secondaryFont = brand?.secondaryFont || "Inter";
  const logoUrl = brand?.logoUrl;
  const companyInitial = brand?.name?.charAt(0)?.toUpperCase() || "C";
  const primaryColor = brand?.primaryColor || "#6366f1";

  switch (type) {
    case "logo":
      return (
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <>
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden">
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={28}
                  height={28}
                  className="object-contain opacity-60"
                />
              </div>
            </>
          ) : (
            <>
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="text-white font-bold text-xl">
                  {companyInitial}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <span className="text-muted-foreground font-medium text-base">
                  {companyInitial}
                </span>
              </div>
            </>
          )}
        </div>
      );
    case "colors":
      return (
        <div className="flex items-center gap-2">
          {colors.length > 0 ? (
            colors
              .slice(0, 4)
              .map((color, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                />
              ))
          ) : (
            <>
              <div className="w-9 h-9 rounded-full bg-[#6366f1]" />
              <div className="w-9 h-9 rounded-full bg-[#8b5cf6]" />
              <div className="w-9 h-9 rounded-full bg-[#22c55e]" />
            </>
          )}
        </div>
      );
    case "typography":
      return (
        <div className="flex items-baseline gap-3">
          <span
            className="text-foreground text-2xl font-bold"
            style={{ fontFamily: primaryFont }}
          >
            Aa
          </span>
          <span
            className="text-muted-foreground text-lg"
            style={{ fontFamily: secondaryFont }}
          >
            Bb
          </span>
          <span
            className="text-muted-foreground/60 text-sm"
            style={{ fontFamily: primaryFont }}
          >
            Cc
          </span>
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
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [recentChats, setRecentChats] = useState<ChatDraft[]>([]);
  const [recentTasks, setRecentTasks] = useState<Array<{ id: string; title: string; status: string; createdAt: string }>>([]);
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
      .then((data) => setBrandData(data))
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
            <div className="relative flex items-center gap-2 px-5 pt-4 pb-2">
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={uploadedFiles.length > 0 ? "Add a message or just send..." : "Describe what you want to create..."}
                className="flex-1 bg-transparent py-1 text-foreground placeholder:text-muted-foreground focus:outline-none text-base"
              />
              <button
                onClick={() => handleSubmit()}
                disabled={isSending || isUploading || (!chatInput.trim() && uploadedFiles.length === 0)}
                className="p-2 bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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

              {/* Templates button */}
              <button
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Templates</span>
              </button>

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

        {/* Quick Prompts as Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 w-full max-w-3xl">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt.id}
              onClick={() => handleSubmit(prompt.prompt)}
              className="group flex flex-col rounded-lg border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden text-left"
            >
              {/* Illustration Area */}
              <div className={`h-20 flex items-center justify-center ${
                prompt.color === "emerald" ? "bg-emerald-50 dark:bg-emerald-500/10" :
                prompt.color === "blue" ? "bg-blue-50 dark:bg-blue-500/10" :
                "bg-violet-50 dark:bg-violet-500/10"
              }`}>
                <prompt.icon className={`w-8 h-8 opacity-80 group-hover:scale-110 transition-transform ${
                  prompt.color === "emerald" ? "text-emerald-600 dark:text-emerald-400" :
                  prompt.color === "blue" ? "text-blue-600 dark:text-blue-400" :
                  "text-violet-600 dark:text-violet-400"
                }`} />
              </div>

              {/* Content */}
              <div className="p-3">
                <h3 className="font-medium text-sm text-foreground mb-0.5">{prompt.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{prompt.description}</p>
              </div>
            </button>
          ))}
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {DESIGN_ASSETS.map((asset) => (
            <Link
              key={asset.id}
              href="/dashboard/brand"
              className={`group relative rounded-xl overflow-hidden border border-border hover:border-primary/30 transition-all cursor-pointer h-[120px] bg-card ${asset.gridClass}`}
            >
              <div className="p-4 h-full flex flex-col justify-between">
                {/* Visual Preview */}
                <div className="flex-1 flex items-center">
                  <AssetVisual type={asset.visual} brand={brandData} />
                </div>

                {/* Footer with title and file count */}
                <div className="flex items-end justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      {asset.title}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {asset.fileCount} files
                    </span>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </Link>
          ))}
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-12">
        <Skeleton className="h-[120px] rounded-xl col-span-5" />
        <Skeleton className="h-[120px] rounded-xl col-span-4" />
        <Skeleton className="h-[120px] rounded-xl col-span-3" />
      </div>
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
