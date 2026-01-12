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

// Extract social links from page links
function extractSocialLinks(links: string[] | undefined): BrandExtraction["socialLinks"] {
  const socialLinks: BrandExtraction["socialLinks"] = {};
  if (!links) return socialLinks;

  const linkStr = links.join(" ");

  if (linkStr.includes("twitter.com") || linkStr.includes("x.com")) {
    const link = links.find((l) => l.includes("twitter.com") || l.includes("x.com"));
    if (link) socialLinks.twitter = link;
  }
  if (linkStr.includes("linkedin.com")) {
    const link = links.find((l) => l.includes("linkedin.com"));
    if (link) socialLinks.linkedin = link;
  }
  if (linkStr.includes("facebook.com")) {
    const link = links.find((l) => l.includes("facebook.com"));
    if (link) socialLinks.facebook = link;
  }
  if (linkStr.includes("instagram.com")) {
    const link = links.find((l) => l.includes("instagram.com"));
    if (link) socialLinks.instagram = link;
  }
  if (linkStr.includes("youtube.com")) {
    const link = links.find((l) => l.includes("youtube.com"));
    if (link) socialLinks.youtube = link;
  }

  return socialLinks;
}

// Create default brand data from metadata and Firecrawl branding
function createDefaultBrandData(
  metadata: { title?: string; description?: string; ogImage?: string; favicon?: string } | undefined,
  branding: {
    colors?: { primary?: string; secondary?: string; accent?: string; background?: string; textPrimary?: string; link?: string; [key: string]: string | undefined };
    typography?: { fontFamilies?: { primary?: string } };
    fonts?: Array<{ family: string }>;
    images?: { logo?: string | null; favicon?: string | null };
  } | undefined,
  links: string[] | undefined
): BrandExtraction {

  // Get all hex colors from branding, excluding background and text colors
  const brandColors: string[] = branding?.colors
    ? Object.values(branding.colors).filter((c): c is string => typeof c === "string" && c.startsWith("#"))
    : [];

  // Get primary color
  const primaryColor = branding?.colors?.primary || "#6366f1";

  // Firecrawl returns: primary, accent, background, textPrimary, link
  // We need: primaryColor, secondaryColor, accentColor
  // Map: primary -> primaryColor, accent -> secondaryColor, link -> accentColor (if different)

  // Secondary color: use Firecrawl's accent as our secondary (it's typically the 2nd brand color)
  const secondaryColor: string | null = branding?.colors?.accent || branding?.colors?.secondary || null;

  // Accent color: use link if it's different from what we've already used, otherwise null
  let accentColor: string | null = null;
  if (branding?.colors?.link && branding?.colors?.link !== primaryColor && branding?.colors?.link !== secondaryColor) {
    accentColor = branding.colors.link;
  }

  // If we still don't have an accent but have textPrimary that's not too dark/light, consider it
  if (!accentColor && branding?.colors?.textPrimary && branding.colors.textPrimary !== primaryColor && branding.colors.textPrimary !== secondaryColor) {
    // Only use textPrimary as accent if it's not pure black/white
    if (branding.colors.textPrimary !== "#000000" && branding.colors.textPrimary !== "#ffffff") {
      accentColor = branding.colors.textPrimary;
    }
  }

  return {
    name: metadata?.title?.split("|")[0]?.split("-")[0]?.split("–")[0]?.trim() || "Unknown Company",
    description: metadata?.description || "",
    tagline: null,
    industry: null,
    logoUrl: branding?.images?.logo || metadata?.ogImage || null,
    faviconUrl: branding?.images?.favicon || metadata?.favicon || null,
    primaryColor,
    secondaryColor,
    accentColor,
    backgroundColor: branding?.colors?.background || "#ffffff",
    textColor: branding?.colors?.textPrimary || "#1f2937",
    brandColors,
    primaryFont: branding?.typography?.fontFamilies?.primary || branding?.fonts?.[0]?.family || null,
    secondaryFont: null,
    socialLinks: extractSocialLinks(links),
    contactEmail: null,
    contactPhone: null,
    keywords: [],
  };
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

    // Scrape the website with Firecrawl - use viewport-sized screenshot to avoid oversized images
    let scrapeResult;
    try {
      scrapeResult = await getFirecrawl().scrape(normalizedUrl, {
        formats: [
          "markdown",
          { type: "screenshot", fullPage: false }, // Use viewport screenshot to stay within Claude's size limits
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
          link?: string;
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
        confidence?: {
          colors?: number;
          buttons?: number;
          overall?: number;
        };
      };
    };

    // Check if Firecrawl has good branding data with reasonable confidence
    // Firecrawl returns confidence.colors between 0-1, we require at least 0.3 (30%)
    const colorConfidence = branding?.confidence?.colors ?? 0;
    const hasColorsWithConfidence = branding?.colors &&
      Object.keys(branding.colors).length > 2 &&
      colorConfidence >= 0.3;

    // If confidence is too low, use Claude for better color extraction
    const hasBrandingColors = hasColorsWithConfidence;
    console.log(`Brand extraction for ${normalizedUrl}: Using ${hasBrandingColors ? "Firecrawl" : "Claude"} (color confidence: ${colorConfidence})`);

    if (hasBrandingColors) {
      // Firecrawl's branding is sufficient, use it directly
      const brandData = createDefaultBrandData(metadata, branding, links);

      return NextResponse.json({
        success: true,
        data: {
          ...brandData,
          website: normalizedUrl,
          screenshotUrl: screenshot || null,
        },
      });
    }

    // Otherwise, use Claude for deeper analysis
    const contentParts: Anthropic.Messages.ContentBlockParam[] = [];

    // Add text content for context (always include this)
    const textPrompt = `Analyze this website and extract comprehensive brand information.

Website URL: ${normalizedUrl}
Page Title: ${metadata?.title || "Unknown"}
Page Description: ${metadata?.description || "Unknown"}

Website Content (markdown):
${markdown?.slice(0, 20000) || "No content available"}

Links found on page:
${links?.slice(0, 50).join("\n") || "No links available"}

${screenshot ? "A screenshot of the website is also provided for visual analysis." : ""}

Based on the content${screenshot ? " and screenshot" : ""} above, extract the following brand information in JSON format:

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
}`;

    // Try to include screenshot, but be prepared to retry without it if it fails
    let useScreenshot = !!screenshot;
    let brandData: BrandExtraction | null = null;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        contentParts.length = 0; // Clear array

        // Only add screenshot on first attempt
        if (useScreenshot && attempt === 0 && screenshot) {
          contentParts.push({
            type: "image",
            source: {
              type: "url",
              url: screenshot,
            },
          });
        }

        contentParts.push({
          type: "text",
          text: textPrompt,
        });

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
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        brandData = JSON.parse(jsonMatch[0]);
        break; // Success, exit retry loop

      } catch (error) {
        lastError = error as Error;
        console.error(`Claude analysis attempt ${attempt + 1} failed:`, error);

        // Check if it's an image size error
        const errorMessage = String(error);
        if (errorMessage.includes("8000 pixels") || errorMessage.includes("image") || errorMessage.includes("dimension")) {
          console.log("Image too large, retrying without screenshot...");
          useScreenshot = false;
          continue; // Retry without screenshot
        }

        // For other errors, don't retry
        break;
      }
    }

    // If Claude analysis failed entirely, use fallback data
    if (!brandData) {
      console.error("All Claude analysis attempts failed, using fallback data. Last error:", lastError);
      brandData = createDefaultBrandData(metadata, branding, links);
    }

    // Only enhance with Firecrawl branding data if Claude returned default values AND Firecrawl has some confidence
    // This prevents low-confidence Firecrawl colors from overriding Claude's analysis
    const firecrawlColorConfidence = branding?.confidence?.colors ?? 0;
    if (branding?.colors && firecrawlColorConfidence >= 0.1) {
      // Only use Firecrawl colors as fallback when Claude returned defaults
      if (branding.colors.primary && brandData.primaryColor === "#6366f1") {
        brandData.primaryColor = branding.colors.primary;
      }
      // Use Firecrawl accent as secondary since they don't have a 'secondary' key
      if (branding.colors.accent && !brandData.secondaryColor) {
        brandData.secondaryColor = branding.colors.accent;
      }
      if (branding.colors.link && !brandData.accentColor && branding.colors.link !== brandData.secondaryColor) {
        brandData.accentColor = branding.colors.link;
      }
      if (branding.colors.background && brandData.backgroundColor === "#ffffff") {
        brandData.backgroundColor = branding.colors.background;
      }
      if (branding.colors.textPrimary && brandData.textColor === "#1f2937") {
        brandData.textColor = branding.colors.textPrimary;
      }
      if (brandData.brandColors.length === 0) {
        brandData.brandColors = Object.values(branding.colors)
          .filter((c): c is string => typeof c === "string" && c.startsWith("#"));
      }
    }

    if (branding?.typography?.fontFamilies?.primary && !brandData.primaryFont) {
      brandData.primaryFont = branding.typography.fontFamilies.primary;
    } else if (branding?.fonts?.[0]?.family && !brandData.primaryFont) {
      brandData.primaryFont = branding.fonts[0].family;
    }

    // Add favicon and logo from branding/metadata if not found
    if (!brandData.faviconUrl) {
      brandData.faviconUrl = branding?.images?.favicon || metadata?.favicon || null;
    }
    if (!brandData.logoUrl) {
      brandData.logoUrl = branding?.images?.logo || metadata?.ogImage || null;
    }

    // Merge social links
    const extractedSocial = extractSocialLinks(links);
    brandData.socialLinks = { ...extractedSocial, ...brandData.socialLinks };

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
