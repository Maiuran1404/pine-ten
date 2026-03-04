'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { User, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DesignerMatchCardProps {
  freelancer: {
    id: string
    name: string
    image: string | null
  } | null
}

export function DesignerMatchCard({ freelancer }: DesignerMatchCardProps) {
  if (freelancer) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
          {freelancer.image ? (
            <Image src={freelancer.image} alt={freelancer.name} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{freelancer.name}</p>
          <div className="flex items-center gap-1 text-xs text-crafted-green">
            <Sparkles className="h-3 w-3" />
            <span>Matched to your project</span>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.6 }}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div
        className={cn(
          'relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted',
          'animate-pulse'
        )}
      >
        <div className="flex h-full w-full items-center justify-center">
          <User className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Finding your designer...</p>
        <p className="text-xs text-muted-foreground">
          We&apos;re matching the best fit for your project
        </p>
      </div>
    </motion.div>
  )
}
