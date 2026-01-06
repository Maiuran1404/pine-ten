"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FileText,
  Download,
  ExternalLink,
  Calendar,
} from "lucide-react";

interface Deliverable {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}

interface PreviousTask {
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  completedAt: string | null;
  categoryName: string | null;
  deliverables: Deliverable[];
}

interface PreviousDeliverablesProps {
  previousWork: PreviousTask[];
  companyName: string;
}

function isImage(fileType: string) {
  return fileType.startsWith("image/");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PreviousDeliverables({
  previousWork,
  companyName,
}: PreviousDeliverablesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const toggleTask = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const totalDeliverables = previousWork.reduce(
    (acc, task) => acc + task.deliverables.length,
    0
  );

  if (previousWork.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-500/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <FolderOpen className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Previous Work for {companyName}
                    <Badge variant="secondary" className="font-normal">
                      {previousWork.length}{" "}
                      {previousWork.length === 1 ? "project" : "projects"}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {totalDeliverables} deliverables from past completed tasks
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {previousWork.map((task) => (
              <Collapsible
                key={task.taskId}
                open={expandedTasks.has(task.taskId)}
                onOpenChange={() => toggleTask(task.taskId)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        {expandedTasks.has(task.taskId) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <div>
                        <p className="font-medium text-sm">{task.taskTitle}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {task.categoryName && (
                            <Badge variant="outline" className="text-xs">
                              {task.categoryName}
                            </Badge>
                          )}
                          {task.completedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(task.completedAt).toLocaleDateString()}
                            </span>
                          )}
                          <span>
                            {task.deliverables.length}{" "}
                            {task.deliverables.length === 1 ? "file" : "files"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="ml-9 mt-2 space-y-2">
                    {/* Image Grid */}
                    {task.deliverables.filter((d) => isImage(d.fileType))
                      .length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {task.deliverables
                          .filter((d) => isImage(d.fileType))
                          .map((deliverable) => (
                            <a
                              key={deliverable.id}
                              href={deliverable.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative aspect-square border rounded-lg overflow-hidden bg-muted hover:ring-2 ring-primary transition-all group"
                            >
                              <Image
                                src={deliverable.fileUrl}
                                alt={deliverable.fileName}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <ExternalLink className="h-5 w-5 text-white" />
                              </div>
                            </a>
                          ))}
                      </div>
                    )}

                    {/* Non-image files */}
                    {task.deliverables.filter((d) => !isImage(d.fileType))
                      .length > 0 && (
                      <div className="space-y-1">
                        {task.deliverables
                          .filter((d) => !isImage(d.fileType))
                          .map((deliverable) => (
                            <div
                              key={deliverable.id}
                              className="flex items-center justify-between p-2 border rounded-lg bg-muted/30"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm truncate max-w-[200px]">
                                    {deliverable.fileName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(deliverable.fileSize)}
                                  </p>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" asChild>
                                <a
                                  href={deliverable.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
