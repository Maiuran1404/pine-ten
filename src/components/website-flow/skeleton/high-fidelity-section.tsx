'use client'

import { cn } from '@/lib/utils'
import { CircleIcon, QuoteGlyph } from '@/components/chat/wireframe/wireframe-shapes'

export interface GlobalStyles {
  primaryColor?: string
  secondaryColor?: string
  fontPrimary?: string
  fontSecondary?: string
  layoutDensity?: 'compact' | 'balanced' | 'spacious'
}

interface HighFidelitySectionProps {
  type: string
  globalStyles?: GlobalStyles
  className?: string
  content?: Record<string, unknown>
}

const DENSITY_PADDING = {
  compact: { section: 'py-6 px-6', inner: 'gap-3' },
  balanced: { section: 'py-10 px-8', inner: 'gap-5' },
  spacious: { section: 'py-16 px-10', inner: 'gap-8' },
} as const

function getDensity(d?: 'compact' | 'balanced' | 'spacious') {
  return DENSITY_PADDING[d ?? 'balanced']
}

function GradientPlaceholder({
  primaryColor,
  secondaryColor,
  className,
}: {
  primaryColor?: string
  secondaryColor?: string
  className?: string
}) {
  const from = primaryColor ?? '#6366f1'
  const to = secondaryColor ?? '#8b5cf6'
  return (
    <div
      className={cn('rounded-md', className)}
      style={{
        background: `linear-gradient(135deg, ${from}33 0%, ${to}33 100%)`,
      }}
    />
  )
}

function StyledButton({
  primaryColor,
  label,
  width,
  fontSecondary,
}: {
  primaryColor?: string
  label: string
  width?: string
  fontSecondary?: string
}) {
  return (
    <div
      className={cn('h-7 rounded-full flex items-center justify-center', width ?? 'w-32')}
      style={{
        backgroundColor: primaryColor ?? '#6366f1',
        fontFamily: fontSecondary,
      }}
    >
      <span className="text-[10px] font-medium text-white">{label}</span>
    </div>
  )
}

function HighNavigation({ globalStyles: s }: { globalStyles?: GlobalStyles }) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border">
      <span
        className="text-sm font-bold tracking-tight"
        style={{ color: s?.primaryColor ?? undefined, fontFamily: s?.fontPrimary }}
      >
        BrandName
      </span>
      <nav className="flex items-center gap-5">
        {['Home', 'About', 'Services', 'Contact'].map((link) => (
          <span
            key={link}
            className="text-xs text-muted-foreground"
            style={{ fontFamily: s?.fontSecondary }}
          >
            {link}
          </span>
        ))}
      </nav>
      <StyledButton
        primaryColor={s?.primaryColor}
        label="Get Started"
        width="w-20"
        fontSecondary={s?.fontSecondary}
      />
    </div>
  )
}

function HighHero({ globalStyles: s }: { globalStyles?: GlobalStyles }) {
  const d = getDensity(s?.layoutDensity)
  return (
    <div className={cn(d.section, 'space-y-4')}>
      <h1
        className="text-2xl font-bold"
        style={{ color: s?.primaryColor ?? undefined, fontFamily: s?.fontPrimary }}
      >
        Transform Your Business Today
      </h1>
      <p
        className="text-sm text-muted-foreground max-w-md"
        style={{ fontFamily: s?.fontSecondary }}
      >
        We help companies achieve their goals with innovative solutions designed for the modern
        world.
      </p>
      <StyledButton
        primaryColor={s?.primaryColor}
        label="Get Started"
        fontSecondary={s?.fontSecondary}
      />
    </div>
  )
}

function HighFeatures({ globalStyles: s }: { globalStyles?: GlobalStyles }) {
  const d = getDensity(s?.layoutDensity)
  const features = [
    {
      title: 'Fast Performance',
      description: 'Lightning-fast load times that keep your visitors engaged and coming back.',
    },
    {
      title: 'Modern Design',
      description: 'Clean, contemporary layouts that make a lasting first impression.',
    },
    {
      title: 'Easy to Use',
      description: 'Intuitive navigation and clear calls-to-action guide your users.',
    },
  ]

  return (
    <div className={cn(d.section)}>
      <h2
        className="text-lg font-semibold mb-2"
        style={{ color: s?.primaryColor ?? undefined, fontFamily: s?.fontPrimary }}
      >
        Why Choose Us
      </h2>
      <p
        className="text-xs text-muted-foreground mb-6 max-w-sm"
        style={{ fontFamily: s?.fontSecondary }}
      >
        Everything you need to succeed online.
      </p>
      <div className={cn('grid grid-cols-3', d.inner)}>
        {features.map((feature) => (
          <div key={feature.title} className="space-y-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: s?.primaryColor ? `${s.primaryColor}20` : undefined,
                borderColor: s?.primaryColor ?? undefined,
                border: `1px solid ${s?.primaryColor ?? '#e2e8f0'}`,
              }}
            />
            <h3
              className="text-sm font-semibold"
              style={{ color: s?.secondaryColor ?? undefined, fontFamily: s?.fontPrimary }}
            >
              {feature.title}
            </h3>
            <p
              className="text-xs text-muted-foreground leading-relaxed"
              style={{ fontFamily: s?.fontSecondary }}
            >
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function HighAbout({ globalStyles: s }: { globalStyles?: GlobalStyles }) {
  const d = getDensity(s?.layoutDensity)
  return (
    <div className={cn(d.section, 'grid grid-cols-2 items-center', d.inner)}>
      <div className="space-y-3">
        <h2
          className="text-lg font-semibold"
          style={{ color: s?.primaryColor ?? undefined, fontFamily: s?.fontPrimary }}
        >
          About Our Company
        </h2>
        <p
          className="text-xs text-muted-foreground leading-relaxed"
          style={{ fontFamily: s?.fontSecondary }}
        >
          Founded in 2020, we have been helping businesses of all sizes build their online presence.
          Our team of experts combines creativity with technical excellence to deliver results.
        </p>
        <p
          className="text-xs text-muted-foreground leading-relaxed"
          style={{ fontFamily: s?.fontSecondary }}
        >
          We believe great design is about more than aesthetics. It is about creating experiences
          that connect with your audience and drive growth.
        </p>
      </div>
      <GradientPlaceholder
        primaryColor={s?.primaryColor}
        secondaryColor={s?.secondaryColor}
        className="aspect-video"
      />
    </div>
  )
}

function HighTestimonials({ globalStyles: s }: { globalStyles?: GlobalStyles }) {
  const d = getDensity(s?.layoutDensity)
  const testimonials = [
    {
      quote:
        'Working with this team transformed our online presence. Our conversions increased by 40% in just three months.',
      name: 'Sarah Johnson',
      role: 'CEO, TechStart',
    },
    {
      quote:
        'The design process was seamless and collaborative. They truly understood our brand vision from day one.',
      name: 'Michael Chen',
      role: 'Founder, GreenLeaf',
    },
  ]

  return (
    <div className={cn(d.section)}>
      <h2
        className="text-lg font-semibold mb-6"
        style={{ color: s?.primaryColor ?? undefined, fontFamily: s?.fontPrimary }}
      >
        What Our Clients Say
      </h2>
      <div className={cn('grid grid-cols-2', d.inner)}>
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="p-5 rounded-lg space-y-3"
            style={{
              border: `1px solid ${s?.primaryColor ? `${s.primaryColor}30` : '#e2e8f0'}`,
              backgroundColor: s?.primaryColor ? `${s.primaryColor}08` : undefined,
            }}
          >
            <QuoteGlyph className="text-3xl" />
            <p
              className="text-xs text-muted-foreground leading-relaxed italic"
              style={{ fontFamily: s?.fontSecondary }}
            >
              {t.quote}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <CircleIcon size="sm" />
              <div>
                <p
                  className="text-xs font-medium"
                  style={{ color: s?.secondaryColor ?? undefined, fontFamily: s?.fontPrimary }}
                >
                  {t.name}
                </p>
                <p
                  className="text-[10px] text-muted-foreground"
                  style={{ fontFamily: s?.fontSecondary }}
                >
                  {t.role}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HighStats({ globalStyles: s }: { globalStyles?: GlobalStyles }) {
  const d = getDensity(s?.layoutDensity)
  const stats = [
    { value: '500+', label: 'Projects Completed' },
    { value: '98%', label: 'Client Satisfaction' },
    { value: '50+', label: 'Team Members' },
    { value: '12', label: 'Years of Experience' },
  ]

  return (
    <div
      className={cn(d.section)}
      style={{
        backgroundColor: s?.primaryColor ? `${s.primaryColor}0a` : undefined,
      }}
    >
      <div className={cn('grid grid-cols-4 text-center', d.inner)}>
        {stats.map((stat) => (
          <div key={stat.label} className="space-y-1">
            <p
              className="text-xl font-bold"
              style={{ color: s?.primaryColor ?? undefined, fontFamily: s?.fontPrimary }}
            >
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: s?.fontSecondary }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function HighGallery({ globalStyles: s }: { globalStyles?: GlobalStyles }) {
  const d = getDensity(s?.layoutDensity)
  return (
    <div className={cn(d.section)}>
      <h2
        className="text-lg font-semibold mb-2"
        style={{ color: s?.primaryColor ?? undefined, fontFamily: s?.fontPrimary }}
      >
        Our Work
      </h2>
      <p className="text-xs text-muted-foreground mb-6" style={{ fontFamily: s?.fontSecondary }}>
        A selection of our recent projects.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <GradientPlaceholder
            key={i}
            primaryColor={s?.primaryColor}
            secondaryColor={s?.secondaryColor}
            className="aspect-square"
          />
        ))}
      </div>
    </div>
  )
}

function HighPricing({ globalStyles: s }: { globalStyles?: GlobalStyles }) {
  const d = getDensity(s?.layoutDensity)
  const plans = [
    {
      name: 'Starter',
      price: '$29/mo',
      features: ['5 Pages', 'Basic SEO', 'Email Support'],
      highlighted: false,
    },
    {
      name: 'Professional',
      price: '$79/mo',
      features: ['15 Pages', 'Advanced SEO', 'Priority Support', 'Analytics'],
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: '$199/mo',
      features: ['Unlimited Pages', 'Full SEO Suite', '24/7 Support', 'Custom Integrations'],
      highlighted: false,
    },
  ]

  return (
    <div className={cn(d.section)}>
      <h2
        className="text-lg font-semibold text-center mb-2"
        style={{ color: s?.primaryColor ?? undefined, fontFamily: s?.fontPrimary }}
      >
        Pricing Plans
      </h2>
      <p
        className="text-xs text-muted-foreground text-center mb-6"
        style={{ fontFamily: s?.fontSecondary }}
      >
        Choose the plan that fits your needs.
      </p>
      <div className={cn('grid grid-cols-3', d.inner)}>
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="p-5 rounded-lg space-y-3"
            style={{
              border: plan.highlighted
                ? `2px solid ${s?.primaryColor ?? '#6366f1'}`
                : `1px solid ${s?.primaryColor ? `${s.primaryColor}30` : '#e2e8f0'}`,
              backgroundColor: plan.highlighted ? `${s?.primaryColor ?? '#6366f1'}08` : undefined,
            }}
          >
            <h3
              className="text-sm font-semibold"
              style={{ color: s?.secondaryColor ?? undefined, fontFamily: s?.fontPrimary }}
            >
              {plan.name}
            </h3>
            <p
              className="text-xl font-bold"
              style={{ color: s?.primaryColor ?? undefined, fontFamily: s?.fontPrimary }}
            >
              {plan.price}
            </p>
            <ul className="space-y-1.5">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="text-xs text-muted-foreground flex items-center gap-1.5"
                  style={{ fontFamily: s?.fontSecondary }}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: `${s?.primaryColor ?? '#6366f1'}20` }}
                  >
                    <svg
                      className="w-2 h-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke={s?.primaryColor ?? '#6366f1'}
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <StyledButton
              primaryColor={plan.highlighted ? s?.primaryColor : s?.secondaryColor}
              label="Choose Plan"
              width="w-full"
              fontSecondary={s?.fontSecondary}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function HighTeam({ globalStyles: s }: { globalStyles?: GlobalStyles }) {
  const d = getDensity(s?.layoutDensity)
  const members = [
    { name: 'Alex Rivera', role: 'Lead Designer' },
    { name: 'Jordan Lee', role: 'Developer' },
    { name: 'Sam Patel', role: 'Project Manager' },
    { name: 'Casey Morgan', role: 'Strategist' },
  ]

  return (
    <div className={cn(d.section)}>
      <h2
        className="text-lg font-semibold mb-2"
        style={{ color: s?.primaryColor ?? undefined, fontFamily: s?.fontPrimary }}
      >
        Meet Our Team
      </h2>
      <p className="text-xs text-muted-foreground mb-6" style={{ fontFamily: s?.fontSecondary }}>
        The talented people behind every project.
      </p>
      <div className={cn('grid grid-cols-4', d.inner)}>
        {members.map((m) => (
          <div key={m.name} className="text-center space-y-2">
            <GradientPlaceholder
              primaryColor={s?.primaryColor}
              secondaryColor={s?.secondaryColor}
              className="aspect-square rounded-full mx-auto w-16 h-16"
            />
            <h3
              className="text-xs font-semibold"
              style={{ color: s?.secondaryColor ?? undefined, fontFamily: s?.fontPrimary }}
            >
              {m.name}
            </h3>
            <p
              className="text-[10px] text-muted-foreground"
              style={{ fontFamily: s?.fontSecondary }}
            >
              {m.role}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function HighFaq({ globalStyles: s }: { globalStyles?: GlobalStyles }) {
  const d = getDensity(s?.layoutDensity)
  const faqs = [
    { q: 'How long does a project take?', a: 'Most projects are completed within 4-6 weeks.' },
    { q: 'Do you offer revisions?', a: 'Yes, every plan includes multiple revision rounds.' },
    { q: 'Can I update the site myself?', a: 'Absolutely. We build on easy-to-use platforms.' },
  ]

  return (
    <div className={cn(d.section)}>
      <h2
        className="text-lg font-semibold mb-6"
        style={{ color: s?.primaryColor ?? undefined, fontFamily: s?.fontPrimary }}
      >
        Frequently Asked Questions
      </h2>
      <div className="space-y-2 max-w-lg">
        {faqs.map((faq) => (
          <div
            key={faq.q}
            className="flex items-center justify-between px-4 py-3 rounded-sm"
            style={{
              border: `1px solid ${s?.primaryColor ? `${s.primaryColor}30` : '#e2e8f0'}`,
              backgroundColor: s?.primaryColor ? `${s.primaryColor}08` : undefined,
            }}
          >
            <p
              className="text-xs font-medium"
              style={{ color: s?.secondaryColor ?? undefined, fontFamily: s?.fontSecondary }}
            >
              {faq.q}
            </p>
            <svg
              className="w-3 h-3 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke={s?.primaryColor ?? '#94a3b8'}
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  )
}

function HighCta({ globalStyles: s }: { globalStyles?: GlobalStyles }) {
  const d = getDensity(s?.layoutDensity)
  return (
    <div
      className={cn(d.section, 'text-center space-y-4')}
      style={{
        backgroundColor: s?.primaryColor ? `${s.primaryColor}0a` : undefined,
      }}
    >
      <h2
        className="text-xl font-bold"
        style={{ color: s?.primaryColor ?? undefined, fontFamily: s?.fontPrimary }}
      >
        Ready to Get Started?
      </h2>
      <p
        className="text-sm text-muted-foreground max-w-md mx-auto"
        style={{ fontFamily: s?.fontSecondary }}
      >
        Join hundreds of businesses that have already transformed their online presence.
      </p>
      <div className="flex justify-center gap-3">
        <StyledButton
          primaryColor={s?.primaryColor}
          label="Start Now"
          fontSecondary={s?.fontSecondary}
        />
        <StyledButton
          primaryColor={s?.secondaryColor}
          label="Learn More"
          width="w-28"
          fontSecondary={s?.fontSecondary}
        />
      </div>
    </div>
  )
}

function HighContact({ globalStyles: s }: { globalStyles?: GlobalStyles }) {
  const d = getDensity(s?.layoutDensity)
  return (
    <div className={cn(d.section)}>
      <h2
        className="text-lg font-semibold mb-6"
        style={{ color: s?.primaryColor ?? undefined, fontFamily: s?.fontPrimary }}
      >
        Get in Touch
      </h2>
      <div className={cn('grid grid-cols-2', d.inner)}>
        <div className="space-y-3">
          <div className="space-y-1">
            <label
              className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              style={{ fontFamily: s?.fontSecondary }}
            >
              Name
            </label>
            <div
              className="h-8 rounded"
              style={{
                border: `1px solid ${s?.primaryColor ? `${s.primaryColor}30` : '#e2e8f0'}`,
                backgroundColor: s?.primaryColor ? `${s.primaryColor}05` : undefined,
              }}
            />
          </div>
          <div className="space-y-1">
            <label
              className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              style={{ fontFamily: s?.fontSecondary }}
            >
              Email
            </label>
            <div
              className="h-8 rounded"
              style={{
                border: `1px solid ${s?.primaryColor ? `${s.primaryColor}30` : '#e2e8f0'}`,
                backgroundColor: s?.primaryColor ? `${s.primaryColor}05` : undefined,
              }}
            />
          </div>
          <div className="space-y-1">
            <label
              className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
              style={{ fontFamily: s?.fontSecondary }}
            >
              Message
            </label>
            <div
              className="h-20 rounded"
              style={{
                border: `1px solid ${s?.primaryColor ? `${s.primaryColor}30` : '#e2e8f0'}`,
                backgroundColor: s?.primaryColor ? `${s.primaryColor}05` : undefined,
              }}
            />
          </div>
          <StyledButton
            primaryColor={s?.primaryColor}
            label="Send Message"
            width="w-28"
            fontSecondary={s?.fontSecondary}
          />
        </div>
        <div className="space-y-3">
          <p
            className="text-xs text-muted-foreground leading-relaxed"
            style={{ fontFamily: s?.fontSecondary }}
          >
            Have a question or ready to start a project? Fill out the form and we will get back to
            you within 24 hours.
          </p>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground" style={{ fontFamily: s?.fontSecondary }}>
              hello@yourcompany.com
            </p>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: s?.fontSecondary }}>
              +1 (555) 123-4567
            </p>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: s?.fontSecondary }}>
              123 Main St, Suite 100
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function HighFooter({ globalStyles: s }: { globalStyles?: GlobalStyles }) {
  const columns = [
    { title: 'Company', links: ['About', 'Careers', 'Press'] },
    { title: 'Product', links: ['Features', 'Pricing', 'Integrations'] },
    { title: 'Resources', links: ['Blog', 'Help Center', 'Guides'] },
    { title: 'Legal', links: ['Privacy', 'Terms', 'Cookie Policy'] },
  ]

  return (
    <div
      className="py-8 px-8"
      style={{
        backgroundColor: s?.primaryColor ? `${s.primaryColor}0a` : undefined,
      }}
    >
      <div className="grid grid-cols-4 gap-6 mb-6">
        {columns.map((col) => (
          <div key={col.title}>
            <h4
              className="text-xs font-semibold mb-2"
              style={{ color: s?.secondaryColor ?? undefined, fontFamily: s?.fontPrimary }}
            >
              {col.title}
            </h4>
            <ul className="space-y-1">
              {col.links.map((link) => (
                <li
                  key={link}
                  className="text-[10px] text-muted-foreground"
                  style={{ fontFamily: s?.fontSecondary }}
                >
                  {link}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div
        className="pt-4"
        style={{ borderTop: `1px solid ${s?.primaryColor ? `${s.primaryColor}20` : '#e2e8f0'}` }}
      >
        <p
          className="text-[10px] text-muted-foreground text-center"
          style={{ fontFamily: s?.fontSecondary }}
        >
          2026 YourCompany. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export function HighFidelitySection({ type, globalStyles, className }: HighFidelitySectionProps) {
  const content = (() => {
    switch (type) {
      case 'navigation':
        return <HighNavigation globalStyles={globalStyles} />
      case 'hero':
        return <HighHero globalStyles={globalStyles} />
      case 'features':
        return <HighFeatures globalStyles={globalStyles} />
      case 'about':
        return <HighAbout globalStyles={globalStyles} />
      case 'testimonials':
        return <HighTestimonials globalStyles={globalStyles} />
      case 'stats':
        return <HighStats globalStyles={globalStyles} />
      case 'gallery':
        return <HighGallery globalStyles={globalStyles} />
      case 'pricing':
        return <HighPricing globalStyles={globalStyles} />
      case 'team':
        return <HighTeam globalStyles={globalStyles} />
      case 'faq':
        return <HighFaq globalStyles={globalStyles} />
      case 'cta':
        return <HighCta globalStyles={globalStyles} />
      case 'contact':
        return <HighContact globalStyles={globalStyles} />
      case 'footer':
        return <HighFooter globalStyles={globalStyles} />
      default:
        return (
          <div className={cn(getDensity(globalStyles?.layoutDensity).section)}>
            <h2
              className="text-lg font-semibold mb-2"
              style={{
                color: globalStyles?.primaryColor ?? undefined,
                fontFamily: globalStyles?.fontPrimary,
              }}
            >
              Section Title
            </h2>
            <p
              className="text-xs text-muted-foreground leading-relaxed"
              style={{ fontFamily: globalStyles?.fontSecondary }}
            >
              This section contains relevant content about your business that will be customized
              during the design process.
            </p>
          </div>
        )
    }
  })()

  return <div className={cn(className)}>{content}</div>
}
