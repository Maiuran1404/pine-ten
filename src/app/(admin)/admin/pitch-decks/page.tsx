'use client'

import { PitchDeckBuilder } from '@/components/pitch-deck/pitch-deck-builder'

export default function PitchDecksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pitch Decks</h1>
        <p className="text-muted-foreground">Create branded pitch deck PDFs for client proposals</p>
      </div>

      <PitchDeckBuilder />
    </div>
  )
}
