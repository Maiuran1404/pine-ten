'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AlertCircle, RefreshCw, ArrowLeft, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/loading'
import { cn } from '@/lib/utils'

const ERROR_MESSAGES: Record<
  string,
  { title: string; description: string; icon: React.ReactNode }
> = {
  state_mismatch: {
    title: 'Session Conflict Detected',
    description:
      'It looks like you may already be signed into a different portal (client or artist) with this Google account. Please sign out of any other sessions and try again.',
    icon: <UserX className="w-12 h-12 text-amber-500" />,
  },
  oauth_code_verification_failed: {
    title: 'Sign-in Session Expired',
    description:
      "Your sign-in session expired or there was a conflict with another login. This can happen if you're signed into multiple portals. Please try signing in again.",
    icon: <RefreshCw className="w-12 h-12 text-amber-500" />,
  },
  oAuth_code_missing: {
    title: 'Sign-in Interrupted',
    description:
      'The sign-in process was interrupted. This can happen if you cancelled the sign-in or if there was a browser issue. Please try again.',
    icon: <AlertCircle className="w-12 h-12 text-amber-500" />,
  },
  default: {
    title: 'Something went wrong',
    description:
      'We encountered an unexpected error during sign-in. Please try again or contact support if the issue persists.',
    icon: <AlertCircle className="w-12 h-12 text-red-500" />,
  },
}

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const errorCode = searchParams.get('error') || 'default'
  const errorDescription = searchParams.get('error_description')

  const errorInfo = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default

  const handleTryAgain = () => {
    router.push('/login')
  }

  const gradientButtonStyle = {
    background: 'linear-gradient(135deg, #4a7c4a 0%, #6b9b6b 50%, #8bb58b 100%)',
  }

  const gradientButtonClass = cn(
    'h-12 text-base font-medium transition-all duration-300',
    'shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-white border-0'
  )

  return (
    <div className="space-y-8">
      {/* Error Icon */}
      <div className="flex justify-center lg:justify-start">
        <div className="p-4 bg-muted/50 rounded-full">{errorInfo.icon}</div>
      </div>

      {/* Error Message */}
      <div className="space-y-3 text-center lg:text-left">
        <h1 className="text-2xl font-bold tracking-tight">{errorInfo.title}</h1>
        <p className="text-muted-foreground leading-relaxed">{errorInfo.description}</p>
        {errorDescription && (
          <p className="text-sm text-muted-foreground/70 bg-muted/30 p-3 rounded-lg">
            Details: {errorDescription}
          </p>
        )}
      </div>

      {/* Error Code Badge */}
      <div className="flex justify-center lg:justify-start">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm">
          <span className="text-muted-foreground">Error code:</span>
          <code className="font-mono text-foreground">{errorCode}</code>
        </div>
      </div>

      {/* Tips for state_mismatch */}
      {(errorCode === 'state_mismatch' || errorCode === 'oauth_code_verification_failed') && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Quick fix:</p>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Open an incognito/private browser window</li>
            <li>Go to this portal and try signing in again</li>
            <li>Or sign out from all other Crafted portals first</li>
          </ol>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleTryAgain}
          className={cn(gradientButtonClass, 'flex-1')}
          style={gradientButtonStyle}
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Try signing in again
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="h-12 text-base font-medium flex-1"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Go home
        </Button>
      </div>

      {/* Help text */}
      <div className="pt-4 border-t border-border/50">
        <p className="text-xs text-center lg:text-left text-muted-foreground">
          If this keeps happening, try clearing your browser cookies or contact support.
        </p>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  )
}
