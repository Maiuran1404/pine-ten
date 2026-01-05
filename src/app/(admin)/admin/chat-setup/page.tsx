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
import { Save, RotateCcw, Info, MessageSquare, Video, ImageIcon, Sparkles } from "lucide-react";

interface ChatPrompts {
  systemPrompt: string;
  staticAdsTree: string;
  dynamicAdsTree: string;
  socialMediaTree: string;
  creditGuidelines: string;
}

const DEFAULT_PROMPTS: ChatPrompts = {
  systemPrompt: `You are a design project coordinator for Crafted Studio. Your job is to efficiently gather requirements for design tasks.

WHAT YOU AUTOMATICALLY APPLY (never ask about these):
- Brand colors, typography, logo rules, tone
- The brand's visual style (minimal/bold/editorial/playful)
- Known do/don't rules from Brand DNA
- Default export formats based on channel`,

  staticAdsTree: `=== STATIC ADS DECISION TREE ===

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

  dynamicAdsTree: `=== DYNAMIC ADS / VIDEO DECISION TREE ===

OPENER: "Got it. Since I already have your Brand DNA, this is going to be quick. Give me 2-4 taps and I'll send a clean brief to production. I'll keep everything on-brand — motion included."

STEP 1 - THE 2 MANDATORY QUESTIONS:

Q1 - GOAL: "What do you want these ads to do?"
Options: Get signups, Book a demo, Sell something, Bring people back (retargeting), Just get attention

Q2 - CHANNEL: "Where are these going?"
Options: LinkedIn, Instagram / Facebook, TikTok / Reels

AUTO-SET FORMATS:
- LinkedIn: 1:1 + 4:5
- Instagram/Facebook (Meta): 1:1 + 4:5
- TikTok/Reels: 9:16

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

IF Goal = "Bring people back" (retargeting):
Q4c - "Who are we retargeting?"
Options: Visited site, Started signup, Saw pricing, Watched demo, You pick

Q4d - "What's the next step for them?"
Options: Start trial, Book demo, Finish signup, Go to pricing, Learn more

STEP 4 - OPTIONAL BOOST:
Ask: "Want to make these hit harder? Two quick taps."
BOOST 1 - PROOF: Customer logos, A metric/number, A quote, None yet
BOOST 2 - OBJECTION: Too expensive, Too complex, Don't trust it, Already have a solution, None

BRIEF STATUS:
🟢 GREEN - Goal ✓, Channel ✓, Motion direction ✓ → "Perfect. We're moving."
🟡 YELLOW - Missing promise or product highlight → "Want to answer or should I decide?"
🔴 RED - Missing goal or channel → "One tiny thing before we go."`,

  socialMediaTree: `=== SOCIAL MEDIA CONTENT TREE ===

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

  creditGuidelines: `Credit & delivery guidelines:
- Static ad set (5 concepts + 2 variants each): 2-3 credits, 3 business days
- Simple single ad: 1 credit, 2 business days
- Complex multi-format campaign: 3-4 credits, 3 business days
- Dynamic/video ads (3 concepts + 2 variants): 4-5 credits, 5 business days
- Short video (15-30 sec): 3 credits, 5 business days
- Longer video (30-60 sec): 5 credits, 7 business days
- Social media content pack: 2-3 credits, 3 business days`,
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
        if (data.prompts) {
          const merged = { ...DEFAULT_PROMPTS, ...data.prompts };
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

  const updatePrompt = (key: keyof ChatPrompts, value: string) => {
    setPrompts((prev) => ({ ...prev, [key]: value }));
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
              <ImageIcon className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Static Ads</p>
                <p className="text-xs text-muted-foreground">Graphics, banners, social images</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
              <Video className="h-5 w-5 text-green-400 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Dynamic/Video</p>
                <p className="text-xs text-muted-foreground">Motion graphics, video ads</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
              <MessageSquare className="h-5 w-5 text-orange-400 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Social Media</p>
                <p className="text-xs text-muted-foreground">Posts, stories, carousels</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decision Tree Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="static">Static Ads</TabsTrigger>
          <TabsTrigger value="dynamic">Video/Motion</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="credits">Credits</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                System Prompt
              </CardTitle>
              <CardDescription>
                The base system prompt that sets the AI&apos;s personality and automatic behaviors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  value={prompts.systemPrompt}
                  onChange={(e) => updatePrompt("systemPrompt", e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Enter the system prompt..."
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
                  The AI first asks: <strong>&quot;What would you like to create?&quot;</strong>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Static ads / graphics</Badge>
                  <Badge variant="outline">Video / motion content</Badge>
                  <Badge variant="outline">Social media content</Badge>
                  <Badge variant="outline">Something else</Badge>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Step 1: Follow Decision Tree</h4>
                <p className="text-sm text-muted-foreground">
                  Based on the user&apos;s choice, the AI follows the appropriate decision tree
                  (Static Ads, Dynamic/Video, or Social Media) asking targeted questions.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Step 2: Generate Brief</h4>
                <p className="text-sm text-muted-foreground">
                  Once enough information is gathered, the AI generates a task brief summary
                  and asks if the client wants to tweak anything before submitting.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="static" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-400" />
                Static Ads Decision Tree
              </CardTitle>
              <CardDescription>
                Questions and flow for static graphics, banners, and image ads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Decision Tree Configuration</Label>
                <Textarea
                  value={prompts.staticAdsTree}
                  onChange={(e) => updatePrompt("staticAdsTree", e.target.value)}
                  className="min-h-[500px] font-mono text-sm"
                  placeholder="Enter the static ads decision tree..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dynamic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-green-400" />
                Dynamic/Video Decision Tree
              </CardTitle>
              <CardDescription>
                Questions and flow for motion graphics and video ads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Decision Tree Configuration</Label>
                <Textarea
                  value={prompts.dynamicAdsTree}
                  onChange={(e) => updatePrompt("dynamicAdsTree", e.target.value)}
                  className="min-h-[500px] font-mono text-sm"
                  placeholder="Enter the dynamic ads decision tree..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-orange-400" />
                Social Media Content Tree
              </CardTitle>
              <CardDescription>
                Questions and flow for social media content creation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Decision Tree Configuration</Label>
                <Textarea
                  value={prompts.socialMediaTree}
                  onChange={(e) => updatePrompt("socialMediaTree", e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="Enter the social media decision tree..."
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Credit & Delivery Guidelines</CardTitle>
              <CardDescription>
                Define how many credits each type of task costs and delivery timelines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Guidelines</Label>
                <Textarea
                  value={prompts.creditGuidelines}
                  onChange={(e) => updatePrompt("creditGuidelines", e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                  placeholder="Enter credit and delivery guidelines..."
                />
                <p className="text-xs text-muted-foreground">
                  The AI uses these guidelines to estimate credits and delivery dates for each task.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
