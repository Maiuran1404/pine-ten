'use client'

import { StoryboardImageGenerator } from '@/components/admin/storyboard-image-generator'

export default function StoryboardImagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Storyboard Image Generator</h1>
        <p className="text-muted-foreground mt-1">
          Generate AI images for storyboard scenes using OpenAI gpt-image-1
        </p>
      </div>
      <StoryboardImageGenerator />
    </div>
  )
}
