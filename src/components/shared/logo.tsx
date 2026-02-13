'use client'

import Link from 'next/link'
import Image from 'next/image'

interface LogoProps {
  className?: string
  href?: string
  size?: 'sm' | 'md' | 'lg'
  name?: string
  showText?: boolean
  variant?: 'figure' | 'text' | 'combined'
}

export function Logo({
  className = '',
  href = '/',
  size = 'md',
  name = 'Crafted',
  showText = true,
  variant = 'figure',
}: LogoProps) {
  const sizes = {
    sm: { icon: 24, text: 'text-sm' },
    md: { icon: 32, text: 'text-lg' },
    lg: { icon: 40, text: 'text-xl' },
  }

  const { icon, text } = sizes[size]

  // Get the right logo source based on variant
  const getLogoSrc = (isDark: boolean) => {
    const color = isDark ? 'white' : 'black'
    switch (variant) {
      case 'text':
        return `/craftedtext${color}.png`
      case 'combined':
        return isDark ? '/craftedcombinedwhite.png' : '/craftedcombintedblack.png'
      case 'figure':
      default:
        return `/craftedfigure${color}.png`
    }
  }

  const content = (
    <>
      {/* Dark mode logo */}
      <Image
        src={getLogoSrc(true)}
        alt={name}
        width={variant === 'combined' ? icon * 3 : icon}
        height={icon}
        className="dark:block hidden object-contain"
      />
      {/* Light mode logo */}
      <Image
        src={getLogoSrc(false)}
        alt={name}
        width={variant === 'combined' ? icon * 3 : icon}
        height={icon}
        className="dark:hidden block object-contain"
      />
      {showText && variant === 'figure' && (
        <span className={`font-semibold ${text} tracking-tight`}>{name}</span>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={`flex items-center gap-2 ${className}`}>
        {content}
      </Link>
    )
  }

  return <div className={`flex items-center gap-2 ${className}`}>{content}</div>
}
