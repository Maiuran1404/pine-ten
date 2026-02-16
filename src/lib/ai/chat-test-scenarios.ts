export interface ChatTestScenario {
  name: string
  industry: string
  companyName: string
  platform: string
  contentType: string
  intent: string
  openingMessage: string
}

export const chatTestScenarios: ChatTestScenario[] = [
  {
    name: 'B2B SaaS Launch Video',
    industry: 'SaaS',
    companyName: 'CloudMetrics',
    platform: 'LinkedIn',
    contentType: 'video',
    intent: 'announcement',
    openingMessage:
      "We're launching a new analytics dashboard product next month and need a professional launch video for LinkedIn. Our target audience is CTOs and VP Engineering at mid-size companies.",
  },
  {
    name: 'E-commerce Instagram Campaign',
    industry: 'E-commerce',
    companyName: 'GlowSkin Beauty',
    platform: 'Instagram',
    contentType: 'carousel',
    intent: 'sales',
    openingMessage:
      'We need an Instagram carousel campaign for our summer skincare collection. We want to drive sales with a fresh, vibrant aesthetic that appeals to women aged 25-35.',
  },
  {
    name: 'Fintech Web Banners',
    industry: 'Fintech',
    companyName: 'PayFlow',
    platform: 'web',
    contentType: 'banner',
    intent: 'awareness',
    openingMessage:
      'We need web banners for a brand awareness campaign. We are a payment processing company targeting small business owners. Clean, trustworthy look with our blue brand colors.',
  },
  {
    name: 'Restaurant Social Content',
    industry: 'Hospitality',
    companyName: 'Sakura Kitchen',
    platform: 'Instagram',
    contentType: 'post',
    intent: 'engagement',
    openingMessage:
      'I run a Japanese fusion restaurant and want engaging Instagram posts to showcase our new seasonal menu. We want mouth-watering food photography style that gets people commenting and sharing.',
  },
  {
    name: 'Education YouTube Thumbnails',
    industry: 'Education',
    companyName: 'BrightPath Academy',
    platform: 'YouTube',
    contentType: 'thumbnail',
    intent: 'education',
    openingMessage:
      'We create online coding courses and need eye-catching YouTube thumbnails. They should look professional but approachable, targeting aspiring developers aged 18-30.',
  },
  {
    name: 'Fitness App Reels',
    industry: 'Health/Fitness',
    companyName: 'FitPulse',
    platform: 'Instagram',
    contentType: 'reel',
    intent: 'signups',
    openingMessage:
      'We need Instagram Reels content for our fitness app launch campaign. High energy, motivational style targeting gym enthusiasts aged 20-40. Goal is app downloads.',
  },
  {
    name: 'Consulting Thought Leadership',
    industry: 'Consulting',
    companyName: 'Meridian Advisory',
    platform: 'LinkedIn',
    contentType: 'post',
    intent: 'authority',
    openingMessage:
      'We need LinkedIn post graphics for our thought leadership series on digital transformation. Sophisticated, corporate-but-modern feel targeting C-suite executives.',
  },
  {
    name: 'Fashion TikTok Campaign',
    industry: 'Fashion',
    companyName: 'NOVVA',
    platform: 'TikTok',
    contentType: 'video',
    intent: 'awareness',
    openingMessage:
      "Launching our streetwear brand on TikTok and need video content that's bold, trendy, and authentic. Targeting Gen Z fashion enthusiasts who follow urban culture.",
  },
  {
    name: 'Real Estate Print + Digital',
    industry: 'Real Estate',
    companyName: 'Prestige Homes',
    platform: 'print',
    contentType: 'flyer',
    intent: 'sales',
    openingMessage:
      'We need premium property listing flyers for our luxury real estate agency. Elegant, minimalist design with large property photos. For both print and digital distribution.',
  },
  {
    name: 'Vague/Minimal Request',
    industry: 'Unknown',
    companyName: 'MyBrand',
    platform: '',
    contentType: '',
    intent: '',
    openingMessage: 'I need some designs for my business. Can you help?',
  },
]
