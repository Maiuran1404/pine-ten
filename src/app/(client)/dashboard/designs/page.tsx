"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Folder,
  FileImage,
  FileCode,
  File,
  MoreHorizontal,
  Plus,
  Filter,
  ChevronDown,
  MessageCircle,
  FolderOpen,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// File type for the library
interface LibraryFile {
  id: string;
  name: string;
  size: string;
  type: "file" | "folder";
  fileType?: string;
  createdAt: string;
  permission: "Editor" | "View Only" | "Administrator";
  url?: string;
}

// Design from API
interface Design {
  id: string;
  templateId: string | null;
  templateName: string;
  imageUrl: string;
  imageFormat: string;
  savedToAssets: boolean;
  createdAt: string;
  templateCategory: string | null;
}

// Get file extension from filename or URL
function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });
}

// Convert design to library file format
function designToLibraryFile(design: Design): LibraryFile {
  return {
    id: design.id,
    name: `${design.templateName}.${design.imageFormat}`,
    size: "—",
    type: "file",
    fileType: design.imageFormat,
    createdAt: formatDate(design.createdAt),
    permission: "Editor",
    url: design.imageUrl,
  };
}

// Get file icon based on type
function getFileIcon(file: LibraryFile) {
  if (file.type === "folder") {
    return <Folder className="h-8 w-8 text-green-600" />;
  }

  const ext = file.fileType || getFileExtension(file.name);
  switch (ext) {
    case "pdf":
    case "doc":
    case "docx":
    case "txt":
      return <FileText className="h-8 w-8 text-green-600" />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return <FileImage className="h-8 w-8 text-green-600" />;
    case "tsx":
    case "jsx":
    case "html":
    case "css":
    case "js":
    case "ts":
      return <FileCode className="h-8 w-8 text-green-600" />;
    default:
      return <File className="h-8 w-8 text-green-600" />;
  }
}

// Get small file icon for table rows
function getSmallFileIcon(file: LibraryFile) {
  if (file.type === "folder") {
    return <Folder className="h-5 w-5 text-muted-foreground" />;
  }

  const ext = file.fileType || getFileExtension(file.name);
  switch (ext) {
    case "pdf":
    case "doc":
    case "docx":
    case "txt":
      return <FileText className="h-5 w-5 text-muted-foreground" />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
    case "webp":
      return <FileImage className="h-5 w-5 text-muted-foreground" />;
    case "tsx":
    case "jsx":
    case "html":
    case "css":
    case "js":
    case "ts":
      return <FileCode className="h-5 w-5 text-muted-foreground" />;
    default:
      return <File className="h-5 w-5 text-muted-foreground" />;
  }
}

// Permission badge colors
function getPermissionStyle(permission: string) {
  switch (permission) {
    case "Editor":
      return "bg-green-100 text-green-700 border-green-200";
    case "View Only":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "Administrator":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

// Empty state component
function EmptyState() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-6">
        <FolderOpen className="h-10 w-10 text-green-600" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">No assets yet</h3>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Completed task deliverables and generated designs will appear here.
      </p>
      <Button
        onClick={() => router.push("/dashboard")}
        className="gap-2 bg-green-600 hover:bg-green-700"
      >
        <MessageCircle className="h-4 w-4" />
        Start a Chat
      </Button>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Recent Files Skeleton */}
      <div>
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-4">
              <Skeleton className="h-12 w-12 rounded-lg mb-3" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <Skeleton className="h-4 w-full" />
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-3 border-b border-border last:border-b-0">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const router = useRouter();
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setSortOrder] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    fetchLibraryData();
  }, []);

  const fetchLibraryData = async () => {
    try {
      setIsLoading(true);
      const allFiles: LibraryFile[] = [];

      // Fetch generated designs
      const designsResponse = await fetch("/api/orshot/designs");
      if (designsResponse.ok) {
        const designsData = await designsResponse.json();
        const designs: Design[] = designsData.designs || [];
        allFiles.push(...designs.map(designToLibraryFile));
      }

      // Fetch tasks with deliverables (completed + in review)
      const tasksResponse = await fetch("/api/tasks?view=client&limit=50");
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        const tasks = tasksData.data?.tasks || tasksData.tasks || [];
        const completedTasks = tasks.filter((t: { status: string }) =>
          ["COMPLETED", "IN_REVIEW"].includes(t.status)
        );

        // For each task with deliverables, fetch its files
        for (const task of completedTasks.slice(0, 20)) {
          try {
            const taskResponse = await fetch(`/api/tasks/${task.id}`);
            if (taskResponse.ok) {
              const taskData = await taskResponse.json();
              const taskDetail = taskData.data?.task || taskData.task;
              const taskFiles = taskDetail?.files || [];

              // Add deliverables to assets
              for (const file of taskFiles) {
                if (file.isDeliverable) {
                  allFiles.push({
                    id: file.id,
                    name: file.fileName,
                    size: formatFileSize(file.fileSize || 0),
                    type: "file",
                    fileType: getFileExtension(file.fileName),
                    createdAt: formatDate(file.createdAt),
                    permission: "Editor",
                    url: file.fileUrl,
                  });
                }
              }
            }
          } catch (err) {
            console.error(`Failed to fetch task ${task.id}:`, err);
          }
        }
      }

      // Sort by date (newest first)
      allFiles.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });

      setFiles(allFiles);
    } catch (error) {
      console.error("Failed to fetch library data:", error);
      toast.error("Failed to load library");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (file: LibraryFile) => {
    if (!file.url) {
      toast.error("Download URL not available");
      return;
    }

    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("File downloaded!");
    } catch {
      window.open(file.url, "_blank");
    }
  };

  const recentFiles = files.slice(0, 4);
  const totalFiles = files.length;

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">Assets</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Design
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-4 space-y-6">
        {isLoading ? (
          <LoadingSkeleton />
        ) : files.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Recent Files Generated */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">Recent Files Generated</h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                      <span>Newest First</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortOrder("newest")}>
                      Newest First
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOrder("oldest")}>
                      Oldest First
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Recent files cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {recentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="bg-white dark:bg-zinc-900 rounded-xl border border-green-200 dark:border-green-900/50 p-4 hover:border-green-300 dark:hover:border-green-800 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        {getFileIcon(file)}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {file.url && (
                            <DropdownMenuItem onClick={() => window.open(file.url, "_blank")}>
                              Open
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDownload(file)}>
                            Download
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                        {file.name}
                      </p>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All Files Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-foreground">All Files</h2>
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                  >
                    {totalFiles} Total
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                </div>
              </div>

              {/* Files table */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border bg-muted/30">
                  <div className="col-span-6 sm:col-span-5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    File Name
                    <ChevronDown className="h-4 w-4" />
                  </div>
                  <div className="col-span-3 sm:col-span-3 hidden sm:flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    Created at
                    <ChevronDown className="h-4 w-4" />
                  </div>
                  <div className="col-span-4 sm:col-span-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    File Permission
                    <ChevronDown className="h-4 w-4" />
                  </div>
                  <div className="col-span-2 sm:col-span-1"></div>
                </div>

                {/* Table rows */}
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors group"
                  >
                    <div className="col-span-6 sm:col-span-5 flex items-center gap-3">
                      {getSmallFileIcon(file)}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{file.size}</p>
                      </div>
                    </div>
                    <div className="col-span-3 sm:col-span-3 hidden sm:flex items-center text-sm text-muted-foreground">
                      {file.createdAt}
                    </div>
                    <div className="col-span-4 sm:col-span-3 flex items-center">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", getPermissionStyle(file.permission))}
                      >
                        {file.permission}
                      </Badge>
                    </div>
                    <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {file.url && (
                            <DropdownMenuItem onClick={() => window.open(file.url, "_blank")}>
                              Open
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDownload(file)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
