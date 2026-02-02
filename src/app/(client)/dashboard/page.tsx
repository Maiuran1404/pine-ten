"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageWithSkeleton, MasonryGridSkeleton } from "@/components/ui/skeletons";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  Image as ImageIcon,
  Upload,
  FileText,
  FileVideo,
  FileArchive,
  File,
  X,
  Share2,
  Megaphone,
  Search,
  Presentation,
  Palette,
} from "lucide-react";
import { CreditPurchaseDialog } from "@/components/shared/credit-purchase-dialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
  contentCategory?: string;
  colorTemperature?: string;
}

// Template categories and sub-options based on service offerings
const TEMPLATE_CATEGORIES = {
  "Launch Videos": {
    icon: Megaphone,
    description: "Product videos that convert",
    modalDescription: "Pick one and add some notes, we'll help you with writing the prompts!",
    options: [
      {
        title: "Product Launch Video",
        description: "30-60 second cinematic video showcasing your product",
        prompt: "Create a product launch video",
      },
      {
        title: "Feature Highlight",
        description: "Focus on a key feature with engaging visuals",
        prompt: "Create a feature highlight video",
      },
      {
        title: "App Walkthrough",
        description: "Screen recording style demo of your app flow",
        prompt: "Create an app walkthrough video",
      },
    ],
  },
  "Pitch Deck": {
    icon: Presentation,
    description: "Investor-ready presentations",
    modalDescription: "Pick one and add some notes, we'll help you with writing the prompts!",
    options: [
      {
        title: "Investor Pitch Deck",
        description: "Professional deck designed to impress investors",
        prompt: "Redesign my investor pitch deck",
      },
      {
        title: "Sales Deck",
        description: "Compelling presentation for sales meetings",
        prompt: "Create a sales presentation deck",
      },
      {
        title: "Company Overview",
        description: "Clean company introduction deck",
        prompt: "Design a company overview presentation",
      },
    ],
  },
  "Branding": {
    icon: Palette,
    description: "Complete visual identity",
    modalDescription: "Pick one and add some notes, we'll help you with writing the prompts!",
    options: [
      {
        title: "Full Brand Package",
        description: "Logo, colors, typography, and brand guidelines",
        prompt: "Create a full brand package with logo and visual identity",
      },
      {
        title: "Logo Design",
        description: "Custom logo with variations and usage guidelines",
        prompt: "Design a logo for my brand",
      },
      {
        title: "Brand Refresh",
        description: "Modernize your existing brand identity",
        prompt: "Refresh and modernize my existing brand",
      },
    ],
  },
  "Social Media": {
    icon: Share2,
    description: "Ads, content & video edits",
    modalDescription: "Pick one and add some notes, we'll help you with writing the prompts!",
    options: [
      {
        title: "Instagram Post",
        description: "Most used category in 3:4 format",
        prompt: "Create Instagram post designs",
      },
      {
        title: "Instagram Story",
        description: "Adjusted for your brand in 9:16 format",
        prompt: "Create Instagram story designs",
      },
      {
        title: "Instagram Reels",
        description: "Customized video for your brand at 60 fps in 9:16 format",
        prompt: "Create an Instagram Reels video",
      },
      {
        title: "LinkedIn Content",
        description: "Professional posts and carousels for B2B",
        prompt: "Create LinkedIn content",
      },
      {
        title: "Video Edit",
        description: "Transform your raw footage into engaging content",
        prompt: "Edit my video footage for social media",
      },
      {
        title: "Ad Creatives",
        description: "High-converting ads for any platform",
        prompt: "Create social media ad creatives",
      },
    ],
  },
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
  const [styleReferences, setStyleReferences] = useState<StyleReference[]>([]);
  const [isLoadingStyles, setIsLoadingStyles] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [modalNotes, setModalNotes] = useState("");
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

    // Fetch brand-matched style references (increased limit for all categories)
    setIsLoadingStyles(true);
    fetch("/api/style-references/match?limit=150")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.data) {
          setStyleReferences(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingStyles(false));
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
      className="relative min-h-screen"
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
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">
            Welcome back,{" "}
            <span className="relative inline-block">
              {userName}!
              <svg
                className="absolute -bottom-1 left-0 w-full h-2.5 text-emerald-500"
                viewBox="0 0 100 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 4C10 2 20 6 30 4C40 2 50 6 60 4C70 2 80 6 90 4C95 3 100 5 100 4"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            What would you like to create{" "}
            <span className="italic font-medium text-foreground">today</span>?
          </p>
        </div>

        {/* Main Input Card */}
        <div className="w-full max-w-3xl mb-6 sm:mb-8">
          <div className="bg-white dark:bg-card/60 backdrop-blur-xl rounded-2xl border border-border/40 shadow-xl shadow-black/5 overflow-hidden">
            {/* Uploaded files preview */}
            {uploadedFiles.length > 0 && (
              <div className="px-5 py-3 border-b border-border/30">
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.filter(Boolean).map((file) => (
                    <div
                      key={file.fileUrl}
                      className="relative group flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50"
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
                      <span className="text-sm max-w-[150px] truncate text-foreground">
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
            <div className="px-5 sm:px-6 pt-5 pb-3">
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
                className="w-full bg-transparent py-1 text-foreground placeholder:text-muted-foreground/70 focus:outline-none text-base resize-none min-h-[32px] max-h-[150px]"
                rows={1}
              />
            </div>

            {/* Toolbar Row */}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 pb-4 pt-2">
              {/* Left side - attachment icons and credits */}
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

                <div className="w-px h-5 bg-border/60 mx-2" />

                {/* Credits indicator */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {credits === null ? (
                    <Skeleton className="h-4 w-28" />
                  ) : (
                    <>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          credits === 0
                            ? "bg-red-500"
                            : credits <= 2
                              ? "bg-yellow-500"
                              : "bg-emerald-500"
                        }`}
                      />
                      <span>{credits} credits available</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right side - Submit */}
              <button
                onClick={() => handleSubmit()}
                disabled={
                  isSending ||
                  isUploading ||
                  (!chatInput.trim() && uploadedFiles.length === 0)
                }
                className="flex items-center justify-center px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
              >
                <span>Submit</span>
              </button>
            </div>
          </div>
        </div>

        {/* Template System - Category Cards */}
        <div className="w-full max-w-4xl mb-8 px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {Object.entries(TEMPLATE_CATEGORIES).map(([category, { icon: Icon, description }]) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  setSelectedOption(null);
                  setModalNotes("");
                }}
                className="group flex flex-col items-center text-center p-4 sm:p-5 rounded-2xl border border-border/40 bg-white/80 dark:bg-card/50 backdrop-blur-xl hover:bg-white dark:hover:bg-card/70 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-200"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all duration-200">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="font-medium text-sm text-foreground mb-1">{category}</span>
                <span className="text-xs text-muted-foreground leading-tight hidden sm:block">{description}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Options Modal */}
      <Dialog
        open={!!selectedCategory}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCategory(null);
            setSelectedOption(null);
            setModalNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden bg-background rounded-2xl border-0 shadow-2xl">
          {selectedCategory && (() => {
            const category = TEMPLATE_CATEGORIES[selectedCategory as keyof typeof TEMPLATE_CATEGORIES];
            const Icon = category?.icon;
            return (
              <>
                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/25">
                      {Icon && <Icon className="h-5 w-5 text-white" />}
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">{selectedCategory}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {category?.modalDescription}
                  </p>
                </div>

                {/* Options List */}
                <div className="px-3 pb-3 space-y-1.5 max-h-[280px] overflow-y-auto">
                  {category?.options.map((option, index) => {
                    const isSelected = selectedOption === option.title;
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedOption(isSelected ? null : option.title)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 text-left border-2 ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-500/10"
                            : "border-transparent hover:bg-muted/60"
                        }`}
                      >
                        {/* Selection indicator */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-muted-foreground/30"
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-medium text-[15px] mb-0.5 transition-colors ${
                            isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
                          }`}>{option.title}</h3>
                          <p className="text-sm text-muted-foreground leading-snug">{option.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Notes Input Section */}
                <div className="px-4 pb-5 pt-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && selectedOption) {
                          const option = category?.options.find(o => o.title === selectedOption);
                          if (option) {
                            const prompt = modalNotes
                              ? `${option.prompt}. Notes: ${modalNotes}`
                              : option.prompt;
                            handleSubmit(prompt);
                            setSelectedCategory(null);
                            setSelectedOption(null);
                            setModalNotes("");
                          }
                        }
                      }}
                      placeholder="Add any specific details or requirements..."
                      className="w-full h-12 px-4 pr-32 rounded-xl border border-border/60 bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 text-sm transition-all"
                    />
                    <button
                      onClick={() => {
                        if (selectedOption) {
                          const option = category?.options.find(o => o.title === selectedOption);
                          if (option) {
                            const prompt = modalNotes
                              ? `${option.prompt}. Notes: ${modalNotes}`
                              : option.prompt;
                            handleSubmit(prompt);
                            setSelectedCategory(null);
                            setSelectedOption(null);
                            setModalNotes("");
                          }
                        }
                      }}
                      disabled={!selectedOption}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-muted disabled:text-muted-foreground/50 text-white rounded-lg font-medium transition-all duration-200 text-sm disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Inspiration Gallery - Grouped by Content Type */}
      {(isLoadingStyles || styleReferences.length > 0) && (
        <div className="relative w-full pt-8">
          {/* Continue to explore section */}
          <div className="flex items-center justify-center mb-10">
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/50 bg-white/60 dark:bg-card/40 backdrop-blur-lg hover:bg-white/80 dark:hover:bg-card/60 transition-all text-sm text-muted-foreground hover:text-foreground">
              <Search className="h-4 w-4" />
              <span>Continue to explore...</span>
            </button>
          </div>

          {/* Grouped Masonry Grid */}
          <div className="relative pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              {/* Show skeleton while loading */}
              {isLoadingStyles ? (
                <MasonryGridSkeleton count={15} columns={5} showHeader={true} />
              ) : (
              /* Group references by contentCategory */
              (() => {
                const groups = styleReferences.reduce((acc, ref) => {
                  const group = ref.contentCategory || "other";
                  if (!acc[group]) acc[group] = [];
                  acc[group].push(ref);
                  return acc;
                }, {} as Record<string, StyleReference[]>);

                const groupLabels: Record<string, { label: string; icon: string }> = {
                  instagram_post: { label: "Popular Instagram posts", icon: "📱" },
                  instagram_story: { label: "Popular Instagram stories", icon: "📲" },
                  instagram_reel: { label: "Popular Instagram reels", icon: "🎬" },
                  linkedin_post: { label: "Popular LinkedIn posts", icon: "💼" },
                  linkedin_banner: { label: "Popular LinkedIn banners", icon: "🖼️" },
                  static_ad: { label: "Popular static ads", icon: "🎯" },
                  facebook_ad: { label: "Popular Facebook ads", icon: "👥" },
                  twitter_post: { label: "Popular Twitter posts", icon: "🐦" },
                  youtube_thumbnail: { label: "Popular YouTube thumbnails", icon: "▶️" },
                  email_header: { label: "Popular email headers", icon: "📧" },
                  web_banner: { label: "Popular web banners", icon: "🌐" },
                  presentation_slide: { label: "Popular presentation slides", icon: "📊" },
                  video_ad: { label: "Popular video ads", icon: "🎥" },
                  other: { label: "More inspiration", icon: "💡" },
                };

                const orderedGroups = [
                  "instagram_post",
                  "instagram_story",
                  "linkedin_post",
                  "static_ad",
                  "facebook_ad",
                  "instagram_reel",
                  "twitter_post",
                  "youtube_thumbnail",
                  "linkedin_banner",
                  "email_header",
                  "web_banner",
                  "presentation_slide",
                  "video_ad",
                  "other",
                ];

                return orderedGroups.map((groupKey, groupIndex) => {
                  const allRefs = groups[groupKey];
                  if (!allRefs || allRefs.length === 0) return null;

                  // Limit to 15 items per category for cleaner display
                  const refs = allRefs.slice(0, 15);
                  const { label, icon } = groupLabels[groupKey] || { label: groupKey, icon: "📌" };

                  return (
                    <div key={groupKey} className="mb-12">
                      {/* Group Header */}
                      <div className={`flex items-center gap-3 mb-5 ${groupIndex > 0 ? "mt-10" : ""}`}>
                        <span className="text-base">{icon}</span>
                        <h3 className="text-sm font-medium text-foreground">
                          {label}
                        </h3>
                        <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent ml-2" />
                        <span className="text-xs text-muted-foreground">
                          {allRefs.length} {allRefs.length === 1 ? 'style' : 'styles'}
                        </span>
                      </div>
                      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
                        {refs.map((ref) => {
                          const variantUrls = getImageVariantUrls(ref.imageUrl);
                          return (
                            <div
                              key={ref.id}
                              className="break-inside-avoid rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                            >
                              <ImageWithSkeleton
                                src={variantUrls.preview}
                                alt={ref.name}
                                className="w-full"
                                skeletonClassName="bg-muted/30 min-h-[150px]"
                                loading="lazy"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })())}
            </div>

            {/* Fade overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none z-10" />
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
    <div className="flex flex-col items-center min-h-screen px-6 pt-32 md:pt-40 pb-8">
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
