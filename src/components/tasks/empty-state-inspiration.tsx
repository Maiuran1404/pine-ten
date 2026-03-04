'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MessageSquarePlus, Sparkles, Users, Zap } from 'lucide-react'

const benefits = [
  { icon: Sparkles, label: 'AI-powered briefing' },
  { icon: Users, label: 'Expert designers' },
  { icon: Zap, label: 'Fast turnaround' },
]

export function EmptyStateInspiration() {
  return (
    <div className="relative rounded-2xl border border-border overflow-hidden p-12 text-center">
      {/* Gradient background */}
      <div className="absolute inset-0 crafted-gradient-radial opacity-20" />
      <div className="relative z-10">
        <h3 className="text-xl font-semibold text-foreground mb-2">Your creative studio awaits</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Describe your vision and our AI-powered briefing will match you with expert designers.
        </p>
        <div className="flex items-center justify-center gap-3 mb-8">
          {benefits.map((b) => (
            <div
              key={b.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background/50 backdrop-blur-sm text-xs text-muted-foreground"
            >
              <b.icon className="h-3 w-3 text-crafted-green" />
              {b.label}
            </div>
          ))}
        </div>
        <Button asChild size="lg">
          <Link href="/dashboard">
            <MessageSquarePlus className="h-4 w-4 mr-2" />
            Start a Project
          </Link>
        </Button>
      </div>
    </div>
  )
}
