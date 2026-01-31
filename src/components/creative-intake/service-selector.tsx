"use client";

import { motion } from "framer-motion";
import {
  Rocket,
  Film,
  Presentation,
  Palette,
  Target,
  Share2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceType, ServiceDefinition } from "@/lib/creative-intake/types";
import { SERVICE_DEFINITIONS } from "@/lib/creative-intake/types";

// Icon mapping
const ICONS: Record<string, React.ElementType> = {
  Rocket,
  Film,
  Presentation,
  Palette,
  Target,
  Share2,
};

interface ServiceSelectorProps {
  onSelect: (serviceType: ServiceType) => void;
  disabled?: boolean;
  className?: string;
}

export function ServiceSelector({
  onSelect,
  disabled = false,
  className,
}: ServiceSelectorProps) {
  const services = Object.values(SERVICE_DEFINITIONS);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {services.map((service, index) => (
          <ServiceCard
            key={service.id}
            service={service}
            onSelect={() => onSelect(service.id)}
            disabled={disabled}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

interface ServiceCardProps {
  service: ServiceDefinition;
  onSelect: () => void;
  disabled?: boolean;
  index: number;
}

function ServiceCard({ service, onSelect, disabled, index }: ServiceCardProps) {
  const Icon = ICONS[service.icon] || Rocket;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "group relative flex items-start gap-4 p-4 rounded-xl border-2 text-left",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "border-border bg-card hover:border-primary/50 hover:bg-muted/30",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
          "bg-primary/10 text-primary",
          "group-hover:bg-primary group-hover:text-primary-foreground",
          "transition-colors duration-200"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">{service.label}</span>
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground shrink-0",
              "group-hover:text-primary group-hover:translate-x-0.5",
              "transition-all duration-200"
            )}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {service.description}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground/70">
            ~{service.estimatedQuestions} questions
          </span>
        </div>
      </div>
    </motion.button>
  );
}

/**
 * Compact version for inline display
 */
interface CompactServiceSelectorProps {
  onSelect: (serviceType: ServiceType) => void;
  disabled?: boolean;
  className?: string;
}

export function CompactServiceSelector({
  onSelect,
  disabled = false,
  className,
}: CompactServiceSelectorProps) {
  const services = Object.values(SERVICE_DEFINITIONS);

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {services.map((service, index) => {
        const Icon = ICONS[service.icon] || Rocket;

        return (
          <motion.button
            key={service.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            onClick={() => onSelect(service.id)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border",
              "text-sm transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "border-border bg-card hover:border-primary/50 hover:bg-muted/30",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Icon className="h-4 w-4 text-primary" />
            <span className="font-medium">{service.shortLabel}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
