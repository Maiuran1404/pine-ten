'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ServiceType, ServiceDefinition } from '@/lib/creative-intake/types'
import { SERVICE_DEFINITIONS } from '@/lib/creative-intake/types'

// Main icon mapping for services
const SERVICE_ICONS: Record<string, React.ElementType> = {
  Rocket,
  Film,
  Presentation,
  Palette,
  Target,
  Share2,
}

// Sub-option configurations per service
interface ServiceSubOption {
  id: string
  label: string
  description: string
  icon: React.ElementType
}

const SERVICE_SUB_OPTIONS: Partial<Record<ServiceType, ServiceSubOption[]>> = {
  launch_video: [
    {
      id: 'product_launch',
      label: 'Product Launch',
      description: 'Announce your new product with impact',
      icon: Rocket,
    },
    {
      id: 'feature_release',
      label: 'Feature Release',
      description: 'Highlight new features for existing products',
      icon: Sparkles,
    },
    {
      id: 'brand_announcement',
      label: 'Brand Announcement',
      description: 'Share company news and updates',
      icon: Megaphone,
    },
  ],
  video_edit: [
    {
      id: 'ugc_edit',
      label: 'UGC Edit',
      description: 'Edit user-generated content for social',
      icon: Smartphone,
    },
    {
      id: 'talking_head',
      label: 'Talking Head',
      description: 'Professional speaker-style video edit',
      icon: Video,
    },
    {
      id: 'screen_recording',
      label: 'Screen Recording',
      description: 'Tutorial or demo style video',
      icon: Play,
    },
  ],
  pitch_deck: [
    {
      id: 'investor_deck',
      label: 'Investor Deck',
      description: 'Funding-ready presentation design',
      icon: Presentation,
    },
    {
      id: 'sales_deck',
      label: 'Sales Deck',
      description: 'Convert prospects with compelling slides',
      icon: Target,
    },
    {
      id: 'company_overview',
      label: 'Company Overview',
      description: 'General purpose company presentation',
      icon: FileText,
    },
  ],
  brand_package: [
    {
      id: 'full_brand',
      label: 'Full Brand Package',
      description: 'Logo, colors, typography, guidelines',
      icon: Palette,
    },
    {
      id: 'brand_refresh',
      label: 'Brand Refresh',
      description: 'Update existing brand elements',
      icon: PenTool,
    },
    {
      id: 'social_templates',
      label: 'Social Templates',
      description: 'Branded templates for social media',
      icon: Layers,
    },
  ],
  social_ads: [
    {
      id: 'static_ads',
      label: 'Static Ads',
      description: 'High-converting image ads',
      icon: ImageIcon,
    },
    {
      id: 'video_ads',
      label: 'Video Ads',
      description: 'Engaging video ad creatives',
      icon: Video,
    },
    {
      id: 'carousel_ads',
      label: 'Carousel Ads',
      description: 'Multi-image story ads',
      icon: Layers,
    },
  ],
  social_content: [
    {
      id: 'instagram_post',
      label: 'Instagram Post',
      description: 'Most used category in 3:4 format',
      icon: Smartphone,
    },
    {
      id: 'instagram_story',
      label: 'Instagram Story',
      description: 'Adjusted for your brand in 16:9 format',
      icon: Smartphone,
    },
    {
      id: 'instagram_reels',
      label: 'Instagram Reels',
      description: 'Customized video for your brand at 60 fps',
      icon: Play,
    },
  ],
}

interface ServiceSelectorProps {
  onSelect: (serviceType: ServiceType, subOption?: string, notes?: string) => void
  disabled?: boolean
  className?: string
}

export function ServiceSelector({ onSelect, disabled = false, className }: ServiceSelectorProps) {
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null)
  const [selectedSubOption, setSelectedSubOption] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  const services = Object.values(SERVICE_DEFINITIONS)

  const handleServiceClick = (service: ServiceDefinition) => {
    setSelectedService(service.id)
    setSelectedSubOption(null)
    setNotes('')
  }

  const handleClose = () => {
    setSelectedService(null)
    setSelectedSubOption(null)
    setNotes('')
  }

  const handleConfirm = () => {
    if (selectedService) {
      onSelect(selectedService, selectedSubOption || undefined, notes || undefined)
      handleClose()
    }
  }

  const selectedServiceData = selectedService ? SERVICE_DEFINITIONS[selectedService] : null
  const subOptions = selectedService ? SERVICE_SUB_OPTIONS[selectedService] : null

  return (
    <div className={cn('relative', className)}>
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
  )
}

interface ServiceCardProps {
  service: ServiceDefinition
  onSelect: () => void
  disabled?: boolean
  index: number
}

function ServiceCard({ service, onSelect, disabled, index }: ServiceCardProps) {
  const Icon = SERVICE_ICONS[service.icon] || Rocket

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'group relative flex items-center gap-4 p-5 rounded-2xl text-left',
        'transition-all duration-300',
        'bg-white border border-border',
        'hover:border-crafted-sage/40 hover:shadow-lg hover:shadow-crafted-sage/10',
        'focus:outline-none focus:ring-2 focus:ring-crafted-sage/50 focus:ring-offset-2',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'shrink-0 w-14 h-14 rounded-xl flex items-center justify-center',
          'bg-gradient-to-br from-crafted-mint/30 to-crafted-sage/30',
          'group-hover:from-crafted-sage/40 group-hover:to-crafted-mint/50',
          'transition-all duration-300'
        )}
      >
        <Icon className="h-6 w-6 text-crafted-green" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-foreground text-lg block">{service.label}</span>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
      </div>
    </motion.button>
  )
}

interface ServiceModalProps {
  service: ServiceDefinition
  subOptions: ServiceSubOption[]
  selectedSubOption: string | null
  onSubOptionSelect: (id: string) => void
  notes: string
  onNotesChange: (notes: string) => void
  onClose: () => void
  onConfirm: () => void
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
  const Icon = SERVICE_ICONS[service.icon] || Gift

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-x-4 top-[12%] mx-auto max-w-[420px] z-50 sm:inset-x-auto"
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-crafted-green/10 flex items-center justify-center">
                  <Icon className="h-[18px] w-[18px] text-crafted-sage" />
                </div>
                <h2 className="text-lg font-semibold text-foreground tracking-tight">
                  {service.label}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 -mr-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed pl-12">
              Pick a type and add details — we&apos;ll craft the perfect brief.
            </p>
          </div>

          {/* Sub-options */}
          {subOptions.length > 0 && (
            <div className="px-4 pb-2 space-y-1">
              {subOptions.map((option, index) => {
                const OptionIcon = option.icon
                const isSelected = selectedSubOption === option.id

                return (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => onSubOptionSelect(option.id)}
                    className={cn(
                      'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left',
                      'transition-all duration-150',
                      isSelected
                        ? 'bg-crafted-green/8 ring-1 ring-crafted-sage/30'
                        : 'hover:bg-muted/40'
                    )}
                  >
                    {/* Option Icon */}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150',
                        isSelected ? 'bg-crafted-green/15' : 'bg-muted/60'
                      )}
                    >
                      <OptionIcon
                        className={cn(
                          'h-[18px] w-[18px] transition-colors duration-150',
                          isSelected ? 'text-crafted-sage' : 'text-muted-foreground'
                        )}
                      />
                    </div>

                    {/* Option Content */}
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          'text-sm font-medium block transition-colors duration-150',
                          isSelected ? 'text-foreground' : 'text-foreground/70'
                        )}
                      >
                        {option.label}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {option.description}
                      </p>
                    </div>

                    {/* Selection indicator */}
                    <div
                      className={cn(
                        'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-150',
                        isSelected
                          ? 'border-crafted-sage bg-crafted-sage'
                          : 'border-muted-foreground/25'
                      )}
                    >
                      {isSelected && (
                        <motion.svg
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.15 }}
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </motion.svg>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          )}

          {/* Footer — notes + action */}
          <div className="px-4 pb-4 pt-1">
            <div className="border-t border-border/50 pt-4">
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Add any specific details or requirements..."
                rows={2}
                className={cn(
                  'w-full bg-muted/30 rounded-lg border border-border/50 px-3.5 py-2.5',
                  'text-sm text-foreground placeholder-muted-foreground/50',
                  'outline-none resize-none',
                  'focus:border-crafted-sage/40 focus:bg-muted/40',
                  'transition-colors duration-150'
                )}
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={onConfirm}
                  className={cn(
                    'px-5 py-2 rounded-lg text-sm font-medium',
                    'bg-crafted-green text-white',
                    'hover:bg-crafted-forest',
                    'transition-colors duration-150',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                  disabled={!selectedSubOption}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

/**
 * Compact version for inline display
 */
interface CompactServiceSelectorProps {
  onSelect: (serviceType: ServiceType) => void
  disabled?: boolean
  className?: string
}

export function CompactServiceSelector({
  onSelect,
  disabled = false,
  className,
}: CompactServiceSelectorProps) {
  const services = Object.values(SERVICE_DEFINITIONS)

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {services.map((service, index) => {
        const Icon = SERVICE_ICONS[service.icon] || Rocket

        return (
          <motion.button
            key={service.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            onClick={() => onSelect(service.id)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl border',
              'text-sm transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-crafted-sage/50 focus:ring-offset-2',
              'bg-white border-border',
              'hover:border-crafted-sage/40 hover:bg-muted',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-crafted-mint/30 to-crafted-sage/30 flex items-center justify-center">
              <Icon className="h-3.5 w-3.5 text-crafted-green" />
            </div>
            <span className="font-medium text-foreground/80">{service.shortLabel}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
