"use client";

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";
import { flushSync } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { TypingText } from "./typing-text";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner } from "@/components/shared/loading";
import { CreditPurchaseDialog } from "@/components/shared/credit-purchase-dialog";
import { useSession } from "@/lib/auth-client";
import {
  useCredits,
  dispatchCreditsUpdated,
} from "@/providers/credit-provider";
import {
  Send,
  Check,
  X,
  Image as ImageIcon,
  Paperclip,
  FileIcon,
  XCircle,
  Trash2,
  Copy,
  Sparkles,
  Smile,
  MoreHorizontal,
  Quote,
  Calendar,
  Tag,
  FileText,
  Activity,
  PanelRightClose,
  PanelRight,
  User,
  Clock,
  Info,
  Coins,
  RotateCcw,
  Package,
  Palette,
  CheckCircle2,
  AlertCircle,
  Timer,
  Download,
  ArrowRight,
  Lightbulb,
  Pencil,
  Share2,
  Megaphone,
  Bookmark,
  LayoutGrid,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDraft,
  saveDraft,
  deleteDraft,
  generateDraftTitle,
  type ChatDraft,
  type MoodboardItemData,
} from "@/lib/chat-drafts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  type UploadedFile,
  type QuickOptions as QuickOptionsType,
  type StyleReference,
  type DeliverableStyle,
  type DeliverableStyleMarker,
  type VideoReference,
  type TaskProposal,
  type ChatMessage as Message,
  type MoodboardItem,
  type ChatStage,
  getDeliveryDateString,
} from "./types";
import { TaskProposalCard } from "./task-proposal-card";
import { FileAttachmentList } from "./file-attachment";
import { QuickOptions } from "./quick-options";
import { DeliverableStyleGrid } from "./deliverable-style-grid";
import { VideoReferenceGrid, type VideoReferenceStyle } from "./video-reference-grid";
import { ChatLayout } from "./chat-layout";
import { StyleSelectionGrid } from "./style-selection-grid";
import { StyleDetailModal } from "./style-detail-modal";
import { InlineCollection } from "./inline-collection";
import { SimpleOptionChips } from "./option-chips";
import { TaskSubmissionModal } from "./task-submission-modal";
import { useMoodboard } from "@/lib/hooks/use-moodboard";
import { useBrief } from "@/lib/hooks/use-brief";
import { useBrandData } from "@/lib/hooks/use-brand-data";
import { calculateChatStage } from "@/lib/chat-progress";
import { calculateBriefCompletion } from "./brief-panel/types";

// Task data types for when viewing an active task
export interface TaskFile {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  isDeliverable: boolean;
  createdAt: string;
  uploadedBy: string;
}

export interface AssignedArtist {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export interface TaskData {
  id: string;
  title: string;
  description: string;
  status: string;
  creditsUsed: number;
  maxRevisions: number;
  revisionsUsed: number;
  estimatedHours?: number | null;
  deadline?: string | null;
  assignedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  freelancer?: AssignedArtist | null;
  files?: TaskFile[];
  chatHistory?: Array<{
    role: string;
    content: string;
    timestamp: string;
    attachments?: UploadedFile[];
  }>;
}

interface ChatInterfaceProps {
  draftId: string;
  onDraftUpdate?: () => void;
  initialMessage?: string | null;
  seamlessTransition?: boolean;
  // Task mode props - when viewing an active task
  taskData?: TaskData | null;
  onTaskUpdate?: () => void;
  // Callback when a task is created (to update sidebar)
  onTaskCreated?: (taskId: string) => void;
  // UI control props
  showRightPanel?: boolean;
  onChatStart?: () => void;
}

// Welcome message removed - chat now starts directly with user's message

// Format relative time
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Auto-capitalize "i" to "I" when it's a standalone word
function autoCapitalizeI(text: string): string {
  // Replace standalone "i" with "I" (word boundaries, not part of other words)
  return text.replace(/\bi\b/g, "I");
}

// Progressive loading indicator component - minimal design
function LoadingIndicator({
  requestStartTime,
}: {
  requestStartTime: number | null;
}) {
  const [loadingStage, setLoadingStage] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const loadingMessages = [
    "Reading between the lines...",
    "Mapping out your moodboard...",
    "Curating the perfect visuals...",
    "Polishing the final touches...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      if (requestStartTime) {
        const elapsed = Math.floor((Date.now() - requestStartTime) / 1000);
        setElapsedTime(elapsed);

        // Progress through stages based on time
        if (elapsed >= 8) setLoadingStage(3);
        else if (elapsed >= 5) setLoadingStage(2);
        else if (elapsed >= 2) setLoadingStage(1);
        else setLoadingStage(0);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [requestStartTime]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-start gap-3"
    >
      {/* Minimal avatar - just a green circle */}
      <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-white/30"
        />
        <div className="w-2.5 h-2.5 rounded-full bg-white" />
      </div>
      <div className="bg-white/60 dark:bg-card/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/50">
        <div className="flex items-center gap-3">
          {/* Animated dots */}
          <div className="flex gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          {/* Progressive message with shimmer effect */}
          <motion.div
            key={loadingStage}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm relative overflow-hidden"
          >
            <span className="text-muted-foreground">
              {loadingMessages[loadingStage]}
            </span>
            {/* Shimmer overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent -skew-x-12"
              animate={{ x: ["-100%", "200%"] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                repeatDelay: 0.5,
              }}
            />
          </motion.div>
          {/* Timer */}
          {elapsedTime > 0 && (
            <span className="text-xs text-muted-foreground/60 tabular-nums">
              {elapsedTime}s
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ChatInterface({
  draftId,
  onDraftUpdate,
  initialMessage,
  seamlessTransition = false,
  taskData: initialTaskData,
  onTaskUpdate,
  onTaskCreated,
  showRightPanel = true,
  onChatStart,
}: ChatInterfaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { credits: userCredits, refreshCredits, deductCredits } = useCredits();
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [taskData, setTaskData] = useState<TaskData | null>(
    initialTaskData || null
  );
  const [paymentProcessed, setPaymentProcessed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingTask, setPendingTask] = useState<TaskProposal | null>(null);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [hoveredStyleName, setHoveredStyleName] = useState<string | null>(null);
  const [selectedDeliverableStyles, setSelectedDeliverableStyles] = useState<
    string[]
  >([]);
  const [selectedStyleForModal, setSelectedStyleForModal] =
    useState<DeliverableStyle | null>(null);
  const [currentDeliverableType, setCurrentDeliverableType] = useState<
    string | null
  >(null);
  const [styleOffset, setStyleOffset] = useState<Record<string, number>>({});
  const [excludedStyleAxes, setExcludedStyleAxes] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [animatingMessageId, setAnimatingMessageId] = useState<string | null>(
    null
  );
  const [completedTypingIds, setCompletedTypingIds] = useState<Set<string>>(
    new Set()
  );
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  // Reset suggestion index when messages change (new options available)
  useEffect(() => {
    setSuggestionIndex(0);
  }, [messages.length]);

  const [messageFeedback, setMessageFeedback] = useState<
    Record<string, "up" | "down" | null>
  >({});
  const [taskSubmitted, setTaskSubmitted] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragCounterRef = useRef(0);
  const requestStartTimeRef = useRef<number | null>(null);
  const chatStartedRef = useRef(false);

  // Moodboard state management
  const {
    items: moodboardItems,
    addItem: addMoodboardItem,
    removeItem: removeMoodboardItem,
    clearAll: clearMoodboard,
    hasItem: hasMoodboardItem,
    addFromStyle,
    addFromUpload,
  } = useMoodboard();

  // Fetch brand data for the logged-in user's company
  const {
    brand: brandData,
    audiences: brandAudiences,
    brandColors,
    brandTypography,
    toneOfVoice,
    isLoading: isBrandLoading,
  } = useBrandData();

  // Brief state management - builds designer-ready brief from conversation
  const {
    brief,
    completion: briefCompletion,
    isReady: isBriefReady,
    processMessage: processBriefMessage,
    updateBrief,
    addStyleToVisualDirection,
    syncMoodboardToVisualDirection,
    generateOutline,
    exportBrief,
  } = useBrief({
    draftId,
    brandAudiences,
    brandColors,
    brandTypography,
    brandName: brandData?.name || "",
    brandIndustry: brandData?.industry || "",
    brandToneOfVoice: toneOfVoice,
    brandDescription: brandData?.description || "",
  });

  // Sync moodboard changes to visual direction
  useEffect(() => {
    if (moodboardItems.length > 0) {
      syncMoodboardToVisualDirection(moodboardItems);
    }
  }, [moodboardItems, syncMoodboardToVisualDirection]);

  // Calculate chat progress
  const progressState = useMemo(
    () =>
      calculateChatStage({
        messages,
        selectedStyles: [...selectedStyles, ...selectedDeliverableStyles],
        moodboardItems,
        pendingTask,
        taskSubmitted,
      }),
    [
      messages,
      selectedStyles,
      selectedDeliverableStyles,
      moodboardItems,
      pendingTask,
      taskSubmitted,
    ]
  );

  // Collapse left sidebar when chat starts (messages appear)
  useEffect(() => {
    if (messages.length > 0 && !chatStartedRef.current && onChatStart) {
      chatStartedRef.current = true;
      onChatStart();
    }
  }, [messages.length, onChatStart]);

  // Get moodboard style IDs for tracking what's already added
  const moodboardStyleIds = useMemo(
    () =>
      moodboardItems
        .filter((i) => i.type === "style")
        .map((i) => i.metadata?.styleId || ""),
    [moodboardItems]
  );

  // Check if moodboard has any style items - used to suppress repeated style grids
  const moodboardHasStyles = useMemo(
    () => moodboardItems.some((i) => i.type === "style"),
    [moodboardItems]
  );

  // Smart autocomplete state
  const [smartCompletion, setSmartCompletion] = useState<string | null>(null);
  const smartCompleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get suggestion text from the last assistant message's quick options
  const quickOptionSuggestion = useMemo(() => {
    // Don't show suggestions while loading
    if (isLoading) return null;

    // Find the last assistant message with quick options
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (
        msg.role === "assistant" &&
        msg.quickOptions &&
        msg.quickOptions.options.length > 0
      ) {
        const options = msg.quickOptions.options;
        // Cycle through options based on suggestionIndex
        const safeIndex = suggestionIndex % options.length;
        return options[safeIndex];
      }
    }
    return null;
  }, [messages, isLoading, suggestionIndex]);

  // Generate smart completions based on what the user is typing
  const generateSmartCompletion = useCallback((text: string): string | null => {
    if (!text || text.length < 3) return null;

    const lowerText = text.toLowerCase().trim();
    const words = lowerText.split(/\s+/);
    const lastWord = words[words.length - 1] || "";

    // Context-aware completions based on common chat patterns
    const completions: Array<{ pattern: RegExp | string; completion: string }> =
      [
        // ========== PRODUCT DESCRIPTIONS (most common follow-ups) ==========
        // "A [type] for" patterns - very common when answering "What product?"
        {
          pattern:
            /^a\s+(tech\s+)?(product|app|platform|tool|software|service)\s*(\/\s*\w+)?\s+for\s*$/i,
          completion: "businesses to streamline their workflows",
        },
        {
          pattern:
            /^a\s+(saas|b2b|b2c)\s+(product|app|platform|tool)\s+for\s*$/i,
          completion: "managing team productivity",
        },
        {
          pattern: /^a\s+(mobile|web)\s+app\s+for\s*$/i,
          completion: "tracking fitness goals",
        },
        { pattern: /^a\s+new\s*$/i, completion: "product we're launching" },
        {
          pattern: /^an\s+app\s+(that|which|for)\s*$/i,
          completion: "helps people save time",
        },
        {
          pattern: /^an\s+ai\s*$/i,
          completion: "powered tool for content creation",
        },

        // "It's a" / "We have a" patterns
        {
          pattern: /^it('s| is)\s+(a|an)\s*$/i,
          completion: "SaaS platform for businesses",
        },
        {
          pattern: /^it('s| is)\s+called\s*$/i,
          completion: "and it helps businesses",
        },
        {
          pattern: /^we\s+(have|built|created|made)\s+(a|an)\s*$/i,
          completion: "platform that helps businesses",
        },
        {
          pattern: /^we('re| are)\s+(a|an)?\s*$/i,
          completion: "launching next month",
        },
        {
          pattern: /^we('re| are)\s+launching\s*$/i,
          completion: "a new product next month",
        },
        {
          pattern: /^we('re| are)\s+building\s*$/i,
          completion: "a platform for teams",
        },

        // "My/Our product" patterns
        {
          pattern: /^my\s+(product|app|company|startup|business)\s*$/i,
          completion: "helps businesses save time",
        },
        {
          pattern: /^our\s+(product|app|company|startup|business)\s*$/i,
          completion: "is a platform for teams",
        },
        {
          pattern: /^our\s+new\s*$/i,
          completion: "product launches next month",
        },

        // Product type continuations
        {
          pattern: /^(a|an)\s+(fitness|health|wellness)\s*$/i,
          completion: "tracking app",
        },
        {
          pattern: /^(a|an)\s+(project|task)\s+management\s*$/i,
          completion: "tool for remote teams",
        },
        {
          pattern: /^(a|an)\s+(e-?commerce|shopping)\s*$/i,
          completion: "platform for small businesses",
        },
        {
          pattern: /^(a|an)\s+(fintech|finance)\s*$/i,
          completion: "app for personal budgeting",
        },
        {
          pattern: /^(a|an)\s+(social|community)\s*$/i,
          completion: "platform for creators",
        },
        {
          pattern: /^(a|an)\s+(marketing|crm)\s*$/i,
          completion: "tool for small businesses",
        },

        // Describing what the product does
        {
          pattern:
            /that\s+helps\s+(people|users|businesses|teams|companies)\s*$/i,
          completion: "save time and money",
        },
        {
          pattern: /that\s+lets\s+(people|users|you)\s*$/i,
          completion: "manage their projects easily",
        },
        {
          pattern: /that\s+makes\s+(it\s+)?(easy|easier|simple)\s*$/i,
          completion: "to collaborate with teams",
        },
        { pattern: /that\s+automates\s*$/i, completion: "repetitive tasks" },
        {
          pattern: /that\s+connects\s*$/i,
          completion: "businesses with customers",
        },
        {
          pattern: /to\s+help\s+(people|users|businesses|teams)\s*$/i,
          completion: "be more productive",
        },

        // ========== STYLE SELECTION RESPONSES ==========
        {
          pattern:
            /^i('ll| will)?\s*(go|like|choose|pick|want)\s*(with|the)?\s*$/i,
          completion: "the first style",
        },
        { pattern: /^the\s+first\s*$/i, completion: "one looks great" },
        { pattern: /^the\s+second\s*$/i, completion: "option please" },
        { pattern: /^the\s+third\s*$/i, completion: "style works well" },
        { pattern: /^i\s+like\s+(the\s+)?$/i, completion: "minimal style" },
        {
          pattern: /^let('s|s)?\s*go\s*(with)?\s*$/i,
          completion: "the first option",
        },
        { pattern: /^show\s+me\s*$/i, completion: "more options" },
        { pattern: /^something\s+more\s*$/i, completion: "minimal and clean" },
        {
          pattern: /^something\s+less\s*$/i,
          completion: "busy and more focused",
        },

        // ========== AUDIENCE DESCRIPTIONS ==========
        {
          pattern: /^for\s+(my|our)\s*$/i,
          completion: "target audience of professionals",
        },
        {
          pattern: /^targeting\s*$/i,
          completion: "young professionals aged 25-40",
        },
        {
          pattern: /^the\s+audience\s+(is|are)?\s*$/i,
          completion: "primarily business owners",
        },
        {
          pattern: /^(mainly|mostly|primarily)\s*$/i,
          completion: "business professionals",
        },
        {
          pattern: /^(aimed\s+at|for)\s+(small|medium|large)\s*$/i,
          completion: "businesses",
        },
        {
          pattern: /^(aimed\s+at|for)\s+(young|older)\s*$/i,
          completion: "professionals",
        },

        // ========== PLATFORM MENTIONS ==========
        {
          pattern: /^(for|on)\s+instagram\s*$/i,
          completion: "reels and stories",
        },
        {
          pattern: /^(for|on)\s+linkedin\s*$/i,
          completion: "thought leadership posts",
        },
        { pattern: /^(for|on)\s+tiktok\s*$/i, completion: "short-form videos" },
        {
          pattern: /^(for|on)\s+twitter\s*$/i,
          completion: "engagement threads",
        },
        { pattern: /^(for|on)\s+youtube\s*$/i, completion: "video content" },
        {
          pattern: /^(for|on)\s+(the\s+)?web\s*$/i,
          completion: "landing page",
        },

        // ========== INTENT DESCRIPTIONS ==========
        {
          pattern: /^(to|we want to)\s+drive\s*$/i,
          completion: "signups and conversions",
        },
        {
          pattern: /^(to|we want to)\s+increase\s*$/i,
          completion: "brand awareness",
        },
        {
          pattern: /^(to|we want to)\s+launch\s*$/i,
          completion: "our new product",
        },
        {
          pattern: /^(to|we want to)\s+promote\s*$/i,
          completion: "our upcoming launch",
        },
        {
          pattern: /^(to|we want to)\s+build\s*$/i,
          completion: "brand authority",
        },
        { pattern: /^(to|we want to)\s+grow\s*$/i, completion: "our audience" },
        {
          pattern: /^(to|we want to)\s+get\s*$/i,
          completion: "more customers",
        },
        { pattern: /^(to|we want to)\s+attract\s*$/i, completion: "new users" },
        {
          pattern: /^(to|we want to)\s+generate\s*$/i,
          completion: "leads and sales",
        },

        // ========== TIMING & URGENCY ==========
        {
          pattern: /^launching\s+(in|on|next|this)\s*$/i,
          completion: "2 weeks",
        },
        {
          pattern: /^we\s+launch\s+(in|on|next|this)\s*$/i,
          completion: "2 weeks",
        },
        { pattern: /^need\s+(this|it)\s+by\s*$/i, completion: "next week" },
        { pattern: /^by\s+(next|this)\s*$/i, completion: "week if possible" },
        { pattern: /^as\s+soon\s*$/i, completion: "as possible" },
        { pattern: /^in\s+(the\s+)?next\s*$/i, completion: "few days" },
        { pattern: /^within\s*$/i, completion: "the next week" },

        // ========== QUANTITY ==========
        {
          pattern: /^(\d+)\s+(posts?|videos?|pieces?|assets?)\s*$/i,
          completion: "for the campaign",
        },
        {
          pattern: /^a\s+series\s+of\s*$/i,
          completion: "posts for our launch",
        },
        { pattern: /^multiple\s*$/i, completion: "versions for A/B testing" },
        {
          pattern: /^just\s+(one|1|a\s+single)\s*$/i,
          completion: "hero video",
        },

        // ========== GENERAL CONTINUATIONS ==========
        {
          pattern: /^(yes|yeah|yep|sure|perfect),?\s*$/i,
          completion: "let's go with that",
        },
        {
          pattern: /^(no|nope|not\s+quite),?\s*$/i,
          completion: "show me different options",
        },
        {
          pattern: /^(great|nice|good|love\s+it),?\s*$/i,
          completion: "let's move forward",
        },
        { pattern: /^can\s+you\s*$/i, completion: "make it more minimal?" },
        {
          pattern: /^could\s+(you|we)\s*$/i,
          completion: "try a different style?",
        },
        { pattern: /^i\s+need\s*$/i, completion: "something eye-catching" },
        { pattern: /^make\s+it\s*$/i, completion: "more bold and vibrant" },
        { pattern: /^keep\s+it\s*$/i, completion: "simple and clean" },
        { pattern: /^something\s+that\s*$/i, completion: "stands out" },
        { pattern: /^i\s+want\s*$/i, completion: "something modern and clean" },
        { pattern: /^we\s+need\s*$/i, completion: "this by next week" },
        {
          pattern: /^i('m| am)\s+looking\s+for\s*$/i,
          completion: "something bold and modern",
        },
        {
          pattern: /^i\s+was\s+thinking\s*$/i,
          completion: "something more minimal",
        },

        // ========== FOLLOW-UP QUESTIONS ==========
        {
          pattern: /^what\s+about\s*$/i,
          completion: "a more colorful version?",
        },
        {
          pattern: /^how\s+about\s*$/i,
          completion: "we try a different approach?",
        },
        {
          pattern: /^can\s+we\s+(also|add)\s*$/i,
          completion: "include our tagline?",
        },
        { pattern: /^should\s+(we|i)\s*$/i, completion: "include the logo?" },
      ];

    // Check for pattern matches
    for (const { pattern, completion } of completions) {
      if (typeof pattern === "string") {
        if (lowerText.endsWith(pattern.toLowerCase())) {
          return completion;
        }
      } else if (pattern.test(lowerText)) {
        return completion;
      }
    }

    // Word-level completions for partial words (last word being typed)
    const wordCompletions: Record<string, string> = {
      // Platforms
      inst: "agram",
      link: "edIn",
      tikt: "ok",
      face: "book",
      yout: "ube",
      twit: "ter",
      // Style words
      mini: "mal",
      moder: "n",
      cine: "matic",
      prof: "essional",
      eleg: "ant",
      vibr: "ant",
      dynam: "ic",
      sleek: " and modern",
      // Business words
      prod: "uct",
      serv: "ice",
      plat: "form",
      busin: "esses",
      enter: "prise",
      start: "up",
      compan: "y",
      // Intent words
      anno: "uncement",
      awar: "eness",
      laun: "ch",
      prom: "otion",
      conv: "ersion",
      sign: "ups",
      engag: "ement",
      // Common continuations
      stream: "line workflows",
      auto: "mate tasks",
      manag: "e their projects",
      track: "ing and analytics",
      colla: "borate",
    };

    // Check partial word completions
    if (lastWord.length >= 3) {
      for (const [prefix, suffix] of Object.entries(wordCompletions)) {
        if (
          lastWord.startsWith(prefix) &&
          !lastWord.includes(suffix.charAt(0).toLowerCase())
        ) {
          return suffix;
        }
      }
    }

    // Ending-based completions - check what the sentence ends with
    // These work regardless of what came before
    const endingCompletions: Array<{ ending: string; completion: string }> = [
      // Product description endings
      { ending: " for", completion: "businesses to manage their workflows" },
      { ending: " for ", completion: "businesses to manage their workflows" },
      { ending: " that", completion: "helps teams be more productive" },
      { ending: " that ", completion: "helps teams be more productive" },
      { ending: " which", completion: "helps businesses save time" },
      { ending: " to", completion: "help businesses grow" },
      { ending: " to ", completion: "help businesses grow" },

      // Common preposition endings
      { ending: " with", completion: "a modern, clean design" },
      { ending: " about", completion: "our new product launch" },
      { ending: " like", completion: "something bold and eye-catching" },
      { ending: " using", completion: "AI and automation" },

      // Action endings
      { ending: " helps", completion: "businesses save time" },
      { ending: " lets", completion: "users manage their projects" },
      { ending: " allows", completion: "teams to collaborate" },
      { ending: " enables", completion: "businesses to scale" },
      { ending: " makes", completion: "it easy to get started" },

      // Common phrase endings
      { ending: " and", completion: "increase conversions" },
      { ending: " or", completion: "something similar" },
      { ending: " but", completion: "more minimal" },
      { ending: " by", completion: "next week" },
      { ending: " in", completion: "the next few days" },
      { ending: " on", completion: "social media" },

      // Question-like endings
      { ending: "?", completion: "" }, // Don't complete questions
    ];

    for (const { ending, completion } of endingCompletions) {
      if (lowerText.endsWith(ending) && completion) {
        return completion;
      }
    }

    return null;
  }, []);

  // Update smart completion when input changes (debounced)
  useEffect(() => {
    if (smartCompleteTimeoutRef.current) {
      clearTimeout(smartCompleteTimeoutRef.current);
    }

    // Don't generate completions while loading or for very short input
    if (isLoading || input.length < 3) {
      setSmartCompletion(null);
      return;
    }

    // Check if input matches a quick option - if so, don't override with smart completion
    if (quickOptionSuggestion) {
      const trimmedInput = input.trim().toLowerCase();
      if (
        trimmedInput.length === 0 ||
        quickOptionSuggestion.toLowerCase().startsWith(trimmedInput)
      ) {
        setSmartCompletion(null);
        return;
      }
    }

    // Debounce the smart completion generation
    smartCompleteTimeoutRef.current = setTimeout(() => {
      const completion = generateSmartCompletion(input);
      setSmartCompletion(completion);
    }, 150);

    return () => {
      if (smartCompleteTimeoutRef.current) {
        clearTimeout(smartCompleteTimeoutRef.current);
      }
    };
  }, [input, isLoading, quickOptionSuggestion, generateSmartCompletion]);

  // Determine which suggestion to show (quick option or smart completion)
  const currentSuggestion = useMemo(() => {
    if (isLoading) return null;

    const trimmedInput = input.trim().toLowerCase();

    // First priority: quick options when input is empty or matches
    if (quickOptionSuggestion) {
      if (trimmedInput.length === 0) return quickOptionSuggestion;
      if (quickOptionSuggestion.toLowerCase().startsWith(trimmedInput)) {
        return quickOptionSuggestion;
      }
    }

    // Second priority: smart completion when typing
    if (smartCompletion && trimmedInput.length >= 3) {
      return input.trim() + " " + smartCompletion;
    }

    return null;
  }, [quickOptionSuggestion, smartCompletion, input, isLoading]);

  // Get the ghost text to display (the part after what's typed)
  const ghostText = useMemo(() => {
    if (!currentSuggestion || isLoading) return "";
    const trimmedInput = input.trim();

    // For smart completions, just show the completion part
    if (
      smartCompletion &&
      trimmedInput.length >= 3 &&
      !quickOptionSuggestion
        ?.toLowerCase()
        .startsWith(trimmedInput.toLowerCase())
    ) {
      return " " + smartCompletion;
    }

    // For quick options, show the remaining part
    if (trimmedInput.length === 0) return currentSuggestion;
    if (
      currentSuggestion.toLowerCase().startsWith(trimmedInput.toLowerCase())
    ) {
      return currentSuggestion.slice(trimmedInput.length);
    }

    return "";
  }, [
    currentSuggestion,
    smartCompletion,
    quickOptionSuggestion,
    input,
    isLoading,
  ]);

  // Find the index of the last message with deliverable styles (for collapsing older grids)
  // Also check if the user has already made a selection (any user message after this style message)
  const lastStyleMessageIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (
        messages[i].deliverableStyles &&
        messages[i].deliverableStyles!.length > 0
      ) {
        // Check if there's any user message after this style message
        // If so, the user has already made a selection, so this grid should be disabled
        const hasSubsequentUserMessage = messages
          .slice(i + 1)
          .some((m) => m.role === "user");
        if (hasSubsequentUserMessage) {
          return -1; // No active style grid - user already made selection
        }
        return i;
      }
    }
    return -1;
  }, [messages]);

  // Track if we need to auto-continue
  const [needsAutoContinue, setNeedsAutoContinue] = useState(false);
  const [initialMessageProcessed, setInitialMessageProcessed] = useState(false);
  // Track if AI indicated readiness without formal [TASK_READY] block
  const [showManualSubmit, setShowManualSubmit] = useState(false);
  const [hasRequestedTaskSummary, setHasRequestedTaskSummary] = useState(false);

  // Sync taskData state with initialTaskData prop when it changes
  useEffect(() => {
    if (initialTaskData) {
      setTaskData(initialTaskData);
    }
  }, [initialTaskData]);

  // Check if we're in task mode (viewing an active task)
  const isTaskMode = !!taskData;
  const assignedArtist = taskData?.freelancer;
  const deliverables = taskData?.files?.filter((f) => f.isDeliverable) || [];
  const taskFiles = taskData?.files?.filter((f) => !f.isDeliverable) || [];

  // Get user info
  const userName = session?.user?.name || "You";
  const userInitial = userName.charAt(0).toUpperCase();

  // Get all attachments from messages for the side panel
  const allAttachments = messages
    .filter((m) => m.attachments && m.attachments.length > 0)
    .flatMap((m) => m.attachments || [])
    .filter(
      (file): file is NonNullable<typeof file> =>
        file != null && file.fileUrl != null
    );

  // Load draft when draftId changes OR load task chat history when in task mode
  useEffect(() => {
    // If we're in task mode, load chat history from task data
    if (isTaskMode && taskData?.chatHistory) {
      const loadedMessages = taskData.chatHistory.map((m, idx) => ({
        id: `task-msg-${idx}`,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.timestamp),
        attachments: m.attachments,
      }));
      // Set loaded messages (may be empty for new chats)
      setMessages(loadedMessages);
      // Mark all loaded messages as having completed typing (they won't animate)
      setCompletedTypingIds(new Set(loadedMessages.map((m) => m.id)));
      setIsInitialized(true);
      return;
    }

    // Regular draft loading
    const draft = getDraft(draftId);
    if (draft) {
      const loadedMessages = draft.messages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
      setMessages(loadedMessages);
      setSelectedStyles(draft.selectedStyles);
      setPendingTask(draft.pendingTask);
      // Mark all loaded messages as having completed typing (they won't animate)
      setCompletedTypingIds(new Set(loadedMessages.map((m) => m.id)));

      // Restore moodboard items from draft if available
      if (draft.moodboardItems && draft.moodboardItems.length > 0) {
        // Clear current moodboard first, then add items
        clearMoodboard();
        draft.moodboardItems.forEach((item) => {
          addMoodboardItem({
            type: item.type,
            imageUrl: item.imageUrl,
            name: item.name,
            metadata: item.metadata,
          });
        });
      }

      const lastMessage = loadedMessages[loadedMessages.length - 1];
      if (lastMessage && lastMessage.role === "user") {
        setNeedsAutoContinue(true);
      }
    } else {
      // New chat - clear all state including moodboard
      setMessages([]);
      setSelectedStyles([]);
      setSelectedDeliverableStyles([]);
      setPendingTask(null);
      setCompletedTypingIds(new Set());
      setCurrentDeliverableType(null);
      setStyleOffset({});
      setExcludedStyleAxes([]);
      clearMoodboard();
    }
    setIsInitialized(true);
  }, [draftId, isTaskMode, taskData, clearMoodboard, addMoodboardItem]);

  // Track if we've processed messages for brief inference on load
  const hasProcessedMessagesForBriefRef = useRef(false);

  // Process all user messages for brief inference when messages are loaded
  // This ensures the brief panel is populated on page refresh or draft loading
  useEffect(() => {
    if (
      !isInitialized ||
      messages.length === 0 ||
      hasProcessedMessagesForBriefRef.current
    )
      return;

    // Mark as processed to avoid re-running
    hasProcessedMessagesForBriefRef.current = true;

    // Process all user messages to populate the brief
    const userMessages = messages.filter((m) => m.role === "user");
    userMessages.forEach((msg) => {
      if (msg.content) {
        processBriefMessage(msg.content);
      }
    });
  }, [isInitialized, messages, processBriefMessage]);

  // Handle initial message from URL param
  useEffect(() => {
    if (!initialMessage || initialMessageProcessed || !isInitialized) return;

    setInitialMessageProcessed(true);

    // If we already have messages loaded from draft, check if we should skip
    // This prevents regeneration on page refresh
    if (messages.length > 0) {
      // Check if the first user message matches the initial message
      const firstUserMessage = messages.find((m) => m.role === "user");
      if (firstUserMessage && firstUserMessage.content === initialMessage) {
        // Already have this conversation, don't regenerate
        // Update URL to use draft param instead of message param
        const url = new URL(window.location.href);
        url.searchParams.delete("message");
        url.searchParams.set("draft", draftId);
        window.history.replaceState({}, "", url.toString());
        return;
      }
      // Also skip if we have an assistant response (conversation already happened)
      const hasAssistantResponse = messages.some((m) => m.role === "assistant");
      if (hasAssistantResponse) {
        // Update URL to use draft param instead of message param
        const url = new URL(window.location.href);
        url.searchParams.delete("message");
        url.searchParams.set("draft", draftId);
        window.history.replaceState({}, "", url.toString());
        return;
      }
    }

    let pendingFiles: UploadedFile[] = [];
    try {
      const storedFiles = sessionStorage.getItem("pending_chat_files");
      if (storedFiles) {
        pendingFiles = JSON.parse(storedFiles);
        sessionStorage.removeItem("pending_chat_files");
      }
    } catch {
      // Ignore parsing errors
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: initialMessage,
      timestamp: new Date(),
      attachments: pendingFiles.length > 0 ? pendingFiles : undefined,
    };

    // Start chat with user message directly
    if (seamlessTransition) {
      setMessages([userMessage]);
    } else {
      setMessages((prev) => [...prev, userMessage]);
    }

    // Process the initial message through brief inference engine
    // This ensures the brief panel gets populated from template prompts
    if (initialMessage) {
      processBriefMessage(initialMessage);
    }

    // Update URL to use draft param instead of message param
    // This ensures refresh loads the draft instead of regenerating
    const url = new URL(window.location.href);
    url.searchParams.delete("message");
    url.searchParams.set("draft", draftId);
    window.history.replaceState({}, "", url.toString());

    setNeedsAutoContinue(true);
  }, [
    initialMessage,
    initialMessageProcessed,
    isInitialized,
    seamlessTransition,
    messages,
    draftId,
    processBriefMessage,
  ]);

  // Auto-continue conversation if last message was from user
  useEffect(() => {
    if (!needsAutoContinue || isLoading || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "user") return;

    setNeedsAutoContinue(false);

    const continueConversation = async () => {
      setIsLoading(true);
      requestStartTimeRef.current = Date.now();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            selectedStyles,
            moodboardHasStyles,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        const data = await response.json();

        // Calculate thinking time
        const thinkingTime = requestStartTimeRef.current
          ? Math.round((Date.now() - requestStartTimeRef.current) / 1000)
          : undefined;

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
          thinkingTime,
          styleReferences: data.styleReferences,
          deliverableStyles: data.deliverableStyles,
          deliverableStyleMarker: data.deliverableStyleMarker,
          videoReferences: data.videoReferences,
          taskProposal: data.taskProposal,
          quickOptions: data.quickOptions,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setAnimatingMessageId(assistantMessage.id);

        if (data.taskProposal) {
          setPendingTask(data.taskProposal);
        }

        // Track deliverable type for pagination
        if (data.deliverableStyleMarker) {
          setCurrentDeliverableType(
            data.deliverableStyleMarker.deliverableType
          );
        }
      } catch {
        toast.error("Failed to continue conversation. Please try again.");
      } finally {
        setIsLoading(false);
        requestStartTimeRef.current = null;
      }
    };

    continueConversation();
  }, [needsAutoContinue, isLoading, messages, selectedStyles]);

  // Store callback in ref to avoid infinite loops
  const onDraftUpdateRef = useRef(onDraftUpdate);
  useEffect(() => {
    onDraftUpdateRef.current = onDraftUpdate;
  }, [onDraftUpdate]);

  // Auto-save draft when messages change
  useEffect(() => {
    if (!isInitialized) return;
    if (messages.length <= 1 && messages[0]?.id === "welcome") return;

    // Convert moodboard items for title generation
    const moodboardItemsForTitle = moodboardItems.map((item) => ({
      id: item.id,
      type: item.type,
      imageUrl: item.imageUrl,
      name: item.name,
      metadata: item.metadata,
      order: item.order,
      addedAt: item.addedAt.toISOString(),
    }));

    const existingDraft = getDraft(draftId);
    const draftCreatedAt = existingDraft?.createdAt || new Date().toISOString();

    const draft: ChatDraft = {
      id: draftId,
      title: generateDraftTitle(
        messages,
        moodboardItemsForTitle,
        draftCreatedAt
      ),
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.toISOString(),
        attachments: m.attachments,
        quickOptions: m.quickOptions,
        deliverableStyles: m.deliverableStyles,
        deliverableStyleMarker: m.deliverableStyleMarker,
        selectedStyle: m.selectedStyle,
        taskProposal: m.taskProposal, // Save task proposal with message
        videoReferences: m.videoReferences, // Save video references with message
      })),
      selectedStyles,
      moodboardItems: moodboardItems.map((item) => ({
        id: item.id,
        type: item.type,
        imageUrl: item.imageUrl,
        name: item.name,
        metadata: item.metadata,
        order: item.order,
        addedAt: item.addedAt.toISOString(),
      })),
      pendingTask,
      createdAt: draftCreatedAt,
      updatedAt: new Date().toISOString(),
    };

    saveDraft(draft);
    onDraftUpdateRef.current?.();
  }, [
    messages,
    selectedStyles,
    moodboardItems,
    pendingTask,
    draftId,
    isInitialized,
  ]);

  // Handle payment success - auto-confirm task after successful payment
  useEffect(() => {
    const payment = searchParams.get("payment");
    const creditsParam = searchParams.get("credits");

    if (payment === "success" && creditsParam && !paymentProcessed) {
      setPaymentProcessed(true);
      toast.success(`Successfully purchased ${creditsParam} credits!`, {
        duration: 5000,
      });

      // Clean up URL params without navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("credits");
      window.history.replaceState({}, "", url.toString());

      // Refresh credits from context
      refreshCredits();

      // Check for pending task state that was saved before payment
      try {
        const savedState = sessionStorage.getItem("pending_task_state");
        if (savedState) {
          const { taskProposal } = JSON.parse(savedState);
          sessionStorage.removeItem("pending_task_state");

          // Restore pending task and automatically open submission modal
          if (taskProposal) {
            setPendingTask(taskProposal);
            // Automatically open submission modal after a brief delay to let state settle
            // This provides a seamless flow after purchasing credits
            setTimeout(() => {
              setShowSubmissionModal(true);
              toast.success(
                "Credits purchased! Review your task and click Submit.",
                { duration: 5000 }
              );
            }, 500);
          }
        }
      } catch {
        // Ignore parsing errors
      }
    } else if (payment === "cancelled") {
      toast.info("Payment was cancelled");
      // Clean up URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, paymentProcessed]);

  // Detect "ready to execute" patterns when AI doesn't generate [TASK_READY] block
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    // Don't show banner if we already requested a task summary (prevents infinite loop)
    if (hasRequestedTaskSummary) {
      setShowManualSubmit(false);
      return;
    }
    if (lastMessage?.role === "assistant" && !pendingTask) {
      const readyPatterns = [
        /ready to execute/i,
        /ready to submit/i,
        /ready to move forward/i,
        /sound good to move forward/i,
        /shall i submit/i,
        /ready to proceed/i,
        /ready when you are/i,
        /good to go/i,
        /ready to create/i,
        /shall (i|we) create/i,
        /let(')?s create this/i,
        /creative brief.*complete/i,
        /brief is ready/i,
        /finalized.*brief/i,
        /here's your.*brief/i,
        /ready to get started/i,
        /want (me|us) to (submit|create|proceed)/i,
      ];

      const hasReadyIndicator = readyPatterns.some((p) =>
        p.test(lastMessage.content)
      );
      setShowManualSubmit(hasReadyIndicator);
    } else {
      setShowManualSubmit(false);
    }
  }, [messages, pendingTask, hasRequestedTaskSummary]);

  // Helper function to scroll to bottom
  const scrollToBottom = useRef((smooth = false) => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      const target = viewport || scrollAreaRef.current;
      if (smooth) {
        target.scrollTo({ top: target.scrollHeight, behavior: "smooth" });
      } else {
        target.scrollTop = target.scrollHeight;
      }
    }
  }).current;

  // Scroll to bottom when messages change or loading state changes
  useLayoutEffect(() => {
    // Use multiple frames to ensure content is fully rendered
    scrollToBottom();
    const frame1 = requestAnimationFrame(() => {
      scrollToBottom();
      const frame2 = requestAnimationFrame(() => {
        scrollToBottom();
      });
      return () => cancelAnimationFrame(frame2);
    });
    return () => cancelAnimationFrame(frame1);
  }, [messages, isLoading, scrollToBottom]);

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
        // API returns { success: true, data: { file: {...} } }
        return (data.data?.file || data.file) as UploadedFile;
      });

      const newFiles = await Promise.all(uploadPromises);
      // Filter out any undefined/null files
      const validFiles = newFiles.filter(
        (f): f is UploadedFile => !!f && !!f.fileUrl
      );
      setUploadedFiles((prev) => [...prev, ...validFiles]);

      // Auto-add image uploads to moodboard
      validFiles.forEach((file) => {
        if (file.fileType?.startsWith("image/")) {
          addFromUpload(file);
        }
      });

      toast.success(`${validFiles.length} file(s) uploaded`);
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

  const handleSend = async () => {
    if ((!input.trim() && uploadedFiles.length === 0) || isLoading) return;

    const currentFiles = [...uploadedFiles];
    // Auto-capitalize "i" to "I" in user messages
    const processedContent = input
      ? autoCapitalizeI(input)
      : currentFiles.length > 0
      ? `Attached ${currentFiles.length} file(s)`
      : "";
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: processedContent,
      timestamp: new Date(),
      attachments: currentFiles.length > 0 ? currentFiles : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setUploadedFiles([]);
    setIsLoading(true);
    requestStartTimeRef.current = Date.now();

    // Process message through brief inference engine
    if (userMessage.content) {
      processBriefMessage(userMessage.content);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments,
          })),
          attachments: currentFiles.length > 0 ? currentFiles : undefined,
          selectedStyles,
          moodboardHasStyles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      // Calculate thinking time
      const thinkingTime = requestStartTimeRef.current
        ? Math.round((Date.now() - requestStartTimeRef.current) / 1000)
        : undefined;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        thinkingTime,
        styleReferences: data.styleReferences,
        deliverableStyles: data.deliverableStyles,
        deliverableStyleMarker: data.deliverableStyleMarker,
        videoReferences: data.videoReferences,
        taskProposal: data.taskProposal,
        quickOptions: data.quickOptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setAnimatingMessageId(assistantMessage.id);

      if (data.taskProposal) {
        setPendingTask(data.taskProposal);
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
      requestStartTimeRef.current = null;
    }
  };

  // Send a specific message (used for clickable options)
  const handleSendOption = async (optionText: string) => {
    if (isLoading || !optionText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: optionText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedStyles,
          moodboardHasStyles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        styleReferences: data.styleReferences,
        deliverableStyles: data.deliverableStyles,
        deliverableStyleMarker: data.deliverableStyleMarker,
        videoReferences: data.videoReferences,
        taskProposal: data.taskProposal,
        quickOptions: data.quickOptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setAnimatingMessageId(assistantMessage.id);

      if (data.taskProposal) {
        setPendingTask(data.taskProposal);
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiscard = () => {
    setInput("");
    setUploadedFiles([]);
  };

  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      toast.error("Failed to copy message");
    }
  };

  // Handle message feedback (thumbs up/down)
  const handleMessageFeedback = (
    messageId: string,
    feedback: "up" | "down"
  ) => {
    const currentFeedback = messageFeedback[messageId];
    const newFeedback = currentFeedback === feedback ? null : feedback;

    setMessageFeedback((prev) => ({
      ...prev,
      [messageId]: newFeedback,
    }));

    // Log feedback for analytics (fire-and-forget)
    if (newFeedback) {
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          feedback: newFeedback,
          context: "chat",
        }),
      }).catch((err) => console.debug("Feedback logging:", err));

      toast.success(
        newFeedback === "up"
          ? "Thanks for the feedback!"
          : "We'll work on improving this",
        {
          duration: 2000,
        }
      );
    }
  };

  const handleStyleSelect = (styleName: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleName)
        ? prev.filter((s) => s !== styleName)
        : [...prev, styleName]
    );
  };

  // Handle clicking a style card - opens the detail modal
  const handleStyleCardClick = (style: DeliverableStyle) => {
    setSelectedStyleForModal(style);
  };

  // Handle adding a style to the collection
  const handleAddToCollection = (style: DeliverableStyle) => {
    if (!hasMoodboardItem(style.id)) {
      addFromStyle(style);
      // Also add to brief's visual direction
      addStyleToVisualDirection(style);
      toast.success(`Added "${style.name}" to collection`);

      // Record selection to history (fire-and-forget, don't block UI)
      fetch("/api/style-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleId: style.id,
          deliverableType: style.deliverableType,
          styleAxis: style.styleAxis,
          selectionContext: "chat",
          wasConfirmed: false,
        }),
      }).catch((err) =>
        console.error("Failed to record style selection:", err)
      );
    }
  };

  // Handle removing a style from the collection
  const handleRemoveFromCollection = (styleId: string) => {
    const item = moodboardItems.find((i) => i.metadata?.styleId === styleId);
    if (item) {
      removeMoodboardItem(item.id);
      toast.success("Removed from collection");
    }
  };

  // Handle clearing all style items from collection
  const handleClearStyleCollection = () => {
    const styleItems = moodboardItems.filter((i) => i.type === "style");
    styleItems.forEach((item) => removeMoodboardItem(item.id));
    toast.success("Collection cleared");
  };

  const handleShowMoreStyles = async (styleAxis: string) => {
    if (!currentDeliverableType || isLoading) return;

    const currentOffset = styleOffset[styleAxis] || 0;
    const newOffset = currentOffset + 4;

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedStyles,
          styleOffset: newOffset,
          deliverableStyleMarker: {
            type: "more",
            deliverableType: currentDeliverableType,
            styleAxis,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get more styles");
      }

      const data = await response.json();

      if (data.deliverableStyles && data.deliverableStyles.length > 0) {
        // Check if we got cycled styles (matchReason indicates top/similar styles)
        const isCycled = data.deliverableStyles.some(
          (s: { matchReason?: string }) =>
            s.matchReason?.includes("Top") ||
            s.matchReason?.includes("Similar") ||
            s.matchReason?.includes("Recommended")
        );

        // If we cycled, reset offset for next time
        if (isCycled) {
          setStyleOffset((prev) => ({
            ...prev,
            [styleAxis]: 0,
          }));
        } else {
          // Update offset for this style axis
          setStyleOffset((prev) => ({
            ...prev,
            [styleAxis]: newOffset,
          }));
        }

        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: isCycled
            ? `Here are some recommended ${styleAxis} styles:`
            : `Here are more ${styleAxis} style options:`,
          timestamp: new Date(),
          deliverableStyles: data.deliverableStyles,
          deliverableStyleMarker: data.deliverableStyleMarker,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setAnimatingMessageId(assistantMessage.id);
      } else {
        // This should rarely happen now with the fallbacks
        toast.info("Showing top recommended styles");
      }
    } catch {
      toast.error("Failed to load more styles");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowDifferentStyles = async () => {
    if (!currentDeliverableType || isLoading) return;

    // Track which style axes we've already shown
    const lastMessage = messages
      .filter((m) => m.deliverableStyles && m.deliverableStyles.length > 0)
      .pop();
    const currentAxes =
      lastMessage?.deliverableStyles?.map((s) => s.styleAxis) || [];
    const newExcludedAxes = [
      ...new Set([...excludedStyleAxes, ...currentAxes]),
    ];

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedStyles,
          excludeStyleAxes: newExcludedAxes,
          deliverableStyleMarker: {
            type: "different",
            deliverableType: currentDeliverableType,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get different styles");
      }

      const data = await response.json();

      if (data.deliverableStyles && data.deliverableStyles.length > 0) {
        setExcludedStyleAxes(newExcludedAxes);

        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: "Here are some different style directions:",
          timestamp: new Date(),
          deliverableStyles: data.deliverableStyles,
          deliverableStyleMarker: data.deliverableStyleMarker,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setAnimatingMessageId(assistantMessage.id);
      } else {
        toast.info("No more style directions available");
        // Reset excluded axes to allow cycling through again
        setExcludedStyleAxes([]);
      }
    } catch {
      toast.error("Failed to load different styles");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitStyles = async () => {
    if (selectedStyles.length === 0 || isLoading) return;

    // Find the full style objects from styleReferences in messages
    const allStyleReferences = messages
      .filter((m) => m.styleReferences && m.styleReferences.length > 0)
      .flatMap((m) => m.styleReferences || []);

    const matchedStyles = allStyleReferences.filter((s) =>
      selectedStyles.includes(s.name)
    );

    // Convert StyleReference to DeliverableStyle-like object for display
    // Only the imageUrl and name are used in rendering
    const selectedStyleForMessage: DeliverableStyle | undefined =
      matchedStyles.length === 1
        ? {
            id: `style-ref-${matchedStyles[0].name}`,
            name: matchedStyles[0].name,
            description: matchedStyles[0].description || null,
            imageUrl: matchedStyles[0].imageUrl,
            deliverableType: matchedStyles[0].category || "unknown",
            styleAxis: "reference",
            subStyle: null,
            semanticTags: [],
          }
        : undefined;

    const styleMessage =
      selectedStyles.length === 1
        ? `Style selected: ${selectedStyles[0]}`
        : `Styles selected: ${selectedStyles.join(", ")}`;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: styleMessage,
      timestamp: new Date(),
      selectedStyle: selectedStyleForMessage,
    };

    // Force React to synchronously commit this state update before continuing
    flushSync(() => {
      setMessages((prev) => [...prev, userMessage]);
    });

    // Wait for browser to paint the message
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 100);
        });
      });
    });

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedStyles,
          moodboardHasStyles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        styleReferences: data.styleReferences,
        deliverableStyles: data.deliverableStyles,
        deliverableStyleMarker: data.deliverableStyleMarker,
        videoReferences: data.videoReferences,
        taskProposal: data.taskProposal,
        quickOptions: data.quickOptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setAnimatingMessageId(assistantMessage.id);

      if (data.taskProposal) {
        setPendingTask(data.taskProposal);
      }

      if (data.deliverableStyleMarker) {
        setCurrentDeliverableType(data.deliverableStyleMarker.deliverableType);
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitDeliverableStyles = async (
    deliverableStyles: DeliverableStyle[]
  ) => {
    // Use moodboardStyleIds as the collection (unified model: collection = selection)
    if (moodboardStyleIds.length === 0 || isLoading) return;

    const selectedStyleMatches = deliverableStyles.filter((s) =>
      moodboardStyleIds.includes(s.id)
    );
    const selectedStyleNames = selectedStyleMatches.map((s) => s.name);

    const styleMessage = "Please implement this.";
    const selectedStyleForMessage =
      selectedStyleMatches.length === 1 ? selectedStyleMatches[0] : undefined;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: styleMessage,
      timestamp: new Date(),
      selectedStyle: selectedStyleForMessage,
    };

    // Force React to synchronously commit this state update before continuing
    // This ensures the message is in the DOM before we set loading state
    flushSync(() => {
      setMessages((prev) => [...prev, userMessage]);
    });

    // Now wait for browser to actually paint the message
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 100);
        });
      });
    });

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedDeliverableStyles: moodboardStyleIds,
          moodboardHasStyles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        styleReferences: data.styleReferences,
        deliverableStyles: data.deliverableStyles,
        deliverableStyleMarker: data.deliverableStyleMarker,
        videoReferences: data.videoReferences,
        taskProposal: data.taskProposal,
        quickOptions: data.quickOptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setAnimatingMessageId(assistantMessage.id);

      if (data.taskProposal) {
        setPendingTask(data.taskProposal);
      }

      if (data.deliverableStyleMarker) {
        setCurrentDeliverableType(data.deliverableStyleMarker.deliverableType);
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle confirming style selection from the grid
  const handleConfirmStyleSelection = async (
    selectedStyles: DeliverableStyle[]
  ) => {
    if (selectedStyles.length === 0 || isLoading) {
      return;
    }

    const style = selectedStyles[0];
    const styleMessage = `Style selected: ${style.name}`;

    // NOTE: Moodboard updates moved to AFTER API call to prevent useEffect re-run
    // that would reload stale draft and lose the user message

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: styleMessage,
      timestamp: new Date(),
      selectedStyle: style, // Include the full style for rendering
    };

    // Force React to synchronously commit this state update before continuing
    // This ensures the message is in the DOM before we set loading state
    flushSync(() => {
      setMessages((prev) => [...prev, userMessage]);
    });

    // Now wait for browser to actually paint the message
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 100);
        });
      });
    });

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedDeliverableStyles: selectedStyles.map((s) => s.id),
          moodboardHasStyles: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        styleReferences: data.styleReferences,
        deliverableStyles: data.deliverableStyles,
        deliverableStyleMarker: data.deliverableStyleMarker,
        videoReferences: data.videoReferences,
        taskProposal: data.taskProposal,
        quickOptions: data.quickOptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setAnimatingMessageId(assistantMessage.id);

      if (data.taskProposal) {
        setPendingTask(data.taskProposal);
      }

      if (data.deliverableStyleMarker) {
        setCurrentDeliverableType(data.deliverableStyleMarker.deliverableType);
      }

      // Add to moodboard AFTER API call completes to prevent useEffect from
      // reloading stale draft and losing the user message
      selectedStyles.forEach((s) => {
        if (!hasMoodboardItem(s.id)) {
          addFromStyle(s);
          addStyleToVisualDirection(s);
        }
      });
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle selecting a video from the preview modal
  const handleSelectVideo = async (video: VideoReferenceStyle) => {
    if (isLoading) return;

    const videoMessage = `Video style selected: ${video.name}`;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: videoMessage,
      timestamp: new Date(),
      selectedStyle: {
        id: video.id,
        name: video.name,
        description: video.description,
        imageUrl: video.imageUrl,
        deliverableType: video.deliverableType,
        styleAxis: video.styleAxis,
        subStyle: video.subStyle || null,
        semanticTags: video.semanticTags || [],
      },
    };

    // Force React to synchronously commit this state update
    flushSync(() => {
      setMessages((prev) => [...prev, userMessage]);
    });

    // Wait for browser to paint
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 100);
        });
      });
    });

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedDeliverableStyles: [video.id],
          moodboardHasStyles: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        styleReferences: data.styleReferences,
        deliverableStyles: data.deliverableStyles,
        deliverableStyleMarker: data.deliverableStyleMarker,
        videoReferences: data.videoReferences,
        taskProposal: data.taskProposal,
        quickOptions: data.quickOptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setAnimatingMessageId(assistantMessage.id);

      if (data.taskProposal) {
        setPendingTask(data.taskProposal);
      }

      // Add video to moodboard
      if (!hasMoodboardItem(video.id)) {
        addFromStyle({
          id: video.id,
          name: video.name,
          description: video.description,
          imageUrl: video.imageUrl,
          deliverableType: video.deliverableType,
          styleAxis: video.styleAxis,
          subStyle: video.subStyle || null,
          semanticTags: video.semanticTags || [],
        });
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickOptionClick = async (option: string) => {
    if (isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: option,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          selectedStyles,
          moodboardHasStyles,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        styleReferences: data.styleReferences,
        deliverableStyles: data.deliverableStyles,
        deliverableStyleMarker: data.deliverableStyleMarker,
        videoReferences: data.videoReferences,
        taskProposal: data.taskProposal,
        quickOptions: data.quickOptions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setAnimatingMessageId(assistantMessage.id);

      if (data.taskProposal) {
        setPendingTask(data.taskProposal);
      }

      if (data.deliverableStyleMarker) {
        setCurrentDeliverableType(data.deliverableStyleMarker.deliverableType);
      }
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // userCredits now comes from the credit context (set at component initialization)

  const handleConfirmTask = async () => {
    if (!pendingTask) return;

    // Normalize task values with defaults before submission
    const normalizedTask = {
      ...pendingTask,
      creditsRequired: pendingTask.creditsRequired ?? 15,
      estimatedHours: pendingTask.estimatedHours ?? 24,
      deliveryDays: pendingTask.deliveryDays ?? 3,
    };

    if (userCredits < normalizedTask.creditsRequired) {
      setShowCreditDialog(true);
      return;
    }

    setIsLoading(true);

    const allAttachments = messages
      .filter((m) => m.attachments && m.attachments.length > 0)
      .flatMap((m) => m.attachments || [])
      .filter((file) => file != null && file.fileUrl != null);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...normalizedTask,
          chatHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            attachments: m.attachments?.filter((a) => a != null),
          })),
          styleReferences: selectedStyles,
          attachments: allAttachments,
          moodboardItems: moodboardItems.map((item) => ({
            id: item.id,
            type: item.type,
            imageUrl: item.imageUrl,
            name: item.name,
            metadata: item.metadata,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || error.message || "Failed to create task"
        );
      }

      const result = await response.json();
      const taskId = result.data.taskId;

      // Mark task as submitted for progress tracking
      setTaskSubmitted(true);

      // Delete draft
      deleteDraft(draftId);
      onDraftUpdate?.();

      // Add success message to chat
      const successMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `**Your task has been submitted!**\n\n${
          result.data.assignedTo
            ? `**${result.data.assignedTo}** has been assigned to work on your project.`
            : "We're finding the perfect artist for your project."
        } You'll receive updates as your design progresses.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
      setAnimatingMessageId(successMessage.id);

      // Clear pending task UI
      setPendingTask(null);

      // Fetch the full task data to switch to task mode
      try {
        const taskResponse = await fetch(`/api/tasks/${taskId}`);
        if (taskResponse.ok) {
          const taskResult = await taskResponse.json();
          // Transform to TaskData format
          const fetchedTaskData: TaskData = {
            id: taskResult.task.id,
            title: taskResult.task.title,
            description: taskResult.task.description,
            status: taskResult.task.status,
            creditsUsed: taskResult.task.creditsUsed,
            maxRevisions: taskResult.task.maxRevisions,
            revisionsUsed: taskResult.task.revisionsUsed,
            estimatedHours: taskResult.task.estimatedHours,
            deadline: taskResult.task.deadline,
            assignedAt: taskResult.task.assignedAt,
            completedAt: taskResult.task.completedAt,
            createdAt: taskResult.task.createdAt,
            freelancer: taskResult.task.freelancer
              ? {
                  id: taskResult.task.freelancer.id,
                  name: taskResult.task.freelancer.name,
                  email: "",
                  image: taskResult.task.freelancer.image,
                }
              : null,
            files: taskResult.task.files,
            chatHistory: taskResult.task.chatHistory,
          };
          setTaskData(fetchedTaskData);
        }
      } catch {
        // Task was created but we couldn't fetch details - that's okay
      }

      // Dispatch event to notify sidebar to refresh tasks
      window.dispatchEvent(new CustomEvent("tasks-updated"));

      // Deduct credits optimistically and dispatch update event
      deductCredits(normalizedTask.creditsRequired);
      dispatchCreditsUpdated();

      // Call the callback if provided
      onTaskCreated?.(taskId);

      toast.success("Task created successfully!", { duration: 5000 });

      // Navigate to task detail page
      router.push(`/dashboard/tasks/${taskId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create task"
      );
      throw error; // Re-throw for modal handling
    } finally {
      setIsLoading(false);
    }
  };

  // Open submission modal
  const handleOpenSubmissionModal = () => {
    if (!pendingTask) return;
    const creditsNeeded = pendingTask.creditsRequired ?? 15;
    if (userCredits < creditsNeeded) {
      setShowCreditDialog(true);
      return;
    }
    setShowSubmissionModal(true);
  };

  const handleRejectTask = () => {
    setPendingTask(null);
    const clarifyMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content:
        "No problem! What would you like to change? I can adjust the scope, timeline, or any other details.",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, clarifyMessage]);
    setAnimatingMessageId(clarifyMessage.id);
  };

  // When user clicks "Generate Summary", construct task directly from conversation
  // This skips the summarize step and goes straight to review
  const handleRequestTaskSummary = async () => {
    if (isLoading) return;

    setShowManualSubmit(false);
    setHasRequestedTaskSummary(true);

    // Extract task info from conversation to construct task directly
    const userMessages = messages.filter((m) => m.role === "user");
    const userContent = userMessages.map((m) => m.content).join(" ");
    const allContent = messages.map((m) => m.content).join(" ");

    // Extract title from first user message with better context
    const firstUserMsg = userMessages[0]?.content || "";
    const contentLower = userContent.toLowerCase();

    // Extract product/brand name from conversation (look for capitalized words, "for X", etc.)
    let productContext = "";
    const forPattern = /(?:for|about|showcasing?|featuring?|promoting?|introducing?)\s+(?:my\s+)?(?:the\s+)?([A-Z][A-Za-z0-9]*(?:\s+[A-Z][A-Za-z0-9]*)*(?:'s)?)/;
    const forMatch = userContent.match(forPattern);
    if (forMatch) {
      productContext = forMatch[1].replace(/'s$/, "");
    }

    // Extract the purpose/type of content
    let contentType = "";
    let baseTitle = "";

    if (contentLower.includes("feature") && (contentLower.includes("video") || contentLower.includes("explainer"))) {
      contentType = "Feature Explainer";
      baseTitle = "Video";
    } else if (contentLower.includes("launch") && contentLower.includes("video")) {
      contentType = "Launch";
      baseTitle = "Video";
    } else if (contentLower.includes("demo") || contentLower.includes("walkthrough")) {
      contentType = "Product Demo";
      baseTitle = "Video";
    } else if (contentLower.includes("testimonial")) {
      contentType = "Testimonial";
      baseTitle = contentLower.includes("video") ? "Video" : "Content";
    } else if (contentLower.includes("carousel")) {
      baseTitle = "Instagram Carousel";
    } else if (contentLower.includes("instagram") && contentLower.includes("story")) {
      baseTitle = "Instagram Stories";
    } else if (contentLower.includes("instagram") || contentLower.includes("post")) {
      baseTitle = "Instagram Posts";
    } else if (contentLower.includes("linkedin")) {
      baseTitle = "LinkedIn Content";
    } else if (contentLower.includes("video") || contentLower.includes("reel")) {
      baseTitle = "Video Content";
    } else if (contentLower.includes("logo")) {
      baseTitle = "Logo Design";
    } else if (contentLower.includes("banner") || contentLower.includes("ad")) {
      baseTitle = "Banner/Ad Design";
    } else if (contentLower.includes("pitch") && contentLower.includes("deck")) {
      baseTitle = "Pitch Deck";
    } else if (contentLower.includes("presentation")) {
      baseTitle = "Presentation";
    } else {
      baseTitle = "Design Request";
    }

    // Construct descriptive title
    let title = baseTitle;
    if (contentType && productContext) {
      title = `${productContext} ${contentType} ${baseTitle}`;
    } else if (productContext) {
      title = `${productContext} ${baseTitle}`;
    } else if (contentType) {
      title = `${contentType} ${baseTitle}`;
    }

    // Try to add more context from quoted text if title is still generic
    if (!productContext) {
      const quotedMatch = firstUserMsg.match(/["']([^"']+)["']/);
      if (quotedMatch && quotedMatch[1].length < 30) {
        title = `${title}: ${quotedMatch[1]}`;
      }
    }

    // Clean up title (remove redundant words, trim)
    title = title.replace(/\s+/g, " ").trim();
    if (title.length > 60) {
      title = title.substring(0, 57) + "...";
    }

    // Build description from conversation
    let description = firstUserMsg;
    if (description.length > 200) {
      description = description.substring(0, 197) + "...";
    }

    // Determine category
    let category = "Social Media";
    if (contentLower.includes("logo")) category = "Logo Design";
    else if (contentLower.includes("video") || contentLower.includes("reel"))
      category = "Video";
    else if (contentLower.includes("banner") || contentLower.includes("ad"))
      category = "Advertising";
    else if (contentLower.includes("brand")) category = "Branding";

    // Smart credit calculation based on category, quantity, and complexity
    let creditsRequired = 15; // Base credits for simple social media

    // Base credits by category
    const categoryBaseCredits: Record<string, number> = {
      "Social Media": 15,
      Advertising: 20,
      Video: 30,
      "Logo Design": 40,
      Branding: 60,
    };
    creditsRequired = categoryBaseCredits[category] || 15;

    // Adjust for quantity (number of items requested)
    const quantityPatterns = [
      /(\d+)\s*(slides?|images?|posts?|frames?|pieces?|designs?|concepts?)/i,
      /(\d+)\s*(carousel|story|stories|reels?)/i,
      /(\d+)\s*(versions?|variants?|options?)/i,
    ];

    for (const pattern of quantityPatterns) {
      const match = userContent.match(pattern);
      if (match) {
        const count = parseInt(match[1], 10);
        if (count > 1 && count <= 20) {
          // Add 3-5 credits per additional item depending on category
          const perItemCredits =
            category === "Video" ? 5 : category === "Advertising" ? 4 : 3;
          creditsRequired += (count - 1) * perItemCredits;
          break;
        }
      }
    }

    // Adjust for complexity indicators
    if (
      contentLower.includes("animation") ||
      contentLower.includes("animated")
    ) {
      creditsRequired += 10;
    }
    if (
      contentLower.includes("multiple platforms") ||
      contentLower.includes("multi-platform")
    ) {
      creditsRequired += 5;
    }
    if (
      contentLower.includes("rush") ||
      contentLower.includes("urgent") ||
      contentLower.includes("asap")
    ) {
      creditsRequired = Math.round(creditsRequired * 1.25); // 25% rush fee
    }

    // Cap credits at reasonable maximum
    creditsRequired = Math.min(creditsRequired, 100);

    // Construct the task proposal directly
    const constructedTask: TaskProposal = {
      title,
      description,
      category,
      estimatedHours: 24,
      deliveryDays: 3,
      creditsRequired,
    };

    // Add an AI message with the task proposal so it appears as a chat bubble
    const summaryMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content:
        "Here's a summary of your design brief. Review the details below and submit when you're ready!",
      taskProposal: constructedTask,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, summaryMessage]);

    // Set pending task - this enables the submit actions on the TaskProposalCard
    setPendingTask(constructedTask);

    // Scroll to bottom to show the new message
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector(
          "[data-radix-scroll-area-viewport]"
        );
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }, 100);
  };

  // Generate smart chat title
  const getChatTitle = () => {
    if (messages.length <= 1) return null;

    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length === 0) return null;

    const allUserContent = userMessages
      .map((m) => m.content.toLowerCase())
      .join(" ");

    let contentType = "";
    if (
      allUserContent.includes("instagram stories") ||
      allUserContent.includes("story")
    ) {
      contentType = "Instagram Stories";
    } else if (
      allUserContent.includes("instagram") ||
      allUserContent.includes("feed post")
    ) {
      contentType = "Instagram Posts";
    } else if (allUserContent.includes("linkedin")) {
      contentType = "LinkedIn Content";
    } else if (allUserContent.includes("social media")) {
      contentType = "Social Media Content";
    } else if (allUserContent.includes("logo")) {
      contentType = "Logo Design";
    } else if (allUserContent.includes("video")) {
      contentType = "Video Content";
    } else if (
      allUserContent.includes("website") ||
      allUserContent.includes("web")
    ) {
      contentType = "Web Design";
    }

    let quantity = "";
    if (
      allUserContent.includes("series") ||
      allUserContent.includes("multiple") ||
      allUserContent.includes("pack")
    ) {
      quantity = "Series";
    }

    if (contentType && quantity) {
      return `${contentType} ${quantity}`;
    } else if (contentType) {
      return contentType;
    }

    const content = userMessages[0].content;
    const contentStr =
      typeof content === "string" ? content : String(content || "New Request");
    return contentStr.length > 40
      ? contentStr.substring(0, 40) + "..."
      : contentStr;
  };

  const chatTitle = seamlessTransition ? getChatTitle() : null;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStartOverDialog, setShowStartOverDialog] = useState(false);

  const handleDeleteChat = () => {
    deleteDraft(draftId);
    onDraftUpdate?.();
    router.push("/dashboard");
  };

  // Start Over - Clear conversation and start fresh
  const handleStartOver = () => {
    // Reset all state
    setMessages([]);
    setPendingTask(null);
    setSelectedStyles([]);
    setSelectedDeliverableStyles([]);
    setCurrentDeliverableType(null);
    setStyleOffset({});
    setExcludedStyleAxes([]);
    setUploadedFiles([]);
    setTaskSubmitted(false);
    setShowManualSubmit(false);
    setHasRequestedTaskSummary(false);
    clearMoodboard();
    setCompletedTypingIds(new Set());

    // Delete the draft
    if (draftId) {
      deleteDraft(draftId);
      onDraftUpdate?.();
    }

    // Navigate to fresh chat
    router.push("/dashboard");
    setShowStartOverDialog(false);
  };

  // Edit Last Message - Allow user to edit and re-send
  const handleEditLastMessage = () => {
    const lastUserMsgIndex = [...messages]
      .reverse()
      .findIndex((m) => m.role === "user");
    if (lastUserMsgIndex === -1) return;

    const actualIndex = messages.length - 1 - lastUserMsgIndex;
    const msgToEdit = messages[actualIndex];

    // Put the message content back in the input
    setInput(msgToEdit.content);

    // Remove all messages from this one onwards
    setMessages((prev) => prev.slice(0, actualIndex));

    // Clear any pending task that was generated
    setPendingTask(null);
    setShowManualSubmit(false);

    // Focus the input
    inputRef.current?.focus();
  };

  // Find the index of the last user message for edit button
  const lastUserMessageIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        return i;
      }
    }
    return -1;
  }, [messages]);

  // Format date for side panel
  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Format task status for display
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; color: string; icon: React.ReactNode }
    > = {
      PENDING: {
        label: "Pending",
        color: "bg-yellow-500/10 text-yellow-500",
        icon: <Clock className="h-3 w-3" />,
      },
      ASSIGNED: {
        label: "Assigned",
        color: "bg-blue-500/10 text-blue-500",
        icon: <User className="h-3 w-3" />,
      },
      IN_PROGRESS: {
        label: "In Progress",
        color: "bg-primary/10 text-primary",
        icon: <Activity className="h-3 w-3" />,
      },
      PENDING_ADMIN_REVIEW: {
        label: "Under Review",
        color: "bg-orange-500/10 text-orange-500",
        icon: <AlertCircle className="h-3 w-3" />,
      },
      PENDING_REVIEW: {
        label: "Pending Review",
        color: "bg-purple-500/10 text-purple-500",
        icon: <Timer className="h-3 w-3" />,
      },
      REVISION_REQUESTED: {
        label: "Revision Requested",
        color: "bg-red-500/10 text-red-500",
        icon: <RotateCcw className="h-3 w-3" />,
      },
      COMPLETED: {
        label: "Completed",
        color: "bg-emerald-600/10 text-emerald-500",
        icon: <CheckCircle2 className="h-3 w-3" />,
      },
      CANCELLED: {
        label: "Cancelled",
        color: "bg-muted text-muted-foreground",
        icon: <X className="h-3 w-3" />,
      },
    };
    return (
      statusMap[status] || {
        label: status,
        color: "bg-muted text-muted-foreground",
        icon: <Info className="h-3 w-3" />,
      }
    );
  };

  // Get chat creation date (from first message or task creation date)
  const chatCreatedAt =
    isTaskMode && taskData?.createdAt
      ? new Date(taskData.createdAt)
      : messages.length > 0
      ? messages[0].timestamp
      : new Date();

  return (
    <ChatLayout
      currentStage={progressState.currentStage}
      completedStages={progressState.completedStages}
      progressPercentage={progressState.progressPercentage}
      moodboardItems={moodboardItems}
      onRemoveMoodboardItem={removeMoodboardItem}
      onClearMoodboard={clearMoodboard}
      brief={brief}
      onBriefUpdate={updateBrief}
      onExportBrief={exportBrief}
      briefCompletion={Math.max(
        briefCompletion,
        progressState.progressPercentage
      )}
      showProgress={false}
      showMoodboard={seamlessTransition && !isTaskMode && showRightPanel}
      showBrief={seamlessTransition && !isTaskMode && showRightPanel}
      className={cn(seamlessTransition ? "h-full" : "h-[calc(100vh-12rem)]")}
    >
      <div
        className="flex flex-col h-full relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl flex items-center justify-center"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-medium text-foreground">
                  Drop files here
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Images, videos, PDFs, and more
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat header - removed Start Over and delete buttons per user request */}

        {/* Delete confirmation dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-card border-border max-w-md">
            <AlertDialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
              <AlertDialogTitle className="text-center text-foreground">
                Delete this chat?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-muted-foreground">
                This will permanently delete this conversation and all its
                messages. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center gap-3 mt-4">
              <AlertDialogCancel className="bg-transparent border-border text-foreground hover:bg-muted hover:text-foreground">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteChat}
                className="bg-red-500 text-white hover:bg-red-600 border-0"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Start Over confirmation dialog */}
        <AlertDialog
          open={showStartOverDialog}
          onOpenChange={setShowStartOverDialog}
        >
          <AlertDialogContent className="bg-card border-border max-w-md">
            <AlertDialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
                <RotateCcw className="h-6 w-6 text-amber-400" />
              </div>
              <AlertDialogTitle className="text-center text-foreground">
                Start fresh?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-muted-foreground">
                This will clear the current conversation and start a new one.
                Your moodboard and brief will also be reset.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center gap-3 mt-4">
              <AlertDialogCancel className="bg-transparent border-border text-foreground hover:bg-muted hover:text-foreground">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleStartOver}
                className="bg-amber-500 text-white hover:bg-amber-600 border-0"
              >
                Start Over
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Messages - scrollable area */}
        <ScrollArea className="flex-1 min-h-0" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4 px-4 sm:px-8 lg:px-16 max-w-4xl mx-auto">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={
                    seamlessTransition && index > 0
                      ? { opacity: 0, y: 10 }
                      : false
                  }
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" ? (
                    /* Assistant message - left aligned with sparkle avatar */
                    <div className="group max-w-[85%] flex items-start gap-3">
                      {/* Sparkle avatar */}
                      <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Thinking time indicator */}
                        {message.thinkingTime && (
                          <div className="flex items-center gap-1.5 mb-2 text-muted-foreground">
                            <Lightbulb className="h-3.5 w-3.5" />
                            <span className="text-xs">
                              Thought for {message.thinkingTime}s
                            </span>
                          </div>
                        )}
                        {/* Message content - clean text without heavy borders */}
                        <div className="bg-white/60 dark:bg-card/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/50">
                          {/* NOTE: Removed onOptionClick and multiSelect - markdown lists should render
                              as plain text, not clickable options. Quick options are handled separately
                              via the quickOptions system from the API response. */}
                          <TypingText
                            content={message.content}
                            animate={animatingMessageId === message.id}
                            speed={25}
                            onComplete={() => {
                              if (animatingMessageId === message.id) {
                                setAnimatingMessageId(null);
                                // Mark this message's typing as complete to show CTAs
                                setCompletedTypingIds((prev) =>
                                  new Set(prev).add(message.id)
                                );
                              }
                            }}
                            className="prose prose-sm max-w-none dark:prose-invert [&>p]:mb-3 [&>ul]:mb-3 [&>ol]:mb-3 [&>p:last-child]:mb-0 text-foreground"
                          />

                          {/* Attachments */}
                          {message.attachments &&
                            message.attachments.length > 0 && (
                              <div className="mt-3 ml-8">
                                <FileAttachmentList
                                  files={message.attachments}
                                />
                              </div>
                            )}

                          {/* Style References - only show after typing completes */}
                          {message.styleReferences &&
                            message.styleReferences.length > 0 &&
                            (animatingMessageId !== message.id ||
                              completedTypingIds.has(message.id)) && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-5 ml-8"
                              >
                                <p className="text-sm font-medium mb-4 text-foreground">
                                  Which style direction resonates with you?
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
                                  {message.styleReferences
                                    .slice(0, 3)
                                    .map((style, idx) => {
                                      const isHovered =
                                        hoveredStyleName === style.name;
                                      const isSelected =
                                        selectedStyles.includes(style.name);
                                      return (
                                        <div
                                          key={`${style.name}-${idx}`}
                                          role="button"
                                          tabIndex={0}
                                          aria-pressed={isSelected}
                                          aria-label={`Select ${style.name} style`}
                                          className={cn(
                                            "relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200",
                                            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                            isHovered &&
                                              "scale-110 z-10 shadow-2xl",
                                            isSelected
                                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xl"
                                              : isHovered &&
                                                  "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                                          )}
                                          onClick={() =>
                                            handleStyleSelect(style.name)
                                          }
                                          onMouseEnter={() =>
                                            setHoveredStyleName(style.name)
                                          }
                                          onMouseLeave={() =>
                                            setHoveredStyleName(null)
                                          }
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === "Enter" ||
                                              e.key === " "
                                            ) {
                                              e.preventDefault();
                                              handleStyleSelect(style.name);
                                            }
                                          }}
                                        >
                                          {/* Selection indicator */}
                                          {isSelected && (
                                            <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                                              <Check className="h-4 w-4 text-primary-foreground" />
                                            </div>
                                          )}

                                          {/* Image */}
                                          <div className="aspect-[4/3] bg-muted overflow-hidden">
                                            {style.imageUrl ? (
                                              <img
                                                src={style.imageUrl}
                                                alt={style.name}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                              </div>
                                            )}
                                          </div>

                                          {/* Hover overlay with name - only visible on THIS card */}
                                          {(isHovered || isSelected) && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-200">
                                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                                <p className="text-white text-sm font-semibold">
                                                  {style.name}
                                                </p>
                                                {style.description && (
                                                  <p className="text-white/80 text-xs line-clamp-2 mt-1">
                                                    {style.description}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                                <div className="flex items-center justify-between mt-3">
                                  <p className="text-xs text-muted-foreground ml-1">
                                    Click to select · You can pick multiple or
                                    describe something else
                                  </p>
                                  {selectedStyles.length > 0 && (
                                    <Button
                                      onClick={handleSubmitStyles}
                                      disabled={isLoading}
                                      size="sm"
                                      className="gap-2"
                                    >
                                      Continue with{" "}
                                      {selectedStyles.length === 1
                                        ? "style"
                                        : `${selectedStyles.length} styles`}
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </motion.div>
                            )}

                          {/* Deliverable Style References - only show after typing completes */}
                          {message.deliverableStyles &&
                            message.deliverableStyles.length > 0 &&
                            (animatingMessageId !== message.id ||
                              completedTypingIds.has(message.id)) && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="mt-5 ml-8"
                              >
                                {/* Only show full grid for the most recent message with styles */}
                                {index === lastStyleMessageIndex ? (
                                  <div className="space-y-4">
                                    <StyleSelectionGrid
                                      styles={message.deliverableStyles}
                                      collectionStyleIds={moodboardStyleIds}
                                      onAddToCollection={handleAddToCollection}
                                      onRemoveFromCollection={
                                        handleRemoveFromCollection
                                      }
                                      onConfirmSelection={
                                        handleConfirmStyleSelection
                                      }
                                      onShowMore={handleShowMoreStyles}
                                      onShowDifferent={
                                        handleShowDifferentStyles
                                      }
                                      isLoading={
                                        isLoading || index < messages.length - 1
                                      }
                                    />
                                    {/* Inline collection - shows collected styles (hidden when using new flow) */}
                                    {false && moodboardStyleIds.length > 0 && (
                                      <InlineCollection
                                        items={moodboardItems.filter(
                                          (i) => i.type === "style"
                                        )}
                                        onRemoveItem={removeMoodboardItem}
                                        onClearAll={handleClearStyleCollection}
                                        onContinue={() =>
                                          handleSubmitDeliverableStyles(
                                            message.deliverableStyles || []
                                          )
                                        }
                                        isLoading={
                                          isLoading ||
                                          index < messages.length - 1
                                        }
                                      />
                                    )}
                                  </div>
                                ) : (
                                  /* Collapsed summary for older style messages */
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Palette className="h-4 w-4" />
                                    <span>
                                      {Math.min(
                                        3,
                                        message.deliverableStyles.length
                                      )}{" "}
                                      style options shown
                                    </span>
                                    {moodboardStyleIds.length > 0 && (
                                      <span className="text-primary">
                                        •{" "}
                                        {
                                          moodboardStyleIds.filter((id) =>
                                            message.deliverableStyles?.some(
                                              (s) => s.id === id
                                            )
                                          ).length
                                        }{" "}
                                        in collection
                                      </span>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            )}

                          {/* Video References - for launch videos and video ads */}
                          {message.videoReferences &&
                            message.videoReferences.length > 0 &&
                            (animatingMessageId !== message.id ||
                              completedTypingIds.has(message.id)) && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.2 }}
                                className="mt-5 ml-8"
                              >
                                <VideoReferenceGrid
                                  videos={message.videoReferences}
                                  onSelectVideo={handleSelectVideo}
                                  isLoading={isLoading}
                                  title="Video Style References"
                                />
                              </motion.div>
                            )}

                          {/* Task Proposal - with actions when it's the pending task */}
                          {message.taskProposal && (
                            <div className="mt-4 ml-8">
                              <TaskProposalCard
                                proposal={message.taskProposal}
                                showActions={
                                  pendingTask?.title ===
                                  message.taskProposal.title
                                }
                                onSubmit={handleOpenSubmissionModal}
                                onMakeChanges={handleRejectTask}
                                isLoading={isLoading}
                                userCredits={userCredits}
                              />
                            </div>
                          )}

                          {/* Quick Options removed - using input field suggestions instead */}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* User message - beige/cream bubble with edit icon and avatar */
                    <div className="max-w-[75%] group">
                      <div className="flex flex-col items-end">
                        {/* Selected style image - shows above the text when style was selected */}
                        {message.selectedStyle &&
                          message.selectedStyle.imageUrl && (
                            <div className="mb-2 rounded-xl overflow-hidden max-w-[200px] border-2 border-emerald-300 dark:border-emerald-700 shadow-sm">
                              <img
                                src={message.selectedStyle.imageUrl}
                                alt={message.selectedStyle.name}
                                className="w-full h-auto object-cover"
                                onError={(e) => {
                                  // Hide image if it fails to load
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </div>
                          )}
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl px-4 py-3 relative border border-emerald-200/50 dark:border-emerald-800/30 w-fit">
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {message.content}
                          </p>
                          {/* Edit icon - appears on hover for last message */}
                          {index === lastUserMessageIndex &&
                            !isLoading &&
                            !isTaskMode &&
                            !pendingTask && (
                              <button
                                onClick={handleEditLastMessage}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-emerald-200/50 dark:hover:bg-emerald-800/30 hover:text-foreground transition-all"
                                title="Edit this message"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                        </div>
                        {/* User attachments */}
                        {message.attachments &&
                          message.attachments.length > 0 && (
                            <div className="mt-2">
                              <FileAttachmentList files={message.attachments} />
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Enhanced loading indicator with progressive messages */}
            {isLoading && (
              <LoadingIndicator
                requestStartTime={requestStartTimeRef.current}
              />
            )}

            {/* Inline submit prompt - shown as an AI message when ready to submit */}
            {!isLoading &&
              !pendingTask &&
              !isTaskMode &&
              (() => {
                // Check if the last assistant message asked a question (ends with ?)
                const lastAssistantMsg = messages
                  .filter((m) => m.role === "assistant")
                  .pop();
                const lastMsg = messages[messages.length - 1];
                const aiJustAskedQuestion =
                  lastMsg?.role === "assistant" &&
                  lastAssistantMsg?.content?.trim().endsWith("?");

                // Don't show submit prompt if AI just asked a question
                if (aiJustAskedQuestion) return null;

                // Don't show immediately after a style selection
                const lastUserMessage = messages
                  .filter((m) => m.role === "user")
                  .slice(-1)[0];
                const lastUserWasStyleSelection =
                  lastUserMessage?.content?.includes("style selected") ||
                  lastUserMessage?.content?.includes("Style selected") ||
                  lastUserMessage?.selectedStyle != null;

                // Show when AI indicates ready or user has enough context
                // BUT not right after a style selection (let user respond first)
                const shouldShow =
                  showManualSubmit ||
                  (moodboardItems.length > 0 &&
                    messages.filter((m) => m.role === "user").length >= 3 &&
                    !lastUserWasStyleSelection);

                if (!shouldShow) return null;

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-start"
                  >
                    <div className="group max-w-[85%] flex items-start gap-3">
                      {/* Sparkle avatar - matching assistant messages */}
                      <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Message bubble with submit prompt */}
                        <div className="bg-white/60 dark:bg-card/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/50">
                          <p className="text-sm text-foreground mb-3">
                            {showManualSubmit
                              ? "Looking good! When you're ready, I can generate a summary of your design brief for review."
                              : "I see you've been building your moodboard. Ready to move forward? I can create a summary of your design brief whenever you'd like."}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={handleRequestTaskSummary}
                              disabled={isLoading}
                              size="sm"
                              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              Generate Summary
                            </Button>
                            <span className="text-xs text-muted-foreground self-center">
                              or keep chatting to add more details
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="shrink-0 mt-auto pt-4 pb-6 px-4 sm:px-8 lg:px-16 max-w-4xl mx-auto w-full">
          {/* Pending uploads preview */}
          {uploadedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedFiles.filter(Boolean).map((file) => {
                if (!file || !file.fileUrl) return null;
                return (
                  <div
                    key={file.fileUrl}
                    className="relative group flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border"
                  >
                    {file.fileType?.startsWith("image/") ? (
                      <img
                        src={file.fileUrl}
                        alt={file.fileName || "Uploaded file"}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="text-sm max-w-[100px] truncate text-foreground">
                      {file.fileName || "File"}
                    </span>
                    <button
                      onClick={() => removeFile(file.fileUrl)}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick submit button - positioned above input on the right */}
          {messages.length > 0 && !pendingTask && !isLoading && (
            <div className="flex justify-end mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRequestTaskSummary}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-7 px-3"
              >
                <Sparkles className="h-3.5 w-3.5" />
                You decide & submit
              </Button>
            </div>
          )}

          {/* Modern input box - matching design reference */}
          <div className="border border-border rounded-2xl bg-white/90 dark:bg-card/90 backdrop-blur-sm overflow-hidden shadow-sm">
            {/* Input field with auto-resize and ghost text */}
            <div className="relative">
              {/* Ghost text suggestion overlay */}
              {ghostText && (
                <div className="absolute inset-0 px-4 py-4 pointer-events-none flex items-start">
                  <span className="text-sm text-transparent">{input}</span>
                  <span className="text-sm text-muted-foreground/40">
                    {ghostText}
                  </span>
                </div>
              )}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize textarea
                  const target = e.target;
                  target.style.height = "auto";
                  target.style.height =
                    Math.min(target.scrollHeight, 200) + "px";
                }}
                onKeyDown={(e) => {
                  // Tab to accept suggestion (smart completion or quick option)
                  if (e.key === "Tab" && ghostText) {
                    e.preventDefault();
                    // For smart completions, append the completion
                    if (smartCompletion && input.trim().length >= 3) {
                      setInput(input.trim() + " " + smartCompletion);
                      setSmartCompletion(null); // Clear so new completions can generate
                    } else if (currentSuggestion) {
                      // For quick options, use the full suggestion
                      setInput(currentSuggestion);
                    }
                  }
                  // Arrow down to cycle through quick options (only when empty)
                  else if (
                    e.key === "ArrowDown" &&
                    quickOptionSuggestion &&
                    !input.trim()
                  ) {
                    e.preventDefault();
                    setSuggestionIndex((prev) => prev + 1);
                  }
                  // Arrow up to cycle back through quick options
                  else if (
                    e.key === "ArrowUp" &&
                    quickOptionSuggestion &&
                    !input.trim()
                  ) {
                    e.preventDefault();
                    setSuggestionIndex((prev) => Math.max(0, prev - 1));
                  }
                  // Escape to clear smart completion
                  else if (e.key === "Escape" && smartCompletion) {
                    setSmartCompletion(null);
                  }
                  // Submit on Enter (without shift) or Cmd/Ctrl+Enter
                  else if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  ghostText
                    ? "" // Hide placeholder when showing ghost text
                    : messages.length === 0
                    ? "What would you like to create today?"
                    : "Type your message..."
                }
                disabled={isLoading}
                rows={1}
                className="w-full bg-transparent px-4 py-4 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm resize-none min-h-[52px] max-h-[200px] transition-all relative z-10"
                style={{ height: "auto", overflow: "hidden" }}
              />
              {/* Tab hint - show different hints based on context */}
              {ghostText && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3 text-xs z-0 pointer-events-none">
                  {/* Show arrow keys only when empty and have quick options */}
                  {!input.trim() && quickOptionSuggestion && (
                    <>
                      <div className="flex items-center gap-1.5 text-muted-foreground/60">
                        <div className="flex items-center gap-0.5">
                          <kbd className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/60 text-[11px] font-medium shadow-sm">
                            ↑
                          </kbd>
                          <kbd className="px-1.5 py-0.5 rounded bg-muted/60 border border-border/60 text-[11px] font-medium shadow-sm">
                            ↓
                          </kbd>
                        </div>
                        <span className="text-[11px]">browse</span>
                      </div>
                      <span className="text-muted-foreground/30">•</span>
                    </>
                  )}
                  <div className="flex items-center gap-1.5 text-muted-foreground/60">
                    <kbd className="px-2 py-0.5 rounded bg-muted/60 border border-border/60 text-[11px] font-medium shadow-sm">
                      Tab
                    </kbd>
                    <span className="text-[11px]">
                      {input.trim() ? "insert suggestion" : "use suggestion"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
              {/* Left toolbar */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    multiple
                    accept="image/*,video/*,.pdf,.zip,.rar,.pptx,.ppt,.doc,.docx,.ai,.eps,.psd"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Attach files"
                  >
                    {isUploading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    title="Add image"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                </div>
                {/* Divider */}
                <div className="h-4 w-px bg-border" />
                {/* Credits indicator */}
                <div className="flex items-center gap-1.5 text-sm">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      userCredits === 0
                        ? "bg-red-500"
                        : userCredits < 15
                        ? "bg-amber-500"
                        : "bg-emerald-600"
                    )}
                  />
                  <span className="text-muted-foreground">
                    {userCredits} credits available
                  </span>
                </div>
                {/* Word count hint - only show when user starts typing */}
                {input.trim().length > 0 &&
                  (() => {
                    const wordCount = input
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean).length;
                    const solidPromptWords = 10;
                    const greatPromptWords = 20;

                    // Calculate progress percentage for the gradient bar
                    const progress = Math.min(
                      (wordCount / greatPromptWords) * 100,
                      100
                    );

                    if (wordCount >= greatPromptWords) {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-xs font-medium text-emerald-600">
                              Great detail!
                            </span>
                          </div>
                        </div>
                      );
                    } else if (wordCount >= solidPromptWords) {
                      const wordsNeeded = greatPromptWords - wordCount;
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            +{wordsNeeded} for best results
                          </span>
                        </div>
                      );
                    } else {
                      const wordsNeeded = solidPromptWords - wordCount;
                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-400 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-rose-500 dark:text-rose-400">
                            +{wordsNeeded} for a solid prompt
                          </span>
                        </div>
                      );
                    }
                  })()}
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSend}
                  disabled={
                    (!input.trim() && uploadedFiles.length === 0) || isLoading
                  }
                  className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : "Submit"}
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced empty state with quick start suggestions */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-4 space-y-4"
            >
              {/* Popular requests - clickable cards */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Instagram Carousel",
                    prompt: "Create a 5-slide Instagram carousel about ",
                    icon: LayoutGrid,
                    hint: "5 slides",
                  },
                  {
                    label: "Story Series",
                    prompt: "Design Instagram stories to promote ",
                    icon: Share2,
                    hint: "3-5 stories",
                  },
                  {
                    label: "LinkedIn Post",
                    prompt: "Create a professional LinkedIn post announcing ",
                    icon: Bookmark,
                    hint: "1 image",
                  },
                  {
                    label: "Ad Campaign",
                    prompt: "Design ads for a campaign promoting ",
                    icon: Megaphone,
                    hint: "multi-size",
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setInput(item.prompt);
                      inputRef.current?.focus();
                    }}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border transition-all text-left group",
                      "bg-white/60 dark:bg-card/60 backdrop-blur-sm",
                      "hover:border-emerald-500/50 hover:bg-white dark:hover:bg-card hover:shadow-md",
                      "border-border/50"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-600/20 transition-colors">
                      <item.icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.hint}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Keyboard hint */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
                  {typeof navigator !== "undefined" &&
                  /Mac/.test(navigator.userAgent)
                    ? "⌘"
                    : "Ctrl"}
                </kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">
                  Enter
                </kbd>
                <span className="ml-1">to send</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Style Detail Modal */}
      <StyleDetailModal
        style={selectedStyleForModal}
        isOpen={!!selectedStyleForModal}
        onClose={() => setSelectedStyleForModal(null)}
        isInCollection={
          selectedStyleForModal
            ? hasMoodboardItem(selectedStyleForModal.id)
            : false
        }
        onAddToCollection={handleAddToCollection}
        onRemoveFromCollection={handleRemoveFromCollection}
      />

      {/* Task Submission Modal */}
      <TaskSubmissionModal
        isOpen={showSubmissionModal}
        onClose={() => setShowSubmissionModal(false)}
        onConfirm={handleConfirmTask}
        onMakeChanges={handleRejectTask}
        taskProposal={pendingTask}
        moodboardItems={moodboardItems}
        userCredits={userCredits}
        isSubmitting={isLoading}
      />

      {/* Credit Purchase Dialog */}
      <CreditPurchaseDialog
        open={showCreditDialog}
        onOpenChange={setShowCreditDialog}
        requiredCredits={pendingTask?.creditsRequired || 0}
        currentCredits={userCredits}
        pendingTaskState={
          pendingTask ? { taskProposal: pendingTask, draftId } : undefined
        }
      />
    </ChatLayout>
  );
}
