'use client'

export function GlowingCard({
  children,
  glowColor = 'var(--crafted-olive)',
  className = '',
}: {
  children: React.ReactNode
  glowColor?: string
  className?: string
}) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute -inset-1 rounded-3xl opacity-50 blur-xl hidden sm:block"
        style={{
          background: `linear-gradient(135deg, ${glowColor}40, transparent, ${glowColor}40)`,
        }}
      />
      <div
        className="relative rounded-2xl p-5 sm:p-8 md:p-10 flex flex-col justify-center"
        style={{
          background: 'var(--surface-inset)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${glowColor}30`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
