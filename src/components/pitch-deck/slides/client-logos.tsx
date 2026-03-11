interface ClientLogosProps {
  logoBasePath?: string
  logoDataMap?: Record<string, string>
}

export const CLIENT_LOGOS = [
  { src: 'logo-cocacola.png', alt: 'Coca-Cola', height: 48 },
  { src: 'logo-asics.png', alt: 'asics', height: 42 },
  { src: 'logo-unicef.png', alt: 'UNICEF', height: 48 },
  { src: 'logo-samsung.png', alt: 'Samsung', height: 36 },
  { src: 'logo-ikea.png', alt: 'IKEA', height: 48 },
  { src: 'logo-puma.png', alt: 'Puma', height: 48 },
  { src: 'logo-zalando.png', alt: 'Zalando', height: 36 },
]

export function ClientLogos({ logoBasePath = '/', logoDataMap }: ClientLogosProps) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 64,
        alignItems: 'center',
      }}
    >
      {CLIENT_LOGOS.map((logo) => (
        <img
          key={logo.alt}
          src={logoDataMap?.[logo.src] ?? `${logoBasePath}${logo.src}`}
          alt={logo.alt}
          style={{
            height: logo.height,
            objectFit: 'contain',
            filter: 'grayscale(100%)',
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  )
}
