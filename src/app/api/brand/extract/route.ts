import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Firecrawl from "@mendable/firecrawl-js";
import Anthropic from "@anthropic-ai/sdk";

// Lazy initialization to avoid errors during build
let firecrawl: Firecrawl | null = null;
let anthropic: Anthropic | null = null;

function getFirecrawl() {
  if (!firecrawl) {
    firecrawl = new Firecrawl({
      apiKey: process.env.FIRECRAWL_API_KEY || "",
    });
  }
  return firecrawl;
}

function getAnthropic(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || "",
    });
  }
  return anthropic;
}

interface BrandExtraction {
  name: string;
  description: string;
  tagline: string | null;
  industry: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string;
  textColor: string;
  brandColors: string[];
  primaryFont: string | null;
  secondaryFont: string | null;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  contactEmail: string | null;
  contactPhone: string | null;
  keywords: string[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { websiteUrl } = body;

    if (!websiteUrl) {
      return NextResponse.json(
        { error: "Website URL is required" },
        { status: 400 }
      );
    }

    // Normalize URL
    let normalizedUrl = websiteUrl.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Scrape the website with Firecrawl including branding format
    let scrapeResult;
    try {
      scrapeResult = await getFirecrawl().scrape(normalizedUrl, {
        formats: [
          "markdown",
          { type: "screenshot", fullPage: true },
          "links",
          "branding",
        ],
        onlyMainContent: false,
      });
    } catch (scrapeError) {
      console.error("Firecrawl scrape error:", scrapeError);
      return NextResponse.json(
        { error: "Failed to scrape website. Please check the URL and try again." },
        { status: 400 }
      );
    }

    const { markdown, screenshot, links, metadata, branding } = scrapeResult as {
      markdown?: string;
      screenshot?: string;
      links?: string[];
      metadata?: {
        title?: string;
        description?: string;
        ogImage?: string;
        favicon?: string;
      };
      branding?: {
        colors?: {
          primary?: string;
          secondary?: string;
          accent?: string;
          background?: string;
          textPrimary?: string;
          [key: string]: string | undefined;
        };
        typography?: {
          fontFamilies?: {
            primary?: string;
          };
        };
        fonts?: Array<{ family: string }>;
        images?: {
          logo?: string | null;
          favicon?: string | null;
        };
      };
    };

    // If Firecrawl returned branding data, use it to enhance extraction
    let firecrawlBrandColors: string[] = [];
    let firecrawlPrimaryColor: string | null = null;
    let firecrawlSecondaryColor: string | null = null;
    let firecrawlAccentColor: string | null = null;
    let firecrawlBackgroundColor: string | null = null;
    let firecrawlTextColor: string | null = null;
    let firecrawlPrimaryFont: string | null = null;
    let firecrawlLogo: string | null = null;
    let firecrawlFavicon: string | null = null;

    if (branding) {
      if (branding.colors) {
        firecrawlPrimaryColor = branding.colors.primary || null;
        firecrawlSecondaryColor = branding.colors.secondary || null;
        firecrawlAccentColor = branding.colors.accent || null;
        firecrawlBackgroundColor = branding.colors.background || null;
        firecrawlTextColor = branding.colors.textPrimary || null;
        firecrawlBrandColors = Object.values(branding.colors)
          .filter((c): c is string => typeof c === "string" && c.startsWith("#"));
      }
      if (branding.typography?.fontFamilies?.primary) {
        firecrawlPrimaryFont = branding.typography.fontFamilies.primary;
      } else if (branding.fonts && branding.fonts[0]?.family) {
        firecrawlPrimaryFont = branding.fonts[0].family;
      }
      if (branding.images) {
        firecrawlLogo = branding.images.logo || null;
        firecrawlFavicon = branding.images.favicon || null;
      }
    }

    // Prepare content for Claude analysis
    const contentParts: Anthropic.Messages.ContentBlockParam[] = [];

    // Add screenshot if available for visual analysis
    if (screenshot) {
      contentParts.push({
        type: "image",
        source: {
          type: "url",
          url: screenshot,
        },
      });
    }

    // Add text content for context
    contentParts.push({
      type: "text",
      text: `Analyze this website and extract comprehensive brand information.

Website URL: ${normalizedUrl}
Page Title: ${metadata?.title || "Unknown"}
Page Description: ${metadata?.description || "Unknown"}

Website Content (markdown):
${markdown?.slice(0, 15000) || "No content available"}

Links found on page:
${links?.slice(0, 50).join("\n") || "No links available"}

Based on the screenshot and content above, extract the following brand information in JSON format:

1. **Company Name**: The company/brand name
2. **Description**: A brief description of what the company does (2-3 sentences)
3. **Tagline**: Any tagline or slogan found
4. **Industry**: The industry the company operates in
5. **Logo URL**: If you can identify a logo image URL from the content
6. **Colors**: Extract the main colors used:
   - primaryColor: The dominant brand color (hex code)
   - secondaryColor: Secondary brand color (hex code)
   - accentColor: Accent/highlight color (hex code)
   - backgroundColor: Main background color (hex code)
   - textColor: Main text color (hex code)
   - brandColors: Array of all significant brand colors (hex codes)
7. **Typography**: Identify fonts if mentioned or visible
   - primaryFont: Main heading/brand font
   - secondaryFont: Body text font
8. **Social Links**: Any social media profile URLs found
9. **Contact Info**: Email and phone if found
10. **Keywords**: 5-10 keywords that describe this brand

Return ONLY a valid JSON object with this exact structure:
{
  "name": "string",
  "description": "string",
  "tagline": "string or null",
  "industry": "string or null",
  "logoUrl": "string or null",
  "faviconUrl": "string or null",
  "primaryColor": "#hex",
  "secondaryColor": "#hex or null",
  "accentColor": "#hex or null",
  "backgroundColor": "#hex",
  "textColor": "#hex",
  "brandColors": ["#hex", "#hex"],
  "primaryFont": "string or null",
  "secondaryFont": "string or null",
  "socialLinks": {
    "twitter": "url or undefined",
    "linkedin": "url or undefined",
    "facebook": "url or undefined",
    "instagram": "url or undefined",
    "youtube": "url or undefined"
  },
  "contactEmail": "string or null",
  "contactPhone": "string or null",
  "keywords": ["keyword1", "keyword2"]
}`,
    });

    // Call Claude to analyze and extract brand information
    const response = await getAnthropic().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: contentParts,
        },
      ],
    });

    // Extract JSON from Claude's response
    const responseText = response.content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    // Parse the JSON response
    let brandData: BrandExtraction;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      brandData = JSON.parse(jsonMatch[0]);
    } catch {
      console.error("Failed to parse brand data:", responseText);
      // Return a default structure with what we know
      brandData = {
        name: metadata?.title?.split("|")[0]?.split("-")[0]?.trim() || "Unknown Company",
        description: metadata?.description || "",
        tagline: null,
        industry: null,
        logoUrl: firecrawlLogo || metadata?.ogImage || null,
        faviconUrl: firecrawlFavicon || null,
        primaryColor: firecrawlPrimaryColor || "#6366f1",
        secondaryColor: firecrawlSecondaryColor || null,
        accentColor: firecrawlAccentColor || null,
        backgroundColor: firecrawlBackgroundColor || "#ffffff",
        textColor: firecrawlTextColor || "#1f2937",
        brandColors: firecrawlBrandColors,
        primaryFont: firecrawlPrimaryFont || null,
        secondaryFont: null,
        socialLinks: {},
        contactEmail: null,
        contactPhone: null,
        keywords: [],
      };
    }

    // Enhance Claude's results with Firecrawl branding data if available
    if (firecrawlPrimaryColor && brandData.primaryColor === "#6366f1") {
      brandData.primaryColor = firecrawlPrimaryColor;
    }
    if (firecrawlSecondaryColor && !brandData.secondaryColor) {
      brandData.secondaryColor = firecrawlSecondaryColor;
    }
    if (firecrawlAccentColor && !brandData.accentColor) {
      brandData.accentColor = firecrawlAccentColor;
    }
    if (firecrawlBackgroundColor && brandData.backgroundColor === "#ffffff") {
      brandData.backgroundColor = firecrawlBackgroundColor;
    }
    if (firecrawlTextColor && brandData.textColor === "#1f2937") {
      brandData.textColor = firecrawlTextColor;
    }
    if (firecrawlBrandColors.length > 0 && brandData.brandColors.length === 0) {
      brandData.brandColors = firecrawlBrandColors;
    }
    if (firecrawlPrimaryFont && !brandData.primaryFont) {
      brandData.primaryFont = firecrawlPrimaryFont;
    }

    // Add favicon from metadata if available
    if (!brandData.faviconUrl && (firecrawlFavicon || metadata?.favicon)) {
      brandData.faviconUrl = firecrawlFavicon || metadata?.favicon || null;
    }

    // Add logo from firecrawl or OG image if not found
    if (!brandData.logoUrl && (firecrawlLogo || metadata?.ogImage)) {
      brandData.logoUrl = firecrawlLogo || metadata?.ogImage || null;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...brandData,
        website: normalizedUrl,
        screenshotUrl: screenshot || null,
      },
    });
  } catch (error) {
    console.error("Brand extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract brand information. Please try again." },
      { status: 500 }
    );
  }
}
