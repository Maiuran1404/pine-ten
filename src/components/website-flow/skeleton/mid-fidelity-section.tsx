'use client'

import { cn } from '@/lib/utils'
import {
  ImagePlaceholder,
  ButtonShape,
  CircleIcon,
  QuoteGlyph,
} from '@/components/chat/wireframe/wireframe-shapes'

interface MidFidelitySectionProps {
  type: string
  className?: string
  content?: Record<string, unknown>
}

function MidNavigation() {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border">
      <span className="text-sm font-bold text-foreground/80 tracking-tight">BrandName</span>
      <nav className="flex items-center gap-5">
        {['Home', 'About', 'Services', 'Contact'].map((link) => (
          <span key={link} className="text-xs text-muted-foreground">
            {link}
          </span>
        ))}
      </nav>
      <ButtonShape width="w-20" />
    </div>
  )
}

function MidHero({ content }: { content?: Record<string, unknown> }) {
  const headline = (content?.headline as string) || 'Transform Your Business Today'
  const subheadline =
    (content?.subheadline as string) ||
    'We help companies achieve their goals with innovative solutions designed for the modern world.'
  return (
    <div className="py-16 px-8 space-y-4">
      <h1 className="text-2xl font-bold text-foreground/80">{headline}</h1>
      <p className="text-sm text-muted-foreground max-w-md">{subheadline}</p>
      <ButtonShape width="w-32" />
    </div>
  )
}

function MidFeatures({ content }: { content?: Record<string, unknown> }) {
  const headline = (content?.headline as string) || 'Why Choose Us'
  const subheadline = (content?.subheadline as string) || 'Everything you need to succeed online.'
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
    <div className="py-10 px-8">
      <h2 className="text-lg font-semibold text-foreground/80 mb-2">{headline}</h2>
      <p className="text-xs text-muted-foreground mb-6 max-w-sm">{subheadline}</p>
      <div className="grid grid-cols-3 gap-6">
        {features.map((feature) => (
          <div key={feature.title} className="space-y-2">
            <div className="w-9 h-9 rounded-lg bg-muted border border-border" />
            <h3 className="text-sm font-semibold text-foreground/70">{feature.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MidAbout({ content }: { content?: Record<string, unknown> }) {
  const headline = (content?.headline as string) || 'About Our Company'
  const body =
    (content?.draftContent as string) ||
    'Founded in 2020, we have been helping businesses of all sizes build their online presence. Our team of experts combines creativity with technical excellence to deliver results.'
  return (
    <div className="py-10 px-8 grid grid-cols-2 gap-8 items-center">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground/80">{headline}</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
      </div>
      <ImagePlaceholder className="aspect-video" />
    </div>
  )
}

function MidTestimonials() {
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
    <div className="py-10 px-8">
      <h2 className="text-lg font-semibold text-foreground/80 mb-6">What Our Clients Say</h2>
      <div className="grid grid-cols-2 gap-5">
        {testimonials.map((t) => (
          <div key={t.name} className="p-5 border border-border rounded-lg space-y-3">
            <QuoteGlyph className="text-3xl" />
            <p className="text-xs text-muted-foreground leading-relaxed italic">{t.quote}</p>
            <div className="flex items-center gap-2 pt-1">
              <CircleIcon size="sm" />
              <div>
                <p className="text-xs font-medium text-foreground/70">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MidStats() {
  const stats = [
    { value: '500+', label: 'Projects Completed' },
    { value: '98%', label: 'Client Satisfaction' },
    { value: '50+', label: 'Team Members' },
    { value: '12', label: 'Years of Experience' },
  ]

  return (
    <div className="py-10 px-8 bg-muted/30">
      <div className="grid grid-cols-4 gap-6 text-center">
        {stats.map((stat) => (
          <div key={stat.label} className="space-y-1">
            <p className="text-xl font-bold text-foreground/80">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MidGallery() {
  return (
    <div className="py-10 px-8">
      <h2 className="text-lg font-semibold text-foreground/80 mb-2">Our Work</h2>
      <p className="text-xs text-muted-foreground mb-6">A selection of our recent projects.</p>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <ImagePlaceholder key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  )
}

function MidPricing() {
  const plans = [
    {
      name: 'Starter',
      price: '$29/mo',
      features: ['5 Pages', 'Basic SEO', 'Email Support'],
    },
    {
      name: 'Professional',
      price: '$79/mo',
      features: ['15 Pages', 'Advanced SEO', 'Priority Support', 'Analytics'],
    },
    {
      name: 'Enterprise',
      price: '$199/mo',
      features: ['Unlimited Pages', 'Full SEO Suite', '24/7 Support', 'Custom Integrations'],
    },
  ]

  return (
    <div className="py-10 px-8">
      <h2 className="text-lg font-semibold text-foreground/80 text-center mb-2">Pricing Plans</h2>
      <p className="text-xs text-muted-foreground text-center mb-6">
        Choose the plan that fits your needs.
      </p>
      <div className="grid grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.name} className="p-5 border border-border rounded-lg space-y-3">
            <h3 className="text-sm font-semibold text-foreground/70">{plan.name}</h3>
            <p className="text-xl font-bold text-foreground/80">{plan.price}</p>
            <ul className="space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm border border-border bg-muted flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <ButtonShape width="w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

function MidTeam() {
  const members = [
    { name: 'Alex Rivera', role: 'Lead Designer' },
    { name: 'Jordan Lee', role: 'Developer' },
    { name: 'Sam Patel', role: 'Project Manager' },
    { name: 'Casey Morgan', role: 'Strategist' },
  ]

  return (
    <div className="py-10 px-8">
      <h2 className="text-lg font-semibold text-foreground/80 mb-2">Meet Our Team</h2>
      <p className="text-xs text-muted-foreground mb-6">
        The talented people behind every project.
      </p>
      <div className="grid grid-cols-4 gap-5">
        {members.map((m) => (
          <div key={m.name} className="text-center space-y-2">
            <ImagePlaceholder className="aspect-square rounded-full mx-auto w-16 h-16" />
            <h3 className="text-xs font-semibold text-foreground/70">{m.name}</h3>
            <p className="text-[10px] text-muted-foreground">{m.role}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function MidFaq() {
  const faqs = [
    { q: 'How long does a project take?', a: 'Most projects are completed within 4-6 weeks.' },
    { q: 'Do you offer revisions?', a: 'Yes, every plan includes multiple revision rounds.' },
    { q: 'Can I update the site myself?', a: 'Absolutely. We build on easy-to-use platforms.' },
  ]

  return (
    <div className="py-10 px-8">
      <h2 className="text-lg font-semibold text-foreground/80 mb-6">Frequently Asked Questions</h2>
      <div className="space-y-2 max-w-lg">
        {faqs.map((faq) => (
          <div
            key={faq.q}
            className="flex items-center justify-between px-4 py-3 border border-border rounded-sm bg-muted"
          >
            <p className="text-xs font-medium text-foreground/70">{faq.q}</p>
            <svg
              className="w-3 h-3 text-muted-foreground flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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

function MidCta({ content }: { content?: Record<string, unknown> }) {
  const headline = (content?.headline as string) || 'Ready to Get Started?'
  const subheadline =
    (content?.subheadline as string) ||
    'Join hundreds of businesses that have already transformed their online presence.'
  return (
    <div className="py-14 px-8 text-center space-y-4">
      <h2 className="text-xl font-bold text-foreground/80">{headline}</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{subheadline}</p>
      <div className="flex justify-center gap-3">
        <ButtonShape width="w-32" />
        <ButtonShape width="w-28" />
      </div>
    </div>
  )
}

function MidContact() {
  return (
    <div className="py-10 px-8">
      <h2 className="text-lg font-semibold text-foreground/80 mb-6">Get in Touch</h2>
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Name
            </label>
            <div className="h-8 rounded border border-border bg-muted/50" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Email
            </label>
            <div className="h-8 rounded border border-border bg-muted/50" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Message
            </label>
            <div className="h-20 rounded border border-border bg-muted/50" />
          </div>
          <ButtonShape width="w-24" />
        </div>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Have a question or ready to start a project? Fill out the form and we will get back to
            you within 24 hours.
          </p>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">hello@yourcompany.com</p>
            <p className="text-xs text-muted-foreground">+1 (555) 123-4567</p>
            <p className="text-xs text-muted-foreground">123 Main St, Suite 100</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MidFooter() {
  const columns = [
    { title: 'Company', links: ['About', 'Careers', 'Press'] },
    { title: 'Product', links: ['Features', 'Pricing', 'Integrations'] },
    { title: 'Resources', links: ['Blog', 'Help Center', 'Guides'] },
    { title: 'Legal', links: ['Privacy', 'Terms', 'Cookie Policy'] },
  ]

  return (
    <div className="py-8 px-8 bg-muted/50">
      <div className="grid grid-cols-4 gap-6 mb-6">
        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-xs font-semibold text-foreground/70 mb-2">{col.title}</h4>
            <ul className="space-y-1">
              {col.links.map((link) => (
                <li key={link} className="text-[10px] text-muted-foreground">
                  {link}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-4">
        <p className="text-[10px] text-muted-foreground text-center">
          2026 YourCompany. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export function MidFidelitySection({ type, className, content }: MidFidelitySectionProps) {
  const sectionContent = (() => {
    switch (type) {
      case 'navigation':
        return <MidNavigation />
      case 'hero':
        return <MidHero content={content} />
      case 'features':
        return <MidFeatures content={content} />
      case 'about':
        return <MidAbout content={content} />
      case 'testimonials':
        return <MidTestimonials />
      case 'stats':
        return <MidStats />
      case 'gallery':
        return <MidGallery />
      case 'pricing':
        return <MidPricing />
      case 'team':
        return <MidTeam />
      case 'faq':
        return <MidFaq />
      case 'cta':
        return <MidCta content={content} />
      case 'contact':
        return <MidContact />
      case 'footer':
        return <MidFooter />
      default:
        return (
          <div className="py-8 px-8">
            <h2 className="text-lg font-semibold text-foreground/80 mb-2">
              {(content?.headline as string) || 'Section Title'}
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {(content?.draftContent as string) ||
                'This section contains relevant content about your business that will be customized during the design process.'}
            </p>
          </div>
        )
    }
  })()

  return <div className={cn(className)}>{sectionContent}</div>
}
