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
import { LoadingSpinner } from "@/components/shared/loading";
import { Plus, Trash2, Search, Image as ImageIcon } from "lucide-react";

interface StyleReference {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  tags: string[];
  usageCount: number;
  isActive: boolean;
  createdAt: string;
}

const CATEGORIES = [
  "Modern",
  "Minimalist",
  "Bold",
  "Vintage",
  "Corporate",
  "Playful",
  "Elegant",
  "Tech",
  "Nature",
  "Abstract",
];

export default function StyleLibraryPage() {
  const [styles, setStyles] = useState<StyleReference[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStyle, setNewStyle] = useState({
    name: "",
    category: "",
    imageUrl: "",
    tags: "",
  });

  useEffect(() => {
    fetchStyles();
  }, []);

  const fetchStyles = async () => {
    try {
      const response = await fetch("/api/admin/styles");
      if (response.ok) {
        const data = await response.json();
        setStyles(data.styles || []);
      }
    } catch (error) {
      console.error("Failed to fetch styles:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newStyle.name || !newStyle.category || !newStyle.imageUrl) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStyle.name,
          category: newStyle.category,
          imageUrl: newStyle.imageUrl,
          tags: newStyle.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });

      if (!response.ok) throw new Error("Failed to create style");

      const data = await response.json();
      setStyles((prev) => [data.style, ...prev]);
      setNewStyle({ name: "", category: "", imageUrl: "", tags: "" });
      setDialogOpen(false);
      toast.success("Style reference created!");
    } catch {
      toast.error("Failed to create style reference");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/styles?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      setStyles((prev) => prev.filter((s) => s.id !== id));
      toast.success("Style reference deleted");
    } catch {
      toast.error("Failed to delete style reference");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredStyles = styles.filter((style) => {
    const matchesSearch =
      searchTerm === "" ||
      style.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      style.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      categoryFilter === "all" || style.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = [...new Set(styles.map((s) => s.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Style Library</h1>
          <p className="text-muted-foreground">
            Manage style references for task creation
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Style
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Style Reference</DialogTitle>
              <DialogDescription>
                Add a new style reference to the library
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newStyle.name}
                  onChange={(e) => setNewStyle({ ...newStyle, name: e.target.value })}
                  placeholder="e.g., Modern Tech Gradient"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newStyle.category}
                  onValueChange={(value) => setNewStyle({ ...newStyle, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={newStyle.imageUrl}
                  onChange={(e) => setNewStyle({ ...newStyle, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={newStyle.tags}
                  onChange={(e) => setNewStyle({ ...newStyle, tags: e.target.value })}
                  placeholder="gradient, blue, tech"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? <LoadingSpinner size="sm" /> : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search styles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Style References</CardTitle>
          <CardDescription>
            {filteredStyles.length} style{filteredStyles.length !== 1 ? "s" : ""} in library
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : filteredStyles.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No styles found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setDialogOpen(true)}
              >
                Add your first style
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredStyles.map((style) => (
                <Card key={style.id} className="overflow-hidden">
                  <div className="aspect-video relative bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={style.imageUrl}
                      alt={style.name}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://via.placeholder.com/400x225?text=Image+Not+Found";
                      }}
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{style.name}</h3>
                        <p className="text-sm text-muted-foreground">{style.category}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(style.id)}
                        disabled={deletingId === style.id}
                      >
                        {deletingId === style.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {style.tags?.slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Used {style.usageCount} times
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
