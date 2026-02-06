"use client";

import { AIUploader, PendingUpload } from "./ai-uploader";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DELIVERABLE_TYPES,
  STYLE_AXES,
  type DeliverableType,
  type StyleAxis,
} from "@/lib/constants/reference-libraries";

interface DeliverableClassification {
  name: string;
  description: string;
  deliverableType: DeliverableType;
  styleAxis: StyleAxis;
  subStyle: string | null;
  semanticTags: string[];
  confidence: number;
}

interface DeliverableStyleUploaderProps {
  onUploadComplete?: () => void;
}

export function DeliverableStyleUploader({ onUploadComplete }: DeliverableStyleUploaderProps) {
  const renderClassificationEditor = (
    upload: PendingUpload<DeliverableClassification>,
    updateClassification: (id: string, field: string, value: unknown) => void
  ) => {
    if (!upload.classification) return null;

    return (
      <>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Style Name</label>
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

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Deliverable Type</label>
            <Select
              value={upload.classification.deliverableType}
              onValueChange={(v) => updateClassification(upload.id, "deliverableType", v)}
            >
              <SelectTrigger className="h-8 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIVERABLE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Style Axis</label>
            <Select
              value={upload.classification.styleAxis}
              onValueChange={(v) => updateClassification(upload.id, "styleAxis", v)}
            >
              <SelectTrigger className="h-8 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_AXES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Sub-Style</label>
            <Input
              value={upload.classification.subStyle || ""}
              onChange={(e) =>
                updateClassification(upload.id, "subStyle", e.target.value || "")
              }
              placeholder="e.g., dark-mode"
              className="h-8 mt-1"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Semantic Tags (comma-separated)</label>
          <Input
            value={upload.classification.semanticTags.join(", ")}
            onChange={(e) =>
              updateClassification(
                upload.id,
                "semanticTags",
                e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
              )
            }
            placeholder="gen-z, luxury, tech-forward"
            className="h-8 mt-1"
          />
        </div>

        {/* Tags preview */}
        {upload.classification.semanticTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {upload.classification.semanticTags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <AIUploader<DeliverableClassification>
      apiEndpoint="/api/admin/deliverable-styles/upload"
      resourceName="deliverable styles"
      dropzoneText="Drag & drop style reference images here"
      onUploadComplete={onUploadComplete}
      renderClassificationEditor={renderClassificationEditor}
    />
  );
}
