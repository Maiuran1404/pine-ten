'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { LoadingSpinner } from '@/components/shared/loading'

const earlyAccessSchema = z.object({
  code: z
    .string()
    .min(1, 'Invite code is required')
    .max(50, 'Invalid invite code')
    .transform((val) => val.trim().toUpperCase()),
})

type EarlyAccessForm = z.infer<typeof earlyAccessSchema>

// Floating organic blob shapes
function FloatingBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[300px] sm:w-[500px] h-[200px] sm:h-[300px] rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(ellipse, var(--crafted-green) 0%, transparent 70%)' }}
      />
      <div
        className="hidden sm:block absolute top-1/4 -left-20 w-[350px] h-[450px] rounded-full opacity-25 blur-3xl"
        style={{
          background: 'radial-gradient(ellipse, var(--crafted-green-light) 0%, transparent 70%)',
          transform: 'rotate(-20deg)',
        }}
      />
      <div
        className="hidden sm:block absolute top-1/3 -right-32 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(ellipse, var(--crafted-sage) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-20 left-10 w-[150px] sm:w-[200px] h-[150px] sm:h-[200px] rounded-full opacity-30 blur-2xl"
        style={{ background: 'radial-gradient(ellipse, var(--crafted-green) 0%, transparent 70%)' }}
      />
      <div
        className="hidden sm:block absolute -bottom-20 right-1/4 w-[250px] h-[200px] rounded-full opacity-25 blur-2xl"
        style={{
          background: 'radial-gradient(ellipse, var(--crafted-green-light) 0%, transparent 70%)',
        }}
      />
    </div>
  )
}

// Brand logo component
function BrandLogo() {
  return (
    <div className="absolute top-4 left-4 sm:top-8 sm:left-8 z-20">
      <Image
        src="/craftedcombinedwhite.png"
        alt="Crafted"
        width={140}
        height={40}
        className="object-contain"
      />
    </div>
  )
}

// Logo component for inside the card
function CardLogo() {
  return (
    <div className="flex justify-center mb-6">
      <Image
        src="/craftedfigurewhite.png"
        alt="Crafted"
        width={48}
        height={48}
        className="object-contain"
      />
    </div>
  )
}

export default function EarlyAccessPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EarlyAccessForm>({
    resolver: zodResolver(earlyAccessSchema),
    defaultValues: {
      code: '',
    },
  })

  async function onSubmit(data: EarlyAccessForm) {
    setIsLoading(true)

    try {
      const response = await fetch('/api/early-access/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: data.code }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        toast.error(result.error?.message || 'Invalid invite code')
        setIsLoading(false)
        return
      }

      router.push(`/register?code=${encodeURIComponent(result.data.code)}`)
    } catch {
      toast.error('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center relative py-16 sm:py-8">
      <FloatingBlobs />
      <BrandLogo />

      <div className="relative z-10 w-full max-w-md px-4">
        <div
          className="rounded-2xl p-6 sm:p-8 md:p-10"
          style={{
            background: 'var(--surface-overlay)',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Logo */}
          <CardLogo />

          {/* Header */}
          <div className="text-center mb-8">
            <h1
              className="text-2xl font-semibold text-white mb-2"
              style={{ fontFamily: "var(--font-satoshi, 'Satoshi'), sans-serif" }}
            >
              Early Access
            </h1>
            <p className="text-white/50 text-sm">Enter your invite code to create an account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Code Field */}
            <div className="space-y-2">
              <div
                className="relative rounded-xl overflow-hidden"
                style={{
                  background: 'var(--surface-input)',
                  border: errors.code
                    ? '1px solid color-mix(in srgb, var(--ds-error) 50%, transparent)'
                    : '1px solid var(--border-subtle)',
                }}
              >
                <label className="absolute left-4 top-2.5 text-xs text-white/40">Invite Code</label>
                <input
                  type="text"
                  {...register('code')}
                  className="w-full bg-transparent pt-7 pb-3 px-4 text-white placeholder:text-white/30 focus:outline-none text-sm uppercase tracking-wider"
                  placeholder="Enter your invite code"
                  autoComplete="off"
                />
              </div>
              {errors.code && <p className="text-xs text-ds-error px-1">{errors.code.message}</p>}
            </div>

            {/* Spacer */}
            <div className="pt-4" />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-70"
              style={{
                background: 'var(--button-cream)',
                color: 'var(--button-cream-foreground)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  Validating...
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </form>

          {/* Sign in link */}
          <div
            className="text-center mt-6 pt-6"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <p className="text-white/40 text-sm">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-crafted-sage hover:text-crafted-mint transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 sm:bottom-6 left-0 right-0 text-center text-[10px] sm:text-xs text-white/30 px-4">
        <p>&copy; {new Date().getFullYear()} Crafted. All rights reserved.</p>
      </footer>
    </div>
  )
}
