'use client'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="auth-dark min-h-screen relative"
      style={{
        fontFamily: "var(--font-satoshi, 'Satoshi'), sans-serif",
        backgroundColor: 'var(--background)',
      }}
    >
      {children}
    </div>
  )
}
