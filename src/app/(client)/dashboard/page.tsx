"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageWithSkeleton, MasonryGridSkeleton } from "@/components/ui/skeletons";
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
import { FloatingBlobs } from "@/components/shared/floating-blobs";
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

// Template categories and prompts
const TEMPLATE_CATEGORIES = {
  "Social Media": {
    icon: "📱",
    templates: [
      "Create 30-day Instagram content calendar with daily posts",
      "Design LinkedIn carousel posts for thought leadership",
      "Generate Instagram Stories for product launch campaign",
      "Create Facebook ad creatives for e-commerce promotion",
      "Develop TikTok video concepts for brand awareness",
      "Design Pinterest pins for seasonal marketing",
    ],
  },
  "Video & Animation": {
    icon: "🎬",
    templates: [
      "Edit product demo video with professional transitions",
      "Create animated explainer video for SaaS product",
      "Design video ad for social media campaign",
      "Develop Instagram Reels content series",
      "Create YouTube thumbnail designs",
      "Edit testimonial video compilation",
    ],
  },
  "Branding": {
    icon: "🎨",
    templates: [
      "Design brand elements and comprehensive style guide",
      "Create logo variations and brand identity system",
      "Develop brand color palette with usage guidelines",
      "Design business card and stationery set",
      "Create brand presentation template",
      "Design email signature with brand elements",
    ],
  },
  "Marketing": {
    icon: "📊",
    templates: [
      "Create static ad designs for Google Display Network",
      "Design email newsletter template with CTAs",
      "Develop landing page design for campaign",
      "Create presentation deck for investor pitch",
      "Design infographic for blog post",
      "Create promotional banner set for website",
    ],
  },
  "More": {
    icon: "✨",
    templates: [
      "Design packaging mockups for product launch",
      "Create event invitation and promotional materials",
      "Develop mobile app UI/UX design concepts",
      "Design website homepage with modern layout",
      "Create podcast cover art and episode graphics",
      "Design menu and promotional materials for restaurant",
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
      className="relative min-h-screen bg-background"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Background blobs */}
      <FloatingBlobs />

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
          <div className="bg-white/80 dark:bg-card/40 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-border/50 shadow-lg overflow-hidden">
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

        {/* Template System - Categories or Templates */}
        <div className="w-full max-w-5xl mb-8 sm:mb-12 px-4">
          {!selectedCategory ? (
            /* Show Categories */
            <>
              <p className="text-center text-sm text-muted-foreground mb-4">What can I help you create?</p>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide justify-center">
                {Object.entries(TEMPLATE_CATEGORIES).map(([category, { icon }]) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className="px-4 py-2.5 rounded-full border border-border/50 bg-white/60 dark:bg-card/30 backdrop-blur-lg hover:bg-white/80 dark:hover:bg-card/50 hover:border-foreground/20 transition-all text-sm text-foreground whitespace-nowrap flex-shrink-0 flex items-center gap-2"
                  >
                    <span>{icon}</span>
                    <span>{category}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* Show Templates for Selected Category */
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                >
                  <span>←</span>
                  <span>Back</span>
                </button>
                <p className="text-sm font-medium text-foreground">Sample prompts</p>
              </div>
              <div className="space-y-1">
                {TEMPLATE_CATEGORIES[selectedCategory as keyof typeof TEMPLATE_CATEGORIES]?.templates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      handleTemplateClick(template);
                      setSelectedCategory(null);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg bg-white/40 dark:bg-card/20 backdrop-blur-lg hover:bg-white/60 dark:hover:bg-card/40 border border-transparent hover:border-border/30 transition-all text-sm text-foreground flex items-center justify-between group"
                  >
                    <span className="leading-relaxed">{template}</span>
                    <span className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-4 flex-shrink-0">↗</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inspiration Gallery - Grouped by Content Type */}
      {(isLoadingStyles || styleReferences.length > 0) && (
        <div className="relative w-full pt-4">
          {/* Grouped Masonry Grid */}
          <div className="relative pb-8">
            <div className="max-w-6xl mx-auto px-6">
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
                    <div key={groupKey} className="mb-10">
                      {/* Group Header */}
                      <div className={`flex items-center gap-2 mb-4 ${groupIndex > 0 ? "mt-8" : ""}`}>
                        <span className="text-lg">{icon}</span>
                        <h3 className="text-sm font-medium text-foreground">
                          {label}
                        </h3>
                        <div className="flex-1 h-px bg-border ml-2" />
                        <span className="text-xs text-muted-foreground">
                          {allRefs.length} {allRefs.length === 1 ? 'style' : 'styles'}
                        </span>
                      </div>
                      <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-3 space-y-3">
                        {refs.map((ref) => {
                          const variantUrls = getImageVariantUrls(ref.imageUrl);
                          return (
                            <div
                              key={ref.id}
                              className="break-inside-avoid rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
                            >
                              <ImageWithSkeleton
                                src={variantUrls.preview}
                                alt={ref.name}
                                className="w-full"
                                skeletonClassName="bg-muted/50 min-h-[150px]"
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
