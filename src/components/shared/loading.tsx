import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <Loader2 className={`animate-spin text-muted-foreground ${sizeClasses[size]} ${className}`} />
  )
}

function GrainOverlay() {
  return (
    <span
      className="loading-grain-wordmark pointer-events-none absolute inset-0 z-[2] flex select-none items-center justify-center font-satoshi text-2xl font-light tracking-[0.3em] text-foreground"
      aria-hidden="true"
    >
      crafted
    </span>
  )
}

export function PageLoader() {
  return (
    <div className="loading-grain flex h-full min-h-[400px] w-full items-center justify-center">
      <GrainOverlay />
    </div>
  )
}

export function FullPageLoader() {
  return (
    <div className="loading-grain flex h-screen w-full items-center justify-center">
      <GrainOverlay />
    </div>
  )
}
