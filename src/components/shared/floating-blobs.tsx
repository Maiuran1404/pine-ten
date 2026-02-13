'use client'

/**
 * Floating organic blob shapes for background decoration
 * Automatically adapts colors for light and dark modes
 */
export function FloatingBlobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Dark mode blobs - green tones */}
      <div className="hidden dark:block">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[300px] sm:w-[500px] h-[200px] sm:h-[300px] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(ellipse, #4a7c4a 0%, transparent 70%)' }}
        />
        <div
          className="hidden sm:block absolute top-1/4 -left-20 w-[350px] h-[450px] rounded-full opacity-25 blur-3xl"
          style={{
            background: 'radial-gradient(ellipse, #6b9b6b 0%, transparent 70%)',
            transform: 'rotate(-20deg)',
          }}
        />
        <div
          className="hidden sm:block absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(ellipse, #8bb58b 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-20 left-10 w-[150px] sm:w-[200px] h-[150px] sm:h-[200px] rounded-full opacity-30 blur-2xl"
          style={{ background: 'radial-gradient(ellipse, #4a7c4a 0%, transparent 70%)' }}
        />
        <div
          className="hidden sm:block absolute -bottom-20 right-1/4 w-[250px] h-[200px] rounded-full opacity-25 blur-2xl"
          style={{ background: 'radial-gradient(ellipse, #6b9b6b 0%, transparent 70%)' }}
        />
      </div>

      {/* Light mode blobs - softer, lighter tones */}
      <div className="dark:hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[300px] sm:w-[500px] h-[200px] sm:h-[300px] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(ellipse, #a8e6cf 0%, transparent 70%)' }}
        />
        <div
          className="hidden sm:block absolute top-1/4 -left-20 w-[350px] h-[450px] rounded-full opacity-30 blur-3xl"
          style={{
            background: 'radial-gradient(ellipse, #88d8b0 0%, transparent 70%)',
            transform: 'rotate(-20deg)',
          }}
        />
        <div
          className="hidden sm:block absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(ellipse, #b8e6d4 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-20 left-10 w-[150px] sm:w-[200px] h-[150px] sm:h-[200px] rounded-full opacity-35 blur-2xl"
          style={{ background: 'radial-gradient(ellipse, #a8e6cf 0%, transparent 70%)' }}
        />
        <div
          className="hidden sm:block absolute -bottom-20 right-1/4 w-[250px] h-[200px] rounded-full opacity-30 blur-2xl"
          style={{ background: 'radial-gradient(ellipse, #88d8b0 0%, transparent 70%)' }}
        />
      </div>
    </div>
  )
}
