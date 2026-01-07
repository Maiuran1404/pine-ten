"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  ArrowUp,
  Video,
  Grip,
  Sparkles,
  Image as ImageIcon,
  Palette,
  Type,
  FileImage,
  Layers,
  Download,
  Coins,
  Upload,
  FileText,
  FileVideo,
  FileArchive,
  File,
  X,
} from "lucide-react";
import { CreditPurchaseDialog } from "@/components/shared/credit-purchase-dialog";
import { LoadingSpinner } from "@/components/shared/loading";

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

const QUICK_PROMPTS = [
  {
    id: "static-ad",
    icon: ImageIcon,
    label: "I need a static ad design",
  },
  {
    id: "video-ad",
    icon: Video,
    label: "Create a video ad for me",
  },
  {
    id: "social-content",
    icon: Layers,
    label: "Design social media content",
  },
];

const DESIGN_ASSETS = [
  {
    id: "logo",
    icon: ImageIcon,
    title: "Logo Pack",
    description: "Primary and secondary logos in various formats",
    fileCount: 12,
    gridClass: "col-span-1 md:col-span-5",
    visual: "logo",
  },
  {
    id: "colors",
    icon: Palette,
    title: "Brand Colors",
    description: "Color palette with hex codes and usage guidelines",
    fileCount: 8,
    gridClass: "col-span-1 md:col-span-4",
    visual: "colors",
  },
  {
    id: "typography",
    icon: Type,
    title: "Typography",
    description: "Font files and typographic scale definitions",
    fileCount: 6,
    gridClass: "col-span-1 md:col-span-3",
    visual: "typography",
  },
  {
    id: "icons",
    icon: FileImage,
    title: "Icon Set",
    description: "Custom icons for web and mobile applications",
    fileCount: 48,
    gridClass: "col-span-1 md:col-span-3",
    visual: "icons",
  },
  {
    id: "templates",
    icon: Layers,
    title: "Templates",
    description: "Social media and presentation templates",
    fileCount: 15,
    gridClass: "col-span-1 md:col-span-5",
    visual: "templates",
  },
  {
    id: "mockups",
    icon: ImageIcon,
    title: "Mockups",
    description: "Product mockups and brand imagery",
    fileCount: 24,
    gridClass: "col-span-1 md:col-span-4",
    visual: "mockups",
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
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={28}
                  height={28}
                  className="object-contain opacity-60"
                />
              </div>
              <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center overflow-hidden">
                <Image
                  src={logoUrl}
                  alt="Logo"
                  width={20}
                  height={20}
                  className="object-contain opacity-40"
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
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <span className="text-white/60 font-medium text-base">
                  {companyInitial}
                </span>
              </div>
              <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center">
                <span className="text-white/40 text-sm">{companyInitial}</span>
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
              .slice(0, 6)
              .map((color, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full border border-white/10"
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
            className="text-white text-2xl font-bold"
            style={{ fontFamily: primaryFont }}
          >
            Aa
          </span>
          <span
            className="text-white/60 text-lg"
            style={{ fontFamily: secondaryFont }}
          >
            Bb
          </span>
          <span
            className="text-white/40 text-sm"
            style={{ fontFamily: primaryFont }}
          >
            Cc
          </span>
        </div>
      );
    case "icons":
      return (
        <div className="grid grid-cols-4 gap-2">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded"
              style={{
                backgroundColor:
                  colors[i % colors.length] || "rgba(255,255,255,0.1)",
                opacity: 0.6 + (i % 3) * 0.2,
              }}
            />
          ))}
        </div>
      );
    case "templates":
      return (
        <div className="flex items-center gap-2">
          <div
            className="w-14 h-9 rounded border border-white/10"
            style={{ backgroundColor: primaryColor, opacity: 0.8 }}
          />
          <div
            className="w-9 h-9 rounded border border-white/10"
            style={{ backgroundColor: colors[1] || "#8b5cf6", opacity: 0.6 }}
          />
          <div
            className="w-11 h-9 rounded border border-white/10"
            style={{ backgroundColor: colors[2] || "#22c55e", opacity: 0.7 }}
          />
        </div>
      );
    case "mockups":
      return (
        <div className="flex items-center gap-3">
          {/* Laptop mockup */}
          <div
            className="w-14 h-9 rounded border border-white/20"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}40 0%, ${
                colors[1] || primaryColor
              }20 100%)`,
            }}
          />
          {/* Phone mockup */}
          <div
            className="w-6 h-10 rounded-sm border border-white/20"
            style={{
              background: `linear-gradient(180deg, ${primaryColor}30 0%, ${
                colors[1] || primaryColor
              }10 100%)`,
            }}
          />
        </div>
      );
    default:
      return null;
  }
};

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [brandData, setBrandData] = useState<BrandData | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sentMessage, setSentMessage] = useState("");
  const [credits, setCredits] = useState<number | null>(null);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const creditsParam = searchParams.get("credits");

    const fetchBrandData = async () => {
      try {
        const response = await fetch("/api/brand");
        if (response.ok) {
          const data = await response.json();
          setBrandData(data);
        }
      } catch (error) {
        console.error("Failed to fetch brand data:", error);
      }
    };

    const fetchCreditsData = async () => {
      try {
        const response = await fetch("/api/user/credits");
        if (response.ok) {
          const data = await response.json();
          setCredits(data.credits);
        }
      } catch (error) {
        console.error("Failed to fetch credits:", error);
      }
    };

    if (payment === "success" && creditsParam) {
      toast.success(`Successfully purchased ${creditsParam} credits!`);
    } else if (payment === "cancelled") {
      toast.info("Payment was cancelled");
    }

    fetchBrandData();
    fetchCreditsData();
  }, [searchParams]);

  // Get credit indicator color based on amount
  const getCreditColor = () => {
    if (credits === null) return { dot: "bg-gray-500", text: "text-muted-foreground" };
    if (credits === 0)
      return {
        dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]",
        text: "text-red-400",
      };
    if (credits <= 2)
      return {
        dot: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]",
        text: "text-yellow-400",
      };
    return {
      dot: "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]",
      text: "text-green-400",
    };
  };

  const creditColors = getCreditColor();

  const handleSubmit = async () => {
    if (!chatInput.trim() || isSending || isTransitioning) return;

    // Check if user has credits
    if (credits === 0) {
      setShowCreditDialog(true);
      return;
    }

    const message = chatInput.trim();
    setIsSending(true);
    setSentMessage(message);
    setChatInput("");
    setIsTransitioning(true);

    // Wait for animation to complete then navigate
    setTimeout(() => {
      router.push(`/dashboard/chat?message=${encodeURIComponent(message)}`);
    }, 500);
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

  // Modified submit to include files
  const handleSubmitWithFiles = async () => {
    if ((!chatInput.trim() && uploadedFiles.length === 0) || isSending || isTransitioning) return;

    // Check if user has credits
    if (credits === 0) {
      setShowCreditDialog(true);
      return;
    }

    const message = chatInput.trim() || `Attached ${uploadedFiles.length} file(s)`;
    setIsSending(true);
    setSentMessage(message);
    setChatInput("");
    setIsTransitioning(true);

    // Store files in sessionStorage for the chat page to pick up
    if (uploadedFiles.length > 0) {
      sessionStorage.setItem("pending_chat_files", JSON.stringify(uploadedFiles));
    }
    setUploadedFiles([]);

    // Wait for animation to complete then navigate
    setTimeout(() => {
      router.push(`/dashboard/chat?message=${encodeURIComponent(message)}`);
    }, 500);
  };

  return (
    <div
      className="relative flex flex-col items-center justify-start min-h-full px-4 pt-32 pb-20 bg-background overflow-auto"
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

      {/* Noise texture to prevent gradient banding */}
      <svg className="hidden">
        <filter id="noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </svg>

      {/* Curtain light from top - subtle ambient glow (dark mode only) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[800px] pointer-events-none dark:opacity-100 opacity-0"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 0%,
            rgba(13, 148, 136, 0.08) 0%,
            rgba(13, 148, 136, 0.04) 20%,
            rgba(13, 148, 136, 0.02) 40%,
            rgba(13, 148, 136, 0.01) 60%,
            transparent 80%
          )`,
          filter: "blur(40px)",
        }}
      />
      <style jsx>{`
        @keyframes curtainPulse {
          0%,
          100% {
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

      <AnimatePresence mode="wait">
        {!isTransitioning ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="relative flex flex-col items-center text-center max-w-2xl mx-auto space-y-6 z-10"
          >
            {/* Logo Icon */}
            <motion.div className="w-20 h-20 rounded-2xl bg-card flex items-center justify-center mb-2 border border-border">
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
            </motion.div>

            {/* Welcome Text */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-muted-foreground">
                Good to see you!
              </h1>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                How can I help you today?
              </h2>
              <p className="text-muted-foreground text-base mt-4">
                Im available 24/7 for you, ask me anything.
              </p>
            </div>

            {/* Input Container with Glassy Effect */}
            <div className="w-full max-w-xl mt-8 relative">
              {/* Glass container */}
              <div className="relative rounded-xl overflow-hidden border border-border bg-card">
                {/* Pro Plan Banner */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Sparkles className="h-4 w-4" />
                    <span>Unlock more features with the Pro plan.</span>
                  </div>
                  <button
                    onClick={() => credits === 0 && setShowCreditDialog(true)}
                    className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${creditColors.dot}`}
                    ></span>
                    <Coins className={`h-3.5 w-3.5 ${creditColors.text}`} />
                    <span className={creditColors.text}>
                      {credits === null ? "..." : credits} credits
                    </span>
                  </button>
                </div>

                {/* Uploaded files preview */}
                {uploadedFiles.length > 0 && (
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex flex-wrap gap-2">
                      {uploadedFiles.filter(Boolean).map((file) => {
                        // Get the appropriate icon based on file type
                        const getFileIcon = () => {
                          const type = file.fileType || "";
                          if (type.startsWith("image/")) return <FileImage className="h-5 w-5 text-foreground" />;
                          if (type.startsWith("video/")) return <FileVideo className="h-5 w-5 text-foreground" />;
                          if (type === "application/pdf") return <FileText className="h-5 w-5 text-foreground" />;
                          if (type.includes("zip") || type.includes("archive")) return <FileArchive className="h-5 w-5 text-foreground" />;
                          if (type.includes("word") || type.includes("document")) return <FileText className="h-5 w-5 text-foreground" />;
                          if (type.includes("presentation") || type.includes("powerpoint")) return <FileText className="h-5 w-5 text-foreground" />;
                          return <File className="h-5 w-5 text-foreground" />;
                        };

                        return (
                          <div
                            key={file.fileUrl}
                            className="relative group flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border"
                          >
                            {file.fileType?.startsWith("image/") ? (
                              <img
                                src={file.fileUrl}
                                alt={file.fileName}
                                className="h-8 w-8 rounded object-cover"
                              />
                            ) : (
                              getFileIcon()
                            )}
                            <span className="text-sm max-w-[150px] truncate text-foreground">
                              {file.fileName}
                            </span>
                            <button
                              onClick={() => removeFile(file.fileUrl)}
                              className="ml-1 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20 transition-colors"
                              aria-label="Remove file"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Input Field */}
                <div className="relative flex items-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {isUploading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Paperclip className="h-5 w-5" />
                    )}
                  </button>
                  <div className="h-5 w-px bg-border"></div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitWithFiles();
                      }
                    }}
                    placeholder={uploadedFiles.length > 0 ? "Add a message or just send the files..." : "Ask anything ..."}
                    className="flex-1 bg-transparent px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm"
                  />
                  <button
                    onClick={handleSubmitWithFiles}
                    disabled={isSending || isUploading || (!chatInput.trim() && uploadedFiles.length === 0)}
                    className="p-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
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
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border hover:border-border/80 transition-all text-sm text-muted-foreground hover:text-foreground bg-card"
                >
                  <prompt.icon className="w-4 h-4" />
                  {prompt.label}
                </button>
              ))}
              <button className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-border hover:border-border/80 transition-all text-muted-foreground hover:text-foreground bg-card">
                <Grip className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat-transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col w-full max-w-2xl mx-auto h-[calc(100vh-12rem)] z-10"
          >
            {/* Chat messages area */}
            <div className="flex-1 flex flex-col justify-end pb-6">
              {/* User message bubble */}
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.4,
                  ease: [0.4, 0, 0.2, 1],
                  delay: 0.1,
                }}
                className="flex justify-end mb-4"
              >
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white text-black">
                  <p className="text-sm">{sentMessage}</p>
                </div>
              </motion.div>

              {/* AI typing indicator */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                className="flex justify-start"
              >
                <div className="rounded-2xl px-4 py-3 bg-muted border border-border">
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-muted-foreground"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full bg-muted-foreground"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.2,
                      }}
                    />
                    <motion.div
                      className="w-2 h-2 rounded-full bg-muted-foreground"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.4,
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Input at bottom */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="w-full"
            >
              <div className="relative rounded-xl overflow-hidden border border-border bg-card">
                <div className="relative flex items-center">
                  <button className="p-3 text-muted-foreground hover:text-foreground transition-colors">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <div className="h-5 w-px bg-border"></div>
                  <input
                    type="text"
                    disabled
                    placeholder="Ask anything ..."
                    className="flex-1 bg-transparent px-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm disabled:opacity-50"
                  />
                  <button
                    disabled
                    className="p-3 text-muted-foreground transition-colors disabled:opacity-50"
                  >
                    <ArrowUp className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Design Assets Grid - Full Width */}
      <AnimatePresence>
        {!isTransitioning && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="w-full mt-24 px-8 z-10"
          >
            <div className="grid grid-cols-2 md:grid-cols-12 gap-3">
              {DESIGN_ASSETS.map((asset) => (
                <div
                  key={asset.id}
                  className={`group relative rounded-xl overflow-hidden border border-border hover:border-border/80 transition-all cursor-pointer h-[140px] bg-card ${asset.gridClass}`}
                >
                  <div className="p-4 h-full flex flex-col justify-between">
                    {/* Visual Preview */}
                    <div className="flex-1 flex items-center">
                      <AssetVisual type={asset.visual} brand={brandData} />
                    </div>

                    {/* Footer with title and file count */}
                    <div className="flex items-end justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-foreground group-hover:text-foreground transition-colors">
                          {asset.title}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {asset.fileCount} files
                        </span>
                      </div>
                      <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <AnimatePresence>
        {!isTransitioning && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-6 left-0 right-0 text-center z-10"
          >
            <p className="text-sm text-muted-foreground">
              Unlock a new era with Crafted. Crafted with care from Norway.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
    <div className="flex flex-col items-center justify-center min-h-full px-4 bg-background">
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-6">
        <Skeleton className="w-20 h-20 rounded-2xl bg-muted" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-64 mx-auto bg-muted" />
          <Skeleton className="h-10 w-80 mx-auto bg-muted" />
          <Skeleton className="h-5 w-56 mx-auto mt-4 bg-muted" />
        </div>
        <Skeleton className="h-24 w-full max-w-xl rounded-xl mt-8 bg-muted" />
        <div className="flex gap-3 mt-6">
          <Skeleton className="h-10 w-40 rounded-full bg-muted" />
          <Skeleton className="h-10 w-48 rounded-full bg-muted" />
          <Skeleton className="h-10 w-44 rounded-full bg-muted" />
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
