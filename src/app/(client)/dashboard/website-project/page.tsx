'use client'

import { Suspense } from 'react'
import { WebsiteFlow } from '@/components/website-flow/website-flow'
import { LoadingSpinner } from '@/components/shared/loading'

function WebsiteProjectContent() {
  return <WebsiteFlow />
}

export default function WebsiteProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      }
    >
      <WebsiteProjectContent />
    </Suspense>
  )
}
