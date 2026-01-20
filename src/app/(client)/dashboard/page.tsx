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

// Example prompts with preview images - show users what they can create
const EXAMPLE_PROMPTS = [
  {
    prompt: "Instagram carousel for a product launch",
    image: "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=400&h=300&fit=crop",
  },
  {
    prompt: "Logo for a modern coffee shop",
    image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=300&fit=crop",
  },
  {
    prompt: "YouTube thumbnail for a tech review",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop",
  },
  {
    prompt: "Ad banner for a summer sale",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&h=300&fit=crop",
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

    // Don't check credits here - let users start chatting freely
    // Payment is only required when confirming/submitting the actual task

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

  const handleTemplateClick = (prompt: string) => {
    setChatInput(prompt);
    inputRef.current?.focus();
    // Place cursor at the end of the prompt
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.selectionStart = inputRef.current.selectionEnd = prompt.length;
      }
    }, 0);
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
      <div className="flex flex-col items-center px-4 sm:px-6 pt-20 sm:pt-32 md:pt-40 pb-8">
        {/* Welcome Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground mb-2">
            Welcome back,{" "}
            <span className="relative inline-block">
              {userName}
              <svg
                className="absolute -bottom-1 left-0 w-full h-3 text-foreground"
                viewBox="0 0 100 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 6C15 4.5 25 7 40 5C55 3 65 6.5 80 5C90 4 95 6 97 5.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            !
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
            What would you like to create{" "}
            <span className="font-semibold text-foreground">today</span>?
          </p>
        </div>

        {/* Main Input Card */}
        <div className="w-full max-w-2xl mb-4 sm:mb-6">
          <div className="bg-white dark:bg-card rounded-xl sm:rounded-2xl border border-border shadow-lg overflow-hidden">
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
            <div className="px-3 sm:px-5 pt-3 sm:pt-4 pb-2">
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
            <div className="flex items-center justify-between gap-2 px-3 sm:px-4 pb-3 sm:pb-4 pt-2">
              {/* Left side - attachment icons */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="p-1.5 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
                  title="Attach file"
                >
                  {isUploading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="hidden sm:block p-1.5 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-50"
                  title="Add image"
                >
                  <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>

                <div className="w-px h-4 sm:h-5 bg-border mx-1.5 sm:mx-2" />

                {/* Credits indicator */}
                <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-muted-foreground">
                  <span
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                      credits === null
                        ? "bg-gray-400"
                        : credits === 0
                          ? "bg-red-500"
                          : credits <= 2
                            ? "bg-yellow-500"
                            : "bg-green-500"
                    }`}
                  />
                  <span>{credits === null ? "..." : credits} <span className="hidden sm:inline">credits</span></span>
                </div>
              </div>

              {/* Right side - Improve Prompt + Submit */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  disabled={!chatInput.trim()}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm sm:text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Submit</span>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Example Prompts - show users what they can create */}
        <div className="w-full max-w-3xl mb-8 sm:mb-12 px-4">
          <p className="text-center text-sm text-muted-foreground mb-4">Try an example</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example.prompt}
                onClick={() => handleTemplateClick(example.prompt)}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-white dark:bg-card hover:shadow-lg hover:border-foreground/20 transition-all"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={example.image}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3 text-left">
                  <p className="text-xs sm:text-sm text-foreground leading-snug">{example.prompt}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inspiration Gallery */}
      {styleReferences.length > 0 && (
        <div className="relative w-full bg-background pt-4">
          {/* Masonry Grid */}
          <div className="relative pb-8">
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
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none z-10" />
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
