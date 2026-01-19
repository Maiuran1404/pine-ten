"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/shared/loading";
import { Save, RotateCcw, Info, MessageSquare, Video, ImageIcon, Sparkles, Palette, Wand2 } from "lucide-react";

interface CategoryPrompts {
  systemPrompt: string;
  decisionTree: string;
}

interface ChatPrompts {
  globalSystemPrompt: string;
  socialMediaContent: CategoryPrompts;
  socialMediaAds: CategoryPrompts;
  videoEdits: CategoryPrompts;
  branding: CategoryPrompts;
  custom: CategoryPrompts;
}

const DEFAULT_PROMPTS: ChatPrompts = {
  globalSystemPrompt: `You are a design project coordinator for Crafted Studio. Your job is to efficiently gather requirements for design tasks.

WHAT YOU AUTOMATICALLY APPLY (never ask about these):
- Brand colors, typography, logo rules, tone
- The brand's visual style (minimal/bold/editorial/playful)
- Known do/don't rules from Brand DNA
- Default export formats based on channel

FIRST QUESTION: Always start by asking "What would you like to create today?"
Options: Social Media Content, Social Media Ads, Video Edits, Branding, Something Custom`,

  socialMediaContent: {
    systemPrompt: `You are helping create organic social media content. Focus on engaging, shareable content that builds brand presence and community engagement.`,
    decisionTree: `=== SOCIAL MEDIA CONTENT DECISION TREE ===

Q1 - CONTENT TYPE: "What type of social content do you need?"
Options: Feed posts, Stories, Carousel, Mix of everything

Q2 - PLATFORM: "Which platform?"
Options: Instagram, LinkedIn, Twitter/X, TikTok, Multiple platforms

Q3 - QUANTITY: "How many pieces?"
Options: Single post, Small batch (3-5), Weekly pack (7+), Monthly calendar

Q4 - THEME/TOPIC: "What's the main focus?"
Options: Product/service highlight, Educational/tips, Behind the scenes, Promotional/sale, Brand awareness

BRIEF STATUS:
🟢 GREEN - All info collected → Ready to produce
🟡 YELLOW - Missing specifics → Can start with best guess`,
  },

  socialMediaAds: {
    systemPrompt: `You are helping create paid social media advertisements. Focus on conversion-driven content with clear CTAs and measurable goals.`,
    decisionTree: `=== SOCIAL MEDIA ADS DECISION TREE ===

STEP 1 - THE 3 CORE QUESTIONS (always ask these in order):

Q1 - GOAL: "What do you want the ad to do?"
Options: Get signups, Book a demo, Sell something, Bring people back (retargeting), Just get attention (awareness)

Q2 - CHANNEL: "Where will this run?"
Options: LinkedIn, Instagram / Facebook, Twitter / X, Snapchat, Not sure — you pick

AUTO-SET FORMATS based on channel:
- LinkedIn: 1:1 + 4:5
- Instagram/Facebook (Meta): 1:1 + 4:5 + 9:16
- Twitter/X: 1:1
- Snapchat: 1:1 + 4:5 + 9:16
- "Not sure/you pick": default to 1:1 + 4:5 + 9:16

Q3 - WHAT TO SHOW: "What should we feature?"
Options: Product screenshots, A bold text-only ad (clean + direct), People / lifestyle, Surprise me (recommended)

STEP 2 - CONDITIONAL QUESTION (only ask if goal is "Book a demo" or "Sell something"):

Q4 - THE PROMISE: "What's the main promise in one line?"
Options: Save time, Save money, Higher quality, More consistent, Better results, New feature, I'm not sure — write it for me

STEP 3 - OPTIONAL BOOST (only offer if they want to strengthen the ads):

Ask: "Want to make these stronger? Two quick taps."

BOOST Q1 - PROOF: Customer logos, A number/metric, A quote, None yet
BOOST Q2 - OBJECTION: Too expensive, Too complicated, Don't trust it, Already have a solution, None

BRIEF STATUS:
🟢 GREEN - Goal ✓, Channel ✓, What to show ✓ → "Perfect. That's all I need."
🟡 YELLOW - Goal is demo/sell but promise unclear → Ask or make best guess
🔴 RED - Missing goal or channel → "One tiny thing before we go."`,
  },

  videoEdits: {
    systemPrompt: `You are helping create video content including motion graphics, video ads, and video edits. Focus on engaging motion that captures attention.`,
    decisionTree: `=== VIDEO EDITS DECISION TREE ===

OPENER: "Got it. Since I already have your Brand DNA, this is going to be quick. Give me 2-4 taps and I'll send a clean brief to production. I'll keep everything on-brand — motion included."

STEP 1 - THE 2 MANDATORY QUESTIONS:

Q1 - GOAL: "What do you want this video to do?"
Options: Get signups, Book a demo, Sell something, Bring people back (retargeting), Just get attention, Explain/educate

Q2 - CHANNEL: "Where is this going?"
Options: LinkedIn, Instagram / Facebook, TikTok / Reels, YouTube, Website

AUTO-SET FORMATS:
- LinkedIn: 1:1 + 4:5
- Instagram/Facebook (Meta): 1:1 + 4:5
- TikTok/Reels: 9:16
- YouTube: 16:9
- Website: 16:9

STEP 2 - MOTION DIRECTION:

Q3 - "Which motion style feels right?"
Options:
- Clean Reveal (message appears step-by-step, calm & clear)
- Product Spotlight (zoom/pan + callouts to highlight product)
- Bold Hook (fast typography + punchy transitions)
- Surprise me

STEP 3 - CONDITIONAL QUESTIONS:

IF Goal = signups/demo/sell:
Q4 - THE PROMISE: "What's the best reason to click?"
Options: Save time, Save money, Better results, Higher quality, More consistent, New feature

IF Motion = "Product Spotlight":
Q4b - "Which part of the product should we spotlight?"
Options: Onboarding, Main feature, Dashboard/results, Automation/magic moment, You pick

BRIEF STATUS:
🟢 GREEN - Goal ✓, Channel ✓, Motion direction ✓ → "Perfect. We're moving."
🟡 YELLOW - Missing promise or product highlight → "Want to answer or should I decide?"
🔴 RED - Missing goal or channel → "One tiny thing before we go."`,
  },

  branding: {
    systemPrompt: `You are helping with branding projects including logos, brand guidelines, visual identity, and brand collateral.`,
    decisionTree: `=== BRANDING DECISION TREE ===

Q1 - PROJECT TYPE: "What branding work do you need?"
Options: Logo design, Brand guidelines, Visual identity refresh, Brand collateral, Full rebrand

Q2 - SCOPE: "What's the scope of this project?"
Options: Single deliverable, Small package (2-3 items), Comprehensive package

Q3 - EXISTING ASSETS: "Do you have existing brand assets?"
Options: Starting from scratch, Have some basics (logo, colors), Have full brand guidelines

Q4 - TIMELINE: "How urgent is this?"
Options: Standard timeline, Need it soon, Rush delivery

Q5 - STYLE DIRECTION: "What style direction are you thinking?"
Options: Minimal & clean, Bold & vibrant, Classic & professional, Modern & edgy, Not sure — show me options

BRIEF STATUS:
🟢 GREEN - Project type ✓, Scope ✓, Style ✓ → Ready to brief
🟡 YELLOW - Missing style direction → Can explore options
🔴 RED - Missing project type or scope → Need more info`,
  },

  custom: {
    systemPrompt: `You are helping with a custom design project. Gather all necessary details to understand the unique requirements.`,
    decisionTree: `=== CUSTOM PROJECT DECISION TREE ===

Q1 - PROJECT DESCRIPTION: "What would you like us to create?"
(Open-ended response)

Q2 - USE CASE: "Where/how will this be used?"
Options: Print, Digital, Presentation, Website, Marketing campaign, Other

Q3 - DELIVERABLES: "What files/formats do you need?"
Options: Design files (Figma/PSD), Export files (PNG/JPG/PDF), Both, Not sure

Q4 - REFERENCE: "Do you have any examples or references?"
Options: Yes, I'll share them, No references, Let me describe what I'm thinking

Q5 - TIMELINE: "When do you need this?"
Options: Standard timeline, Need it soon, Flexible

BRIEF STATUS:
🟢 GREEN - Clear description ✓, Use case ✓ → Ready to scope
🟡 YELLOW - Need more details → Ask clarifying questions
🔴 RED - Unclear request → Need more information`,
  },
};

export default function ChatSetupPage() {
  const [prompts, setPrompts] = useState<ChatPrompts>(DEFAULT_PROMPTS);
  const [savedPrompts, setSavedPrompts] = useState<ChatPrompts>(DEFAULT_PROMPTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, []);

  useEffect(() => {
    // Check if there are unsaved changes
    const changed = JSON.stringify(prompts) !== JSON.stringify(savedPrompts);
    setHasChanges(changed);
  }, [prompts, savedPrompts]);

  const fetchPrompts = async () => {
    try {
      const response = await fetch("/api/admin/chat-prompts");
      if (response.ok) {
        const data = await response.json();
        // API returns { success: true, data: { prompts: {...} } }
        const prompts = data.data?.prompts;
        if (prompts) {
          const merged = { ...DEFAULT_PROMPTS, ...prompts };
          setPrompts(merged);
          setSavedPrompts(merged);
        }
      }
    } catch (error) {
      console.error("Failed to fetch prompts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/chat-prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompts }),
      });

      if (!response.ok) throw new Error("Failed to save");

      setSavedPrompts(prompts);
      toast.success("Chat prompts saved and published successfully");
    } catch {
      toast.error("Failed to save prompts");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPrompts(DEFAULT_PROMPTS);
    toast.info("Reset to default prompts (not saved yet)");
  };

  const updateGlobalPrompt = (value: string) => {
    setPrompts((prev) => ({ ...prev, globalSystemPrompt: value }));
  };

  const updateCategoryPrompt = (
    category: keyof Omit<ChatPrompts, "globalSystemPrompt">,
    field: keyof CategoryPrompts,
    value: string
  ) => {
    setPrompts((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chat Setup</h1>
          <p className="text-muted-foreground">Configure how the AI chat interacts with clients</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chat Setup</h1>
          <p className="text-muted-foreground">Configure how the AI chat interacts with clients</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4 mr-2" />}
            Save & Publish
            {hasChanges && <Badge variant="secondary" className="ml-2">Unsaved</Badge>}
          </Button>
        </div>
      </div>

      {/* Overview Card */}
      <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-violet-400" />
            How Chat Setup Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Crafted chat uses decision trees to guide clients through creating design requests.
            When a client starts a chat, the AI first asks what type of content they want to create,
            then follows the appropriate decision tree based on their choice.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
              <MessageSquare className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Social Content</p>
                <p className="text-xs text-muted-foreground">Posts, stories, carousels</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
              <ImageIcon className="h-5 w-5 text-green-400 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Social Ads</p>
                <p className="text-xs text-muted-foreground">Paid social campaigns</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
              <Video className="h-5 w-5 text-purple-400 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Video Edits</p>
                <p className="text-xs text-muted-foreground">Motion & video content</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
              <Palette className="h-5 w-5 text-orange-400 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Branding</p>
                <p className="text-xs text-muted-foreground">Logos & brand assets</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
              <Wand2 className="h-5 w-5 text-pink-400 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Custom</p>
                <p className="text-xs text-muted-foreground">Unique projects</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decision Tree Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="social-content">Social Content</TabsTrigger>
          <TabsTrigger value="social-ads">Social Ads</TabsTrigger>
          <TabsTrigger value="video">Video Edits</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Global System Prompt
              </CardTitle>
              <CardDescription>
                The base system prompt that sets the AI&apos;s personality and automatic behaviors across all categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  value={prompts.globalSystemPrompt}
                  onChange={(e) => updateGlobalPrompt(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Enter the global system prompt..."
                />
                <p className="text-xs text-muted-foreground">
                  This prompt is always included at the start of every conversation. It sets the AI&apos;s role and what it should automatically apply.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chat Flow Summary</CardTitle>
              <CardDescription>How the conversation flows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Step 0: Initial Question</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  The AI first asks: <strong>&quot;What would you like to create today?&quot;</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Social Media Content</Badge>
                  <Badge variant="outline">Social Media Ads</Badge>
                  <Badge variant="outline">Video Edits</Badge>
                  <Badge variant="outline">Branding</Badge>
                  <Badge variant="outline">Custom</Badge>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Step 1: Apply Category System Prompt</h4>
                <p className="text-sm text-muted-foreground">
                  Based on the user&apos;s choice, the AI applies the category-specific system prompt
                  to set the right context for the conversation.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Step 2: Follow Decision Tree</h4>
                <p className="text-sm text-muted-foreground">
                  The AI follows the category&apos;s decision tree, asking targeted questions
                  to gather all required information.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Step 3: Generate Brief</h4>
                <p className="text-sm text-muted-foreground">
                  Once enough information is gathered, the AI generates a task brief summary
                  and asks if the client wants to tweak anything before submitting.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social-content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-400" />
                Social Media Content
              </CardTitle>
              <CardDescription>
                Organic social media content like posts, stories, and carousels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Category System Prompt</Label>
                <Textarea
                  value={prompts.socialMediaContent.systemPrompt}
                  onChange={(e) => updateCategoryPrompt("socialMediaContent", "systemPrompt", e.target.value)}
                  className="min-h-[100px] font-mono text-sm"
                  placeholder="Enter the category-specific system prompt..."
                />
                <p className="text-xs text-muted-foreground">
                  This prompt is added when the user selects Social Media Content.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Decision Tree</Label>
                <Textarea
                  value={prompts.socialMediaContent.decisionTree}
                  onChange={(e) => updateCategoryPrompt("socialMediaContent", "decisionTree", e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Enter the decision tree..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social-ads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-green-400" />
                Social Media Ads
              </CardTitle>
              <CardDescription>
                Paid social media advertisements and campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Category System Prompt</Label>
                <Textarea
                  value={prompts.socialMediaAds.systemPrompt}
                  onChange={(e) => updateCategoryPrompt("socialMediaAds", "systemPrompt", e.target.value)}
                  className="min-h-[100px] font-mono text-sm"
                  placeholder="Enter the category-specific system prompt..."
                />
                <p className="text-xs text-muted-foreground">
                  This prompt is added when the user selects Social Media Ads.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Decision Tree</Label>
                <Textarea
                  value={prompts.socialMediaAds.decisionTree}
                  onChange={(e) => updateCategoryPrompt("socialMediaAds", "decisionTree", e.target.value)}
                  className="min-h-[500px] font-mono text-sm"
                  placeholder="Enter the decision tree..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-purple-400" />
                Video Edits
              </CardTitle>
              <CardDescription>
                Motion graphics, video ads, and video content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Category System Prompt</Label>
                <Textarea
                  value={prompts.videoEdits.systemPrompt}
                  onChange={(e) => updateCategoryPrompt("videoEdits", "systemPrompt", e.target.value)}
                  className="min-h-[100px] font-mono text-sm"
                  placeholder="Enter the category-specific system prompt..."
                />
                <p className="text-xs text-muted-foreground">
                  This prompt is added when the user selects Video Edits.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Decision Tree</Label>
                <Textarea
                  value={prompts.videoEdits.decisionTree}
                  onChange={(e) => updateCategoryPrompt("videoEdits", "decisionTree", e.target.value)}
                  className="min-h-[500px] font-mono text-sm"
                  placeholder="Enter the decision tree..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-orange-400" />
                Branding
              </CardTitle>
              <CardDescription>
                Logos, brand guidelines, visual identity, and brand collateral
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Category System Prompt</Label>
                <Textarea
                  value={prompts.branding.systemPrompt}
                  onChange={(e) => updateCategoryPrompt("branding", "systemPrompt", e.target.value)}
                  className="min-h-[100px] font-mono text-sm"
                  placeholder="Enter the category-specific system prompt..."
                />
                <p className="text-xs text-muted-foreground">
                  This prompt is added when the user selects Branding.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Decision Tree</Label>
                <Textarea
                  value={prompts.branding.decisionTree}
                  onChange={(e) => updateCategoryPrompt("branding", "decisionTree", e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Enter the decision tree..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-pink-400" />
                Custom
              </CardTitle>
              <CardDescription>
                Unique and custom design projects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Category System Prompt</Label>
                <Textarea
                  value={prompts.custom.systemPrompt}
                  onChange={(e) => updateCategoryPrompt("custom", "systemPrompt", e.target.value)}
                  className="min-h-[100px] font-mono text-sm"
                  placeholder="Enter the category-specific system prompt..."
                />
                <p className="text-xs text-muted-foreground">
                  This prompt is added when the user selects Custom.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Decision Tree</Label>
                <Textarea
                  value={prompts.custom.decisionTree}
                  onChange={(e) => updateCategoryPrompt("custom", "decisionTree", e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Enter the decision tree..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
