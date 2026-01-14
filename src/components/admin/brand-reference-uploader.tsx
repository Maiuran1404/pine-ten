"use client";

import { useState, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  TONE_BUCKETS,
  ENERGY_BUCKETS,
  DENSITY_BUCKETS,
  COLOR_BUCKETS,
  PREMIUM_BUCKETS,
  TONE_BUCKET_LABELS,
  ENERGY_BUCKET_LABELS,
  DENSITY_BUCKET_LABELS,
  COLOR_BUCKET_LABELS,
  PREMIUM_BUCKET_LABELS,
  type ToneBucket,
  type EnergyBucket,
  type DensityBucket,
  type ColorBucket,
  type PremiumBucket,
} from "@/lib/constants/reference-libraries";

interface PendingUpload {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "classifying" | "classified" | "uploading" | "done" | "error";
  classification?: {
    name: string;
    description: string;
    toneBucket: ToneBucket;
    energyBucket: EnergyBucket;
    densityBucket: DensityBucket;
    colorBucket: ColorBucket;
    premiumBucket: PremiumBucket;
    colorSamples: string[];
    confidence: number;
  };
  error?: string;
}

interface BrandReferenceUploaderProps {
  onUploadComplete?: () => void;
}

export function BrandReferenceUploader({ onUploadComplete }: BrandReferenceUploaderProps) {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newUploads: PendingUpload[] = acceptedFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
    }));
    setPendingUploads((prev) => [...prev, ...newUploads]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
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

        const response = await fetch("/api/admin/brand-references/upload", {
          method: "PUT", // PUT is for preview/classify only
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Classification failed");
        }

        const data = await response.json();

        setPendingUploads((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  status: "classified" as const,
                  classification: data.classification,
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

        const response = await fetch("/api/admin/brand-references/upload", {
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
      toast.success(`Successfully uploaded ${successCount} brand references`);
      onUploadComplete?.();
    }
    if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} brand references`);
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
    value: string
  ) => {
    setPendingUploads((prev) =>
      prev.map((u) =>
        u.id === id && u.classification
          ? {
              ...u,
              classification: {
                ...u.classification,
                [field]: value,
              },
            }
          : u
      )
    );
  };

  const pendingCount = pendingUploads.filter((u) => u.status === "pending").length;
  const classifiedCount = pendingUploads.filter((u) => u.status === "classified").length;
  const doneCount = pendingUploads.filter((u) => u.status === "done").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Bulk Upload with AI Classification
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
                <p className="font-medium">Drag & drop brand images here</p>
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
              {classifiedCount > 0 && ` • ${classifiedCount} classified`}
              {doneCount > 0 && ` • ${doneCount} uploaded`}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  pendingUploads.forEach((u) => URL.revokeObjectURL(u.preview));
                  setPendingUploads([]);
                }}
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
                      {upload.status === "pending" && (
                        <Badge variant="outline">Pending</Badge>
                      )}
                      {upload.status === "classifying" && (
                        <Badge variant="secondary">
                          <LoadingSpinner size="sm" className="mr-1" />
                          Classifying...
                        </Badge>
                      )}
                      {upload.status === "classified" && (
                        <Badge className="bg-blue-500">
                          <Check className="h-3 w-3 mr-1" />
                          Classified
                        </Badge>
                      )}
                      {upload.status === "uploading" && (
                        <Badge variant="secondary">
                          <LoadingSpinner size="sm" className="mr-1" />
                          Uploading...
                        </Badge>
                      )}
                      {upload.status === "done" && (
                        <Badge className="bg-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Done
                        </Badge>
                      )}
                      {upload.status === "error" && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Error
                        </Badge>
                      )}
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
              {upload.classification && upload.status !== "done" && (
                <div className="space-y-3 pt-3 border-t">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Brand Name</label>
                      <Input
                        value={upload.classification.name}
                        onChange={(e) =>
                          updateClassification(upload.id, "name", e.target.value)
                        }
                        className="h-8 mt-1"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Badge variant="outline" className="text-xs">
                        Confidence: {Math.round((upload.classification.confidence || 0) * 100)}%
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Tone</label>
                      <Select
                        value={upload.classification.toneBucket}
                        onValueChange={(v) => updateClassification(upload.id, "toneBucket", v)}
                      >
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TONE_BUCKETS.map((b) => (
                            <SelectItem key={b} value={b}>
                              {TONE_BUCKET_LABELS[b]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Energy</label>
                      <Select
                        value={upload.classification.energyBucket}
                        onValueChange={(v) => updateClassification(upload.id, "energyBucket", v)}
                      >
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ENERGY_BUCKETS.map((b) => (
                            <SelectItem key={b} value={b}>
                              {ENERGY_BUCKET_LABELS[b]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Density</label>
                      <Select
                        value={upload.classification.densityBucket}
                        onValueChange={(v) => updateClassification(upload.id, "densityBucket", v)}
                      >
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DENSITY_BUCKETS.map((b) => (
                            <SelectItem key={b} value={b}>
                              {DENSITY_BUCKET_LABELS[b]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Color</label>
                      <Select
                        value={upload.classification.colorBucket}
                        onValueChange={(v) => updateClassification(upload.id, "colorBucket", v)}
                      >
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLOR_BUCKETS.map((b) => (
                            <SelectItem key={b} value={b}>
                              {COLOR_BUCKET_LABELS[b]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Premium</label>
                      <Select
                        value={upload.classification.premiumBucket}
                        onValueChange={(v) => updateClassification(upload.id, "premiumBucket", v)}
                      >
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PREMIUM_BUCKETS.map((b) => (
                            <SelectItem key={b} value={b}>
                              {PREMIUM_BUCKET_LABELS[b]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Color samples preview */}
                  {upload.classification.colorSamples.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Colors:</span>
                      {upload.classification.colorSamples.map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
