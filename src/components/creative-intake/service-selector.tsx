"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Film,
  Presentation,
  Palette,
  Target,
  Share2,
  X,
  Gift,
  Smartphone,
  Play,
  ImageIcon,
  Video,
  FileText,
  Layers,
  Sparkles,
  Megaphone,
  PenTool,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceType, ServiceDefinition } from "@/lib/creative-intake/types";
import { SERVICE_DEFINITIONS } from "@/lib/creative-intake/types";

// Main icon mapping for services
const SERVICE_ICONS: Record<string, React.ElementType> = {
  Rocket,
  Film,
  Presentation,
  Palette,
  Target,
  Share2,
};

// Sub-option configurations per service
interface ServiceSubOption {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const SERVICE_SUB_OPTIONS: Partial<Record<ServiceType, ServiceSubOption[]>> = {
  launch_video: [
    {
      id: "product_launch",
      label: "Product Launch",
      description: "Announce your new product with impact",
      icon: Rocket,
    },
    {
      id: "feature_release",
      label: "Feature Release",
      description: "Highlight new features for existing products",
      icon: Sparkles,
    },
    {
      id: "brand_announcement",
      label: "Brand Announcement",
      description: "Share company news and updates",
      icon: Megaphone,
    },
  ],
  video_edit: [
    {
      id: "ugc_edit",
      label: "UGC Edit",
      description: "Edit user-generated content for social",
      icon: Smartphone,
    },
    {
      id: "talking_head",
      label: "Talking Head",
      description: "Professional speaker-style video edit",
      icon: Video,
    },
    {
      id: "screen_recording",
      label: "Screen Recording",
      description: "Tutorial or demo style video",
      icon: Play,
    },
  ],
  pitch_deck: [
    {
      id: "investor_deck",
      label: "Investor Deck",
      description: "Funding-ready presentation design",
      icon: Presentation,
    },
    {
      id: "sales_deck",
      label: "Sales Deck",
      description: "Convert prospects with compelling slides",
      icon: Target,
    },
    {
      id: "company_overview",
      label: "Company Overview",
      description: "General purpose company presentation",
      icon: FileText,
    },
  ],
  brand_package: [
    {
      id: "full_brand",
      label: "Full Brand Package",
      description: "Logo, colors, typography, guidelines",
      icon: Palette,
    },
    {
      id: "brand_refresh",
      label: "Brand Refresh",
      description: "Update existing brand elements",
      icon: PenTool,
    },
    {
      id: "social_templates",
      label: "Social Templates",
      description: "Branded templates for social media",
      icon: Layers,
    },
  ],
  social_ads: [
    {
      id: "static_ads",
      label: "Static Ads",
      description: "High-converting image ads",
      icon: ImageIcon,
    },
    {
      id: "video_ads",
      label: "Video Ads",
      description: "Engaging video ad creatives",
      icon: Video,
    },
    {
      id: "carousel_ads",
      label: "Carousel Ads",
      description: "Multi-image story ads",
      icon: Layers,
    },
  ],
  social_content: [
    {
      id: "instagram_post",
      label: "Instagram Post",
      description: "Most used category in 3:4 format",
      icon: Smartphone,
    },
    {
      id: "instagram_story",
      label: "Instagram Story",
      description: "Adjusted for your brand in 16:9 format",
      icon: Smartphone,
    },
    {
      id: "instagram_reels",
      label: "Instagram Reels",
      description: "Customized video for your brand at 60 fps",
      icon: Play,
    },
  ],
};

interface ServiceSelectorProps {
  onSelect: (serviceType: ServiceType, subOption?: string, notes?: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ServiceSelector({
  onSelect,
  disabled = false,
  className,
}: ServiceSelectorProps) {
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedSubOption, setSelectedSubOption] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const services = Object.values(SERVICE_DEFINITIONS);

  const handleServiceClick = (service: ServiceDefinition) => {
    setSelectedService(service.id);
    setSelectedSubOption(null);
    setNotes("");
  };

  const handleClose = () => {
    setSelectedService(null);
    setSelectedSubOption(null);
    setNotes("");
  };

  const handleConfirm = () => {
    if (selectedService) {
      onSelect(selectedService, selectedSubOption || undefined, notes || undefined);
      handleClose();
    }
  };

  const selectedServiceData = selectedService
    ? SERVICE_DEFINITIONS[selectedService]
    : null;
  const subOptions = selectedService
    ? SERVICE_SUB_OPTIONS[selectedService]
    : null;

  return (
    <div className={cn("relative", className)}>
      {/* Service Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service, index) => (
          <ServiceCard
            key={service.id}
            service={service}
            onSelect={() => handleServiceClick(service)}
            disabled={disabled}
            index={index}
          />
        ))}
      </div>

      {/* Service Detail Modal */}
      <AnimatePresence>
        {selectedService && selectedServiceData && (
          <ServiceModal
            service={selectedServiceData}
            subOptions={subOptions || []}
            selectedSubOption={selectedSubOption}
            onSubOptionSelect={setSelectedSubOption}
            notes={notes}
            onNotesChange={setNotes}
            onClose={handleClose}
            onConfirm={handleConfirm}
          />
        )}
      </AnimatePresence>
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
  const Icon = SERVICE_ICONS[service.icon] || Rocket;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "group relative flex items-center gap-4 p-5 rounded-2xl text-left",
        "transition-all duration-300",
        "bg-white border border-[#E8EDE8]",
        "hover:border-[#8BAF8E]/40 hover:shadow-lg hover:shadow-[#8BAF8E]/10",
        "focus:outline-none focus:ring-2 focus:ring-[#8BAF8E]/50 focus:ring-offset-2",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "shrink-0 w-14 h-14 rounded-xl flex items-center justify-center",
          "bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9]",
          "group-hover:from-[#C8E6C9] group-hover:to-[#A5D6A7]",
          "transition-all duration-300"
        )}
      >
        <Icon className="h-6 w-6 text-[#4A7C4E]" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-[#1F2937] text-lg block">
          {service.label}
        </span>
        <p className="text-sm text-[#6B7280] mt-1 line-clamp-2">
          {service.description}
        </p>
      </div>
    </motion.button>
  );
}

interface ServiceModalProps {
  service: ServiceDefinition;
  subOptions: ServiceSubOption[];
  selectedSubOption: string | null;
  onSubOptionSelect: (id: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function ServiceModal({
  service,
  subOptions,
  selectedSubOption,
  onSubOptionSelect,
  notes,
  onNotesChange,
  onClose,
  onConfirm,
}: ServiceModalProps) {
  const Icon = SERVICE_ICONS[service.icon] || Gift;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-x-4 top-[10%] mx-auto max-w-md z-50 sm:inset-x-auto"
      >
        <div className="bg-white rounded-3xl shadow-2xl shadow-[#8BAF8E]/20 overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center",
                    "bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9]"
                  )}
                >
                  <Icon className="h-7 w-7 text-[#4A7C4E]" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#1F2937]">
                    {service.label}
                  </h2>
                  <p className="text-[#6B7280] text-sm mt-0.5">
                    Pick one and add some notes, we'll help you with writing the prompts!
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 -mt-2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#E8EDE8] to-transparent mx-6" />

          {/* Sub-options */}
          {subOptions.length > 0 && (
            <div className="p-4 space-y-1">
              {subOptions.map((option, index) => {
                const OptionIcon = option.icon;
                const isSelected = selectedSubOption === option.id;

                return (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onSubOptionSelect(option.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-2xl text-left",
                      "transition-all duration-200",
                      isSelected
                        ? "bg-[#E8F5E9] border-2 border-[#8BAF8E]"
                        : "hover:bg-[#F9FBF9] border-2 border-transparent"
                    )}
                  >
                    {/* Option Icon */}
                    <div
                      className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center shrink-0",
                        "bg-gradient-to-br",
                        isSelected
                          ? "from-[#C8E6C9] to-[#A5D6A7]"
                          : "from-[#F1F8F1] to-[#E8F5E9]"
                      )}
                    >
                      <OptionIcon
                        className={cn(
                          "h-6 w-6",
                          isSelected ? "text-[#2E7D32]" : "text-[#6B9B6E]"
                        )}
                      />
                    </div>

                    {/* Option Content */}
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "font-semibold block",
                          isSelected ? "text-[#1F2937]" : "text-[#374151]"
                        )}
                      >
                        {option.label}
                      </span>
                      <p className="text-sm text-[#6B7280] mt-0.5 line-clamp-2">
                        {option.description}
                      </p>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 rounded-full bg-[#4A7C4E] flex items-center justify-center"
                      >
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#E8EDE8] to-transparent mx-6" />

          {/* Notes Input & Submit */}
          <div className="p-6 pt-4 space-y-4">
            <h3 className="font-semibold text-[#1F2937]">
              Would like to add something?
            </h3>
            <div className="flex items-center gap-2 bg-[#F9FBF9] rounded-2xl border border-[#E8EDE8] p-1.5 pl-4 focus-within:border-[#8BAF8E] transition-colors">
              <input
                type="text"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Add some notes"
                className="flex-1 bg-transparent text-[#374151] placeholder-[#9CA3AF] outline-none text-sm py-2"
              />
              <button
                onClick={onConfirm}
                className={cn(
                  "px-5 py-2.5 rounded-xl font-semibold text-sm text-white",
                  "bg-gradient-to-r from-[#6B9B6E] to-[#4A7C4E]",
                  "hover:from-[#5A8A5D] hover:to-[#3D6B40]",
                  "transition-all duration-200",
                  "shadow-lg shadow-[#4A7C4E]/25"
                )}
              >
                Create Prompt
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
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
        const Icon = SERVICE_ICONS[service.icon] || Rocket;

        return (
          <motion.button
            key={service.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            onClick={() => onSelect(service.id)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl border",
              "text-sm transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-[#8BAF8E]/50 focus:ring-offset-2",
              "bg-white border-[#E8EDE8]",
              "hover:border-[#8BAF8E]/40 hover:bg-[#F9FBF9]",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E8F5E9] to-[#C8E6C9] flex items-center justify-center">
              <Icon className="h-3.5 w-3.5 text-[#4A7C4E]" />
            </div>
            <span className="font-medium text-[#374151]">{service.shortLabel}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
