import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import FirecrawlApp from "@mendable/firecrawl-js";

interface ScrapedImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  source: "img" | "og" | "meta" | "background";
}

// Initialize Firecrawl if API key is available
const firecrawl = process.env.FIRECRAWL_API_KEY
  ? new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY })
  : null;

// Extract images from HTML using regex patterns
function extractImagesFromHtml(html: string, baseUrl: string): ScrapedImage[] {
  const images: ScrapedImage[] = [];
  const seenUrls = new Set<string>();

  // Helper to resolve relative URLs
  const resolveUrl = (src: string): string | null => {
    try {
      if (src.startsWith("data:")) return null;
      if (src.startsWith("//")) return `https:${src}`;
      if (src.startsWith("/")) return new URL(src, baseUrl).href;
      if (src.startsWith("http")) return src;
      return new URL(src, baseUrl).href;
    } catch {
      return null;
    }
  };

  // Extract from <img> tags
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const url = resolveUrl(match[1]);
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      const widthMatch = match[0].match(/width=["']?(\d+)/i);
      const heightMatch = match[0].match(/height=["']?(\d+)/i);
      const altMatch = match[0].match(/alt=["']([^"']*)["']/i);
      images.push({
        url,
        alt: altMatch?.[1],
        width: widthMatch ? parseInt(widthMatch[1]) : undefined,
        height: heightMatch ? parseInt(heightMatch[1]) : undefined,
        source: "img",
      });
    }
  }

  // Extract from srcset attributes
  const srcsetRegex = /srcset=["']([^"']+)["']/gi;
  while ((match = srcsetRegex.exec(html)) !== null) {
    const srcset = match[1];
    const sources = srcset.split(",").map((s) => s.trim().split(/\s+/)[0]);
    for (const src of sources) {
      const url = resolveUrl(src);
      if (url && !seenUrls.has(url)) {
        seenUrls.add(url);
        images.push({ url, source: "img" });
      }
    }
  }

  // Extract from data-src (lazy loading)
  const dataSrcRegex = /data-src=["']([^"']+)["']/gi;
  while ((match = dataSrcRegex.exec(html)) !== null) {
    const url = resolveUrl(match[1]);
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      images.push({ url, source: "img" });
    }
  }

  // Extract from og:image meta tags
  const ogImageRegex =
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
  while ((match = ogImageRegex.exec(html)) !== null) {
    const url = resolveUrl(match[1]);
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      images.push({ url, source: "og" });
    }
  }

  // Alternative og:image format
  const ogImageAltRegex =
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi;
  while ((match = ogImageAltRegex.exec(html)) !== null) {
    const url = resolveUrl(match[1]);
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      images.push({ url, source: "og" });
    }
  }

  // Extract from background-image CSS
  const bgImageRegex = /background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((match = bgImageRegex.exec(html)) !== null) {
    const url = resolveUrl(match[1]);
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      images.push({ url, source: "background" });
    }
  }

  return images;
}

// Filter images by likely being "content" images (not icons, avatars, etc.)
function filterContentImages(images: ScrapedImage[], minSize = 200): ScrapedImage[] {
  return images.filter((img) => {
    // Skip known small images
    if (img.width && img.width < minSize) return false;
    if (img.height && img.height < minSize) return false;

    // Skip common non-content patterns
    const url = img.url.toLowerCase();
    if (url.includes("avatar")) return false;
    if (url.includes("icon")) return false;
    if (url.includes("logo") && !url.includes("brand")) return false;
    if (url.includes("favicon")) return false;
    if (url.includes("emoji")) return false;
    if (url.includes("badge")) return false;
    if (url.includes("spinner")) return false;
    if (url.includes("loading")) return false;
    if (url.includes("/ads/")) return false;
    if (url.includes("tracking")) return false;
    if (url.includes("pixel")) return false;
    if (url.includes("1x1")) return false;
    if (url.includes("spacer")) return false;

    // Skip SVG data URIs
    if (url.startsWith("data:image/svg")) return false;

    // Prefer larger images from srcset
    if (url.includes("@2x") || url.includes("@3x")) return true;
    if (url.includes("-large") || url.includes("_large")) return true;

    return true;
  });
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      url,
      useFirecrawl = false,
      minSize = 200,
      limit = 50,
    } = body as {
      url: string;
      useFirecrawl?: boolean;
      minSize?: number;
      limit?: number;
    };

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    let images: ScrapedImage[] = [];

    // Option 1: Use Firecrawl for JS-heavy sites
    if (useFirecrawl && firecrawl) {
      try {
        const scrapeResult = await firecrawl.scrape(url, {
          formats: ["html"],
        });

        const htmlContent = scrapeResult.html;
        if (htmlContent) {
          images = extractImagesFromHtml(htmlContent, baseUrl);
        }
      } catch (error) {
        console.error("Firecrawl error:", error);
        // Fall back to simple fetch
      }
    }

    // Option 2: Simple fetch (for static sites or as fallback)
    if (images.length === 0) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
        });

        if (!response.ok) {
          return NextResponse.json(
            { error: `Failed to fetch page: ${response.status}` },
            { status: 400 }
          );
        }

        const html = await response.text();
        images = extractImagesFromHtml(html, baseUrl);
      } catch (error) {
        console.error("Fetch error:", error);
        return NextResponse.json(
          { error: "Failed to fetch page" },
          { status: 500 }
        );
      }
    }

    // Filter and deduplicate
    const filteredImages = filterContentImages(images, minSize);

    // Sort by priority: og images first, then by size hints
    filteredImages.sort((a, b) => {
      if (a.source === "og" && b.source !== "og") return -1;
      if (b.source === "og" && a.source !== "og") return 1;
      const aSize = (a.width || 0) * (a.height || 0);
      const bSize = (b.width || 0) * (b.height || 0);
      return bSize - aSize;
    });

    // Limit results
    const limitedImages = filteredImages.slice(0, limit);

    return NextResponse.json({
      success: true,
      url,
      totalFound: images.length,
      filtered: filteredImages.length,
      images: limitedImages,
      firecrawlUsed: useFirecrawl && firecrawl !== null,
      firecrawlAvailable: firecrawl !== null,
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: "Failed to scrape page" },
      { status: 500 }
    );
  }
}
