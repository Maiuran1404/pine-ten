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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/shared/loading";
import {
  Plus,
  Trash2,
  Search,
  Video,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Play,
  Upload,
  Tag,
  ExternalLink,
  Youtube,
  X,
} from "lucide-react";
import {
  STYLE_AXES,
  VIDEO_STYLE_TAGS,
  VIDEO_DELIVERABLE_TYPES,
  type StyleAxis,
} from "@/lib/constants/reference-libraries";
import { StatCard } from "@/components/admin/stat-card";
import { cn } from "@/lib/utils";

interface VideoReference {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  videoUrl: string;
  videoThumbnailUrl: string | null;
  videoDuration: string | null;
  videoTags: string[];
  deliverableType: string;
  styleAxis: string;
  featuredOrder: number;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

const defaultFormState = {
  videoUrl: "",
  name: "",
  description: "",
  styleAxis: "bold" as StyleAxis,
  deliverableType: "launch_video",
  videoTags: [] as string[],
  videoDuration: "",
  featuredOrder: 0,
};

// Tag selector component
function TagSelector({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  const [customTag, setCustomTag] = useState("");

  const toggleTag = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  const addCustomTag = () => {
    const tag = customTag.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !selected.includes(tag)) {
      onChange([...selected, tag]);
      setCustomTag("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {VIDEO_STYLE_TAGS.map((tag) => (
          <Badge
            key={tag}
            variant={selected.includes(tag) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleTag(tag)}
          >
            {tag}
          </Badge>
        ))}
      </div>
      {/* Custom tags */}
      {selected.filter((t) => !(VIDEO_STYLE_TAGS as readonly string[]).includes(t)).length >
        0 && (
        <div className="flex flex-wrap gap-2">
          {selected
            .filter((t) => !(VIDEO_STYLE_TAGS as readonly string[]).includes(t))
            .map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag} <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="Add custom tag..."
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustomTag();
            }
          }}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addCustomTag}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

// Extract YouTube video ID from various URL formats
function extractVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// YouTube embed modal
function VideoPreviewModal({
  video,
  onClose,
}: {
  video: VideoReference;
  onClose: () => void;
}) {
  const videoId = extractVideoId(video.videoUrl);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>{video.name}</DialogTitle>
          {video.description && (
            <DialogDescription>{video.description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="aspect-video w-full bg-black">
          {videoId ? (
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={video.name}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <div className="text-center">
                <p className="text-muted-foreground">Unable to load video</p>
                {video.videoUrl && (
                  <p className="text-xs text-muted-foreground mt-2 font-mono">
                    URL: {video.videoUrl}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 flex items-center justify-between border-t">
          <div className="flex flex-wrap gap-2">
            {video.videoTags?.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          {video.videoUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(video.videoUrl, "_blank")}
              className="gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open on YouTube
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function VideoReferencesPage() {
  const [videos, setVideos] = useState<VideoReference[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoReference | null>(null);
  const [formState, setFormState] = useState(defaultFormState);
  const [previewVideo, setPreviewVideo] = useState<VideoReference | null>(null);
  const [activeTab, setActiveTab] = useState("browse");

  // Bulk import state
  const [bulkUrls, setBulkUrls] = useState("");
  const [bulkTags, setBulkTags] = useState<string[]>([]);
  const [bulkStyleAxis, setBulkStyleAxis] = useState<StyleAxis>("bold");
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch("/api/admin/video-references");
      if (response.ok) {
        const result = await response.json();
        setVideos(result.data?.videos || []);
        setAllTags(result.data?.tags || []);
      }
    } catch (error) {
      console.error("Failed to fetch video references:", error);
      toast.error("Failed to load video references");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingVideo(null);
    setFormState(defaultFormState);
    setDialogOpen(true);
  };

  const openEditDialog = (video: VideoReference) => {
    setEditingVideo(video);
    setFormState({
      videoUrl: video.videoUrl,
      name: video.name,
      description: video.description || "",
      styleAxis: video.styleAxis as StyleAxis,
      deliverableType: video.deliverableType,
      videoTags: video.videoTags || [],
      videoDuration: video.videoDuration || "",
      featuredOrder: video.featuredOrder,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formState.videoUrl) {
      toast.error("Please provide a YouTube URL");
      return;
    }

    setIsSaving(true);
    try {
      if (editingVideo) {
        const response = await fetch("/api/admin/video-references", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingVideo.id,
            ...formState,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || "Failed to update");
        }

        const result = await response.json();
        setVideos((prev) =>
          prev.map((v) => (v.id === editingVideo.id ? result.data.video : v))
        );
        toast.success("Video reference updated!");
      } else {
        const response = await fetch("/api/admin/video-references", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formState),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error?.message || "Failed to create");
        }

        const result = await response.json();
        setVideos((prev) => [result.data.video, ...prev]);
        toast.success("Video reference added!");
      }

      setDialogOpen(false);
      setFormState(defaultFormState);
      setEditingVideo(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save video reference"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/video-references?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setVideos((prev) => prev.filter((v) => v.id !== id));
      toast.success("Video reference deleted");
    } catch {
      toast.error("Failed to delete video reference");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (video: VideoReference) => {
    setTogglingId(video.id);
    try {
      const response = await fetch("/api/admin/video-references", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: video.id, isActive: !video.isActive }),
      });

      if (!response.ok) throw new Error("Failed to toggle");

      const result = await response.json();
      setVideos((prev) =>
        prev.map((v) => (v.id === video.id ? result.data.video : v))
      );
      toast.success(
        result.data.video.isActive ? "Video activated" : "Video deactivated"
      );
    } catch {
      toast.error("Failed to toggle status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleBulkImport = async () => {
    const urls = bulkUrls
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urls.length === 0) {
      toast.error("Please enter at least one YouTube URL");
      return;
    }

    setIsBulkImporting(true);
    try {
      const response = await fetch("/api/admin/video-references/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videos: urls.map((url) => ({ url })),
          defaultTags: bulkTags,
          defaultStyleAxis: bulkStyleAxis,
          defaultDeliverableType: "launch_video",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to import");
      }

      const result = await response.json();
      const { summary } = result.data;

      toast.success(
        `Imported ${summary.imported} videos. ${summary.skipped} skipped, ${summary.failed} failed.`
      );

      // Refresh the list
      fetchVideos();
      setBulkDialogOpen(false);
      setBulkUrls("");
      setBulkTags([]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to import videos"
      );
    } finally {
      setIsBulkImporting(false);
    }
  };

  const filteredVideos = videos.filter((video) => {
    const matchesSearch =
      searchTerm === "" ||
      video.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.videoTags?.some((t) =>
        t.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesTag =
      tagFilter === "all" || video.videoTags?.includes(tagFilter);

    return matchesSearch && matchesTag;
  });

  const stats = {
    total: videos.length,
    active: videos.filter((v) => v.isActive).length,
    tagsCount: allTags.length,
    totalUsage: videos.reduce((sum, v) => sum + v.usageCount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Video References
          </h1>
          <p className="text-muted-foreground">
            Manage video style references for launch videos and video ads
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Import YouTube Videos</DialogTitle>
                <DialogDescription>
                  Paste YouTube URLs (one per line) to import multiple videos at
                  once.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>YouTube URLs (one per line)</Label>
                  <Textarea
                    value={bulkUrls}
                    onChange={(e) => setBulkUrls(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=abc123
https://youtu.be/xyz789
..."
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {bulkUrls.split("\n").filter((u) => u.trim()).length} URLs
                    entered
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Default Style Axis</Label>
                  <Select
                    value={bulkStyleAxis}
                    onValueChange={(v) => setBulkStyleAxis(v as StyleAxis)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLE_AXES.map((axis) => (
                        <SelectItem key={axis.value} value={axis.value}>
                          {axis.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Default Tags (applied to all)</Label>
                  <TagSelector selected={bulkTags} onChange={setBulkTags} />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setBulkDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleBulkImport} disabled={isBulkImporting}>
                  {isBulkImporting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Videos
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Video
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingVideo
                    ? "Edit Video Reference"
                    : "Add Video Reference"}
                </DialogTitle>
                <DialogDescription>
                  {editingVideo
                    ? "Update the video reference details"
                    : "Add a YouTube video as a style reference for launch videos"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="videoUrl">YouTube URL *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="videoUrl"
                      value={formState.videoUrl}
                      onChange={(e) =>
                        setFormState({ ...formState, videoUrl: e.target.value })
                      }
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-1"
                    />
                    {formState.videoUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          window.open(formState.videoUrl, "_blank")
                        }
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {formState.videoUrl && (
                    <div className="mt-2 aspect-video max-w-xs rounded-lg overflow-hidden bg-muted">
                      {(() => {
                        const videoId = formState.videoUrl.match(
                          /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
                        )?.[1];
                        return videoId ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                            alt="Video thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <p className="text-muted-foreground text-sm">
                              Invalid URL
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formState.name}
                      onChange={(e) =>
                        setFormState({ ...formState, name: e.target.value })
                      }
                      placeholder="e.g., Cinematic Product Launch"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={formState.videoDuration}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          videoDuration: e.target.value,
                        })
                      }
                      placeholder="e.g., 1:30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formState.description}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        description: e.target.value,
                      })
                    }
                    placeholder="Brief description of this video style..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deliverable Type</Label>
                    <Select
                      value={formState.deliverableType}
                      onValueChange={(value) =>
                        setFormState({ ...formState, deliverableType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VIDEO_DELIVERABLE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Style Axis</Label>
                    <Select
                      value={formState.styleAxis}
                      onValueChange={(value) =>
                        setFormState({
                          ...formState,
                          styleAxis: value as StyleAxis,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STYLE_AXES.map((axis) => (
                          <SelectItem key={axis.value} value={axis.value}>
                            {axis.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <TagSelector
                    selected={formState.videoTags}
                    onChange={(tags) =>
                      setFormState({ ...formState, videoTags: tags })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="featuredOrder">Featured Order</Label>
                  <Input
                    id="featuredOrder"
                    type="number"
                    value={formState.featuredOrder}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        featuredOrder: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower = shown first when featured
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <LoadingSpinner size="sm" />
                  ) : editingVideo ? (
                    "Update"
                  ) : (
                    "Add"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Videos" value={stats.total} icon={Video} />
          <StatCard
            label="Active"
            value={stats.active}
            subtext={`${stats.total - stats.active} inactive`}
            icon={Play}
          />
          <StatCard label="Unique Tags" value={stats.tagsCount} icon={Tag} />
          <StatCard
            label="Total Views"
            value={stats.totalUsage}
            subtext="In chat sessions"
            icon={Youtube}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            By Tag
          </TabsTrigger>
        </TabsList>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Video Grid */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-video w-full" />
              ))}
            </div>
          ) : filteredVideos.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Video className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">No Videos Found</h2>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  {searchTerm || tagFilter !== "all"
                    ? "Try adjusting your filters to see more results."
                    : "Add video references that will be shown to clients for launch videos and video ads."}
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Video
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVideos.map((video) => (
                <Card
                  key={video.id}
                  className={cn(
                    "overflow-hidden group",
                    !video.isActive && "opacity-60"
                  )}
                >
                  <div
                    className="aspect-video relative bg-muted cursor-pointer"
                    onClick={() => setPreviewVideo(video)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={video.videoThumbnailUrl || video.imageUrl}
                      alt={video.name}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        // Try fallback thumbnail
                        const img = e.target as HTMLImageElement;
                        const videoId = video.videoUrl.match(
                          /v=([a-zA-Z0-9_-]{11})/
                        )?.[1];
                        if (videoId && !img.src.includes("hqdefault")) {
                          img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        }
                      }}
                    />
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="h-8 w-8 text-black fill-black ml-1" />
                      </div>
                    </div>
                    {/* Duration badge */}
                    {video.videoDuration && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 rounded text-xs text-white">
                        {video.videoDuration}
                      </div>
                    )}
                    {/* Status badge */}
                    {!video.isActive && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary">Inactive</Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm truncate">
                          {video.name}
                        </h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {video.styleAxis} •{" "}
                          {video.deliverableType.replace(/_/g, " ")}
                        </p>
                      </div>
                      <div className="flex gap-0.5 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleToggleActive(video)}
                          disabled={togglingId === video.id}
                        >
                          {togglingId === video.id ? (
                            <LoadingSpinner size="sm" />
                          ) : video.isActive ? (
                            <ToggleRight className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(video)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(video.id)}
                          disabled={deletingId === video.id}
                        >
                          {deletingId === video.id ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {/* Tags */}
                    {video.videoTags && video.videoTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {video.videoTags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {video.videoTags.length > 3 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            +{video.videoTags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Videos by Tag</CardTitle>
              <CardDescription>
                Click a tag to filter videos. Tags help match videos to user
                requests.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allTags.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No tags yet. Add tags to videos to organize them.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const count = videos.filter((v) =>
                      v.videoTags?.includes(tag)
                    ).length;
                    return (
                      <Button
                        key={tag}
                        variant={tagFilter === tag ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setTagFilter(tagFilter === tag ? "all" : tag);
                          setActiveTab("browse");
                        }}
                      >
                        {tag}
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {count}
                        </Badge>
                      </Button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Video Preview Modal */}
      {previewVideo && (
        <VideoPreviewModal
          video={previewVideo}
          onClose={() => setPreviewVideo(null)}
        />
      )}
    </div>
  );
}
