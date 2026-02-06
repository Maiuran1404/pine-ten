"use client";

import { useState, useCallback, ReactNode } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/shared/loading";
import {
  Upload,
  X,
  Check,
  AlertCircle,
  ImageIcon,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type UploadStatus = "pending" | "classifying" | "classified" | "uploading" | "done" | "error";

export interface PendingUpload<TClassification = object> {
  id: string;
  file: File;
  preview: string;
  status: UploadStatus;
  classification?: TClassification;
  error?: string;
}

interface AIUploaderProps<TClassification> {
  /** Base API endpoint for classify (PUT) and upload (POST) */
  apiEndpoint: string;
  /** Resource name for toast messages (e.g., "brand references", "deliverable styles") */
  resourceName: string;
  /** Title for the card */
  title?: string;
  /** Text to show in dropzone when empty */
  dropzoneText?: string;
  /** Callback when upload completes */
  onUploadComplete?: () => void;
  /** Render function for the classification editor */
  renderClassificationEditor?: (
    upload: PendingUpload<TClassification>,
    updateClassification: (id: string, field: string, value: unknown) => void
  ) => ReactNode;
  /** Accepted file types */
  acceptedTypes?: Record<string, string[]>;
}

export function AIUploader<TClassification extends object>({
  apiEndpoint,
  resourceName,
  title = "Bulk Upload with AI Classification",
  dropzoneText = "Drag & drop images here",
  onUploadComplete,
  renderClassificationEditor,
  acceptedTypes = { "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"] },
}: AIUploaderProps<TClassification>) {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload<TClassification>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads: PendingUpload<TClassification>[] = acceptedFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
    }));
    setPendingUploads((prev) => [...prev, ...newUploads]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    multiple: true,
  });

  const classifyAll = async () => {
    setIsProcessing(true);
    const pendingIds = pendingUploads
      .filter((u) => u.status === "pending")
      .map((u) => u.id);

    for (let i = 0; i < pendingIds.length; i++) {
      const id = pendingIds[i];
      const upload = pendingUploads.find((u) => u.id === id);
      if (!upload) continue;

      setPendingUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: "classifying" as const } : u
        )
      );

      try {
        const formData = new FormData();
        formData.append("file", upload.file);

        const response = await fetch(apiEndpoint, {
          method: "PUT", // PUT is for preview/classify only
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Classification failed");
        }

        const result = await response.json();

        setPendingUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  status: "classified" as const,
                  classification: result.data?.classification,
                }
              : u
          )
        );
      } catch (error) {
        setPendingUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Classification failed",
                }
              : u
          )
        );
      }

      setUploadProgress(((i + 1) / pendingIds.length) * 100);
    }

    setIsProcessing(false);
    setUploadProgress(0);
  };

  const uploadAll = async () => {
    setIsProcessing(true);
    const classifiedIds = pendingUploads
      .filter((u) => u.status === "classified")
      .map((u) => u.id);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < classifiedIds.length; i++) {
      const id = classifiedIds[i];
      const upload = pendingUploads.find((u) => u.id === id);
      if (!upload || !upload.classification) continue;

      setPendingUploads((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, status: "uploading" as const } : u
        )
      );

      try {
        const formData = new FormData();
        formData.append("files", upload.file);

        const response = await fetch(apiEndpoint, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        setPendingUploads((prev) =>
          prev.map((u) =>
            u.id === id ? { ...u, status: "done" as const } : u
          )
        );
        successCount++;
      } catch (error) {
        setPendingUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : u
          )
        );
        errorCount++;
      }

      setUploadProgress(((i + 1) / classifiedIds.length) * 100);
    }

    setIsProcessing(false);
    setUploadProgress(0);

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} ${resourceName}`);
      onUploadComplete?.();
    }
    if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} ${resourceName}`);
    }
  };

  const removeUpload = (id: string) => {
    const upload = pendingUploads.find((u) => u.id === id);
    if (upload) {
      URL.revokeObjectURL(upload.preview);
    }
    setPendingUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const updateClassification = (
    id: string,
    field: string,
    value: unknown
  ) => {
    setPendingUploads((prev) =>
      prev.map((u) =>
        u.id === id && u.classification
          ? {
              ...u,
              classification: {
                ...u.classification,
                [field]: value,
              } as TClassification,
            }
          : u
      )
    );
  };

  const clearAll = () => {
    pendingUploads.forEach((u) => URL.revokeObjectURL(u.preview));
    setPendingUploads([]);
  };

  const pendingCount = pendingUploads.filter((u) => u.status === "pending").length;
  const classifiedCount = pendingUploads.filter((u) => u.status === "classified").length;
  const doneCount = pendingUploads.filter((u) => u.status === "done").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-primary font-medium">Drop images here...</p>
            ) : (
              <>
                <p className="font-medium">{dropzoneText}</p>
                <p className="text-sm text-muted-foreground">
                  or click to select files (PNG, JPG, WebP)
                </p>
              </>
            )}
          </div>
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={uploadProgress} />
            <p className="text-sm text-muted-foreground text-center">
              Processing... {Math.round(uploadProgress)}%
            </p>
          </div>
        )}

        {/* Action buttons */}
        {pendingUploads.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {pendingCount > 0 && `${pendingCount} pending`}
              {classifiedCount > 0 && ` · ${classifiedCount} classified`}
              {doneCount > 0 && ` · ${doneCount} uploaded`}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={clearAll}
                disabled={isProcessing}
              >
                Clear All
              </Button>
              {pendingCount > 0 && (
                <Button
                  onClick={classifyAll}
                  disabled={isProcessing}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Classify with AI ({pendingCount})
                </Button>
              )}
              {classifiedCount > 0 && (
                <Button
                  onClick={uploadAll}
                  disabled={isProcessing}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload All ({classifiedCount})
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Upload list */}
        <div className="space-y-4">
          {pendingUploads.map((upload) => (
            <div
              key={upload.id}
              className={cn(
                "border rounded-lg p-4 space-y-4",
                upload.status === "done" && "bg-green-500/5 border-green-500/20",
                upload.status === "error" && "bg-red-500/5 border-red-500/20"
              )}
            >
              <div className="flex gap-4">
                {/* Preview image */}
                <div className="w-32 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={upload.preview}
                    alt={upload.file.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium truncate">{upload.file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(upload.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <UploadStatusBadge status={upload.status} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeUpload(upload.id)}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {upload.error && (
                    <p className="text-sm text-red-500 mt-1">{upload.error}</p>
                  )}
                </div>
              </div>

              {/* Classification results (editable) */}
              {upload.classification && upload.status !== "done" && renderClassificationEditor && (
                <div className="space-y-3 pt-3 border-t">
                  {renderClassificationEditor(upload, updateClassification)}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UploadStatusBadge({ status }: { status: UploadStatus }) {
  switch (status) {
    case "pending":
      return <Badge variant="outline">Pending</Badge>;
    case "classifying":
      return (
        <Badge variant="secondary">
          <LoadingSpinner size="sm" className="mr-1" />
          Classifying...
        </Badge>
      );
    case "classified":
      return (
        <Badge className="bg-blue-500">
          <Check className="h-3 w-3 mr-1" />
          Classified
        </Badge>
      );
    case "uploading":
      return (
        <Badge variant="secondary">
          <LoadingSpinner size="sm" className="mr-1" />
          Uploading...
        </Badge>
      );
    case "done":
      return (
        <Badge className="bg-green-500">
          <Check className="h-3 w-3 mr-1" />
          Done
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
  }
}
