"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  ArrowRight,
  Sparkles,
  Image as ImageIcon,
  Upload,
  FileText,
  FileVideo,
  FileArchive,
  File,
  X,
  Megaphone,
  Share2,
  PenTool,
  LayoutGrid,
  Search,
} from "lucide-react";
import { CreditPurchaseDialog } from "@/components/shared/credit-purchase-dialog";
import { LoadingSpinner } from "@/components/shared/loading";
import { useSession } from "@/lib/auth-client";
import { getImageVariantUrls } from "@/lib/image/utils";

interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

interface StyleReference {
  id: string;
  name: string;
  imageUrl: string;
  deliverableType: string | null;
  styleAxis: string | null;
}

// Prompt templates organized by category
const PROMPT_TEMPLATES = [
  {
    category: "Social Media",
    icon: Share2,
    color: "blue",
  },
  {
    category: "Advertising",
    icon: Megaphone,
    color: "emerald",
  },
  {
    category: "Branding",
    icon: PenTool,
    color: "violet",
  },
  {
    category: "Marketing",
    icon: LayoutGrid,
    color: "amber",
  },
];

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
  const [styleReferences, setStyleReferences] = useState<StyleReference[]>([]);
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

    // Fetch brand-matched style references
    fetch("/api/style-references/match?limit=24")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setStyleReferences(data.data);
        }
      })
      .catch(console.error);
  }, [searchParams]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current && chatInput) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height =
        Math.min(inputRef.current.scrollHeight, 150) + "px";
    }
  }, [chatInput]);

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
          throw new Error(
            errorData.error?.message || errorData.message || "Upload failed"
          );
        }

        const data = await response.json();
        return data.file as UploadedFile;
      });

      const newFiles = await Promise.all(uploadPromises);
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) uploaded successfully`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload files"
      );
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

    router.push(
      `/dashboard/chat?message=${encodeURIComponent(finalMessage || `Attached ${uploadedFiles.length} file(s)`)}`
    );
  };

  const handleCategoryClick = (category: string) => {
    const prompts: Record<string, string> = {
      "Social Media": "I need social media content",
      Advertising: "I need advertising content",
      Branding: "I need branding materials",
      Marketing: "I need marketing materials",
    };
    setChatInput(prompts[category] || "");
    inputRef.current?.focus();
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith("image/"))
      return <ImageIcon className="h-5 w-5 text-foreground" />;
    if (fileType?.startsWith("video/"))
      return <FileVideo className="h-5 w-5 text-foreground" />;
    if (fileType === "application/pdf")
      return <FileText className="h-5 w-5 text-foreground" />;
    if (fileType?.includes("zip") || fileType?.includes("archive"))
      return <FileArchive className="h-5 w-5 text-foreground" />;
    return <File className="h-5 w-5 text-foreground" />;
  };

  return (
    <div
      className="relative min-h-screen bg-background"
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
              <p className="text-xl font-medium text-foreground">
                Drop files here
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Images, videos, PDFs, and more
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-col items-center px-6 pt-32 md:pt-40 pb-8">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-2">
            Welcome back,{" "}
            <span className="underline decoration-2 underline-offset-4">
              {userName}
            </span>
            !
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            What would you like to create{" "}
            <span className="font-semibold text-foreground">today</span>?
          </p>
        </div>

        {/* Main Input Card */}
        <div className="w-full max-w-2xl mb-6">
          <div className="bg-white dark:bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
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
                        <span className="[&>svg]:h-4 [&>svg]:w-4">
                          {getFileIcon(file.fileType)}
                        </span>
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

            {/* Text Input Area */}
            <div className="px-5 pt-4 pb-2">
              <textarea
                ref={inputRef}
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 150) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={
                  uploadedFiles.length > 0
                    ? "Add a message or just send..."
                    : "Describe what you want to create..."
                }
                className="w-full bg-transparent py-1 text-foreground placeholder:text-muted-foreground focus:outline-none text-base resize-none min-h-[28px] max-h-[150px]"
                rows={1}
              />
            </div>

            {/* Toolbar Row */}
            <div className="flex items-center justify-between gap-2 px-4 pb-4 pt-2">
              {/* Left side - attachment icons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
                  title="Attach file"
                >
                  {isUploading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
                  title="Add image"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>

                <div className="w-px h-5 bg-border mx-2" />

                {/* Credits indicator */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      credits === null
                        ? "bg-gray-400"
                        : credits === 0
                          ? "bg-red-500"
                          : credits <= 2
                            ? "bg-yellow-500"
                            : "bg-green-500"
                    }`}
                  />
                  <span>{credits === null ? "..." : credits} credits</span>
                </div>
              </div>

              {/* Right side - Improve Prompt + Submit */}
              <div className="flex items-center gap-2">
                <button
                  disabled={!chatInput.trim()}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Improve Prompt</span>
                </button>

                <button
                  onClick={() => handleSubmit()}
                  disabled={
                    isSending ||
                    isUploading ||
                    (!chatInput.trim() && uploadedFiles.length === 0)
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Submit</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {PROMPT_TEMPLATES.map((cat) => {
            const Icon = cat.icon;
            const colorClasses = {
              blue: "hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:border-blue-500/30 dark:hover:text-blue-400",
              emerald:
                "hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-500/30 dark:hover:text-emerald-400",
              violet:
                "hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 dark:hover:bg-violet-500/10 dark:hover:border-violet-500/30 dark:hover:text-violet-400",
              amber:
                "hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 dark:hover:bg-amber-500/10 dark:hover:border-amber-500/30 dark:hover:text-amber-400",
            };

            return (
              <button
                key={cat.category}
                onClick={() => handleCategoryClick(cat.category)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-white dark:bg-card text-muted-foreground text-sm font-medium transition-all ${colorClasses[cat.color as keyof typeof colorClasses]}`}
              >
                <Icon className="h-4 w-4" />
                {cat.category}
              </button>
            );
          })}
        </div>
      </div>

      {/* Continue to explore section - outside main container for full width gradient */}
      {styleReferences.length > 0 && (
        <div className="relative w-full">
          {/* Gradient transition area */}
          <div className="relative h-40 bg-gradient-to-b from-white via-gray-100/80 to-gray-200/60 dark:from-background dark:via-zinc-900/80 dark:to-zinc-800/60">
            {/* Centered pill button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="flex items-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-card border border-gray-200 dark:border-border shadow-md text-gray-500 dark:text-muted-foreground text-sm font-medium hover:text-gray-700 dark:hover:text-foreground hover:shadow-lg transition-all">
                <Search className="h-4 w-4" />
                <span>Continue to explore...</span>
              </button>
            </div>
          </div>

          {/* Masonry Grid */}
          <div className="relative bg-gray-200/60 dark:bg-zinc-800/60 pb-8">
            <div className="max-w-6xl mx-auto px-6">
              <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3">
                {styleReferences.map((ref) => {
                  const variantUrls = getImageVariantUrls(ref.imageUrl);
                  return (
                    <div
                      key={ref.id}
                      className="break-inside-avoid rounded-xl overflow-hidden shadow-sm"
                    >
                      <img
                        src={variantUrls.preview}
                        alt={ref.name}
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fade overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-gray-200/60 via-gray-200/40 to-transparent dark:from-zinc-800/60 dark:via-zinc-800/40 pointer-events-none z-10" />
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
    <div className="flex flex-col items-center min-h-screen px-6 pt-32 md:pt-40 pb-8 bg-background">
      <div className="text-center mb-8">
        <Skeleton className="h-10 w-72 mx-auto mb-2" />
        <Skeleton className="h-6 w-56 mx-auto" />
      </div>
      <Skeleton className="h-36 w-full max-w-2xl rounded-2xl mb-6" />
      <div className="flex gap-2 mb-12">
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3 w-full max-w-6xl">
        {[...Array(15)].map((_, i) => (
          <Skeleton
            key={i}
            className="break-inside-avoid rounded-xl"
            style={{ height: `${150 + Math.random() * 100}px` }}
          />
        ))}
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
