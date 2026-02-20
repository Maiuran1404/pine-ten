import type { ReactNode } from 'react'

interface SlideWrapperProps {
  children: ReactNode
  backgroundColor?: string
}

export function SlideWrapper({ children, backgroundColor = '#1a1a2e' }: SlideWrapperProps) {
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        color: '#ffffff',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  )
}
