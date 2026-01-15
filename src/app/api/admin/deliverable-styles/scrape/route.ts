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
      if (!src || src.length < 5) return null;
      if (src.startsWith("data:")) return null;
      if (src.startsWith("//")) return `https:${src}`;
      if (src.startsWith("/")) return new URL(src, baseUrl).href;
      if (src.startsWith("http")) return src;
      return new URL(src, baseUrl).href;
    } catch {
      return null;
    }
  };

  // Helper to check if URL looks like a valid image
  const isImageUrl = (url: string): boolean => {
    const lower = url.toLowerCase();
    // Common image extensions
    if (/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(lower)) return true;
    // CDN patterns (Behance uses mir-s3-cdn-cf.behance.net)
    if (lower.includes("behance.net") && lower.includes("project_modules")) return true;
    // Pinterest CDN
    if (lower.includes("pinimg.com")) return true;
    // Cosmos.so CDN patterns
    if (lower.includes("cosmos.so") && (lower.includes("/i/") || lower.includes("/image"))) return true;
    if (lower.includes("cosmoscdn") || lower.includes("cosmos-cdn")) return true;
    // Common image CDNs
    if (lower.includes("cloudinary.com")) return true;
    if (lower.includes("imgix.net")) return true;
    if (lower.includes("imagedelivery.net")) return true;
    if (lower.includes("cloudfront.net") && /\.(jpg|jpeg|png|gif|webp)/i.test(lower)) return true;
    if (lower.includes("amazonaws.com") && /\.(jpg|jpeg|png|gif|webp)/i.test(lower)) return true;
    if (lower.includes("cdn") && lower.includes("image")) return true;
    if (lower.includes("images.") || lower.includes("/images/")) return true;
    if (lower.includes("img.") || lower.includes("/img/")) return true;
    if (lower.includes("media.") || lower.includes("/media/")) return true;
    return false;
  };

  // Helper to convert Pinterest URLs to larger sizes
  const upgradePinterestUrl = (url: string): string => {
    if (!url.includes("pinimg.com")) return url;
    // Convert small sizes to 736x (large) - available sizes: 60x60, 75x75, 236x, 474x, 736x, originals
    return url
      .replace(/\/60x60\//g, '/736x/')
      .replace(/\/75x75\//g, '/736x/')
      .replace(/\/236x\//g, '/736x/')
      .replace(/\/474x\//g, '/736x/');
  };

  // Helper to add image if valid and not seen
  const addImage = (url: string | null, source: ScrapedImage["source"], alt?: string, width?: number, height?: number) => {
    if (!url) return;
    // Upgrade Pinterest URLs to larger sizes
    const finalUrl = upgradePinterestUrl(url);
    if (seenUrls.has(finalUrl)) return;
    seenUrls.add(finalUrl);
    images.push({ url: finalUrl, alt, width, height, source });
  };

  let match;

  // Extract from <img> tags - multiple patterns
  const imgRegex = /<img[^>]*>/gi;
  while ((match = imgRegex.exec(html)) !== null) {
    const imgTag = match[0];

    // Try different src attributes in order of preference
    const srcAttrs = ['src', 'data-src', 'data-original', 'data-lazy-src', 'data-srcset'];
    for (const attr of srcAttrs) {
      const attrMatch = imgTag.match(new RegExp(`${attr}=["']([^"']+)["']`, 'i'));
      if (attrMatch) {
        const url = resolveUrl(attrMatch[1]);
        if (url) {
          const widthMatch = imgTag.match(/width=["']?(\d+)/i);
          const heightMatch = imgTag.match(/height=["']?(\d+)/i);
          const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
          addImage(url, "img", altMatch?.[1],
            widthMatch ? parseInt(widthMatch[1]) : undefined,
            heightMatch ? parseInt(heightMatch[1]) : undefined
          );
        }
      }
    }
  }

  // Extract from srcset attributes (get the largest)
  const srcsetRegex = /srcset=["']([^"']+)["']/gi;
  while ((match = srcsetRegex.exec(html)) !== null) {
    const srcset = match[1];
    const sources = srcset.split(",").map((s) => {
      const parts = s.trim().split(/\s+/);
      const url = parts[0];
      const size = parts[1] ? parseInt(parts[1]) : 0;
      return { url, size };
    });
    // Sort by size descending and add the largest
    sources.sort((a, b) => b.size - a.size);
    for (const src of sources.slice(0, 1)) { // Just take the largest
      const url = resolveUrl(src.url);
      addImage(url, "img");
    }
  }

  // Extract from various data attributes used for lazy loading
  const dataAttrs = ['data-src', 'data-original', 'data-lazy', 'data-lazy-src', 'data-image', 'data-bg'];
  for (const attr of dataAttrs) {
    const dataRegex = new RegExp(`${attr}=["']([^"']+)["']`, 'gi');
    while ((match = dataRegex.exec(html)) !== null) {
      const url = resolveUrl(match[1]);
      if (url && isImageUrl(url)) {
        addImage(url, "img");
      }
    }
  }

  // Extract from og:image meta tags
  const ogImageRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi;
  while ((match = ogImageRegex.exec(html)) !== null) {
    const url = resolveUrl(match[1]);
    addImage(url, "og");
  }

  // Alternative og:image format
  const ogImageAltRegex = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/gi;
  while ((match = ogImageAltRegex.exec(html)) !== null) {
    const url = resolveUrl(match[1]);
    addImage(url, "og");
  }

  // Extract from background-image CSS
  const bgImageRegex = /background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((match = bgImageRegex.exec(html)) !== null) {
    const url = resolveUrl(match[1]);
    if (url && isImageUrl(url)) {
      addImage(url, "background");
    }
  }

  // Extract URLs from JSON data (Behance embeds project data in script tags)
  // Look for Behance project module URLs
  const behanceModuleRegex = /https?:\/\/mir-s3-cdn-cf\.behance\.net\/project_modules\/[^"'\s\\]+/gi;
  while ((match = behanceModuleRegex.exec(html)) !== null) {
    let url = match[0];
    // Clean up escaped characters
    url = url.replace(/\\u002F/g, '/').replace(/\\/g, '');
    addImage(url, "img");
  }

  // Behance project thumbnails - convert to larger versions
  // Pattern: https://mir-s3-cdn-cf.behance.net/projects/404/{id}.{ext}
  const behanceProjectRegex = /https?:\/\/mir-s3-cdn-cf\.behance\.net\/projects\/\d+\/[^"'\s\\]+/gi;
  while ((match = behanceProjectRegex.exec(html)) !== null) {
    let url = match[0];
    url = url.replace(/\\u002F/g, '/').replace(/\\/g, '');
    // Convert to larger size (808 or max_808 or 1400)
    url = url.replace(/\/projects\/\d+\//, '/projects/max_808/');
    addImage(url, "img");
  }

  // Generic CDN image URLs in JSON
  const cdnImageRegex = /"(https?:\/\/[^"]+(?:\.jpg|\.jpeg|\.png|\.webp|\.gif)[^"]*)"/gi;
  while ((match = cdnImageRegex.exec(html)) !== null) {
    let url = match[1];
    url = url.replace(/\\u002F/g, '/').replace(/\\/g, '');
    const resolved = resolveUrl(url);
    if (resolved && isImageUrl(resolved)) {
      addImage(resolved, "img");
    }
  }

  // Pinterest-specific image extraction
  // Pattern 1: Direct pinimg.com URLs in HTML/JSON
  const pinterestImageRegex = /https?:\/\/i\.pinimg\.com\/(?:originals|736x|474x|236x|150x150|60x60|75x75)\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.[a-z]+/gi;
  while ((match = pinterestImageRegex.exec(html)) !== null) {
    let url = match[0];
    url = url.replace(/\\u002F/g, '/').replace(/\\/g, '');
    addImage(url, "img");
  }

  // Pattern 2: Pinterest video thumbnails
  const pinterestVideoRegex = /https?:\/\/i\.pinimg\.com\/videos\/thumbnails\/originals\/[^"'\s\\]+\.[a-z]+/gi;
  while ((match = pinterestVideoRegex.exec(html)) !== null) {
    let url = match[0];
    url = url.replace(/\\u002F/g, '/').replace(/\\/g, '');
    addImage(url, "img");
  }

  // Pattern 3: Pinterest URLs with escaped slashes in JSON
  const pinterestEscapedRegex = /https?:\\?\/\\?\/i\.pinimg\.com\\?\/[^"'\s]+/gi;
  while ((match = pinterestEscapedRegex.exec(html)) !== null) {
    let url = match[0];
    url = url.replace(/\\u002F/g, '/').replace(/\\/g, '/').replace(/\/\//g, '/').replace('https:/', 'https://');
    if (url.includes('pinimg.com') && /\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
      addImage(url, "img");
    }
  }

  // Cosmos.so image extraction
  // Pattern: cosmos CDN URLs
  const cosmosImageRegex = /https?:\/\/[^"'\s]*cosmos[^"'\s]*\/[^"'\s]*\.(jpg|jpeg|png|gif|webp)[^"'\s]*/gi;
  while ((match = cosmosImageRegex.exec(html)) !== null) {
    let url = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '');
    addImage(url, "img");
  }

  // Cloudinary image extraction
  const cloudinaryRegex = /https?:\/\/res\.cloudinary\.com\/[^"'\s]+\.(jpg|jpeg|png|gif|webp)[^"'\s]*/gi;
  while ((match = cloudinaryRegex.exec(html)) !== null) {
    let url = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '');
    addImage(url, "img");
  }

  // Imgix image extraction
  const imgixRegex = /https?:\/\/[^"'\s]+\.imgix\.net\/[^"'\s]+/gi;
  while ((match = imgixRegex.exec(html)) !== null) {
    let url = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '');
    if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url) || url.includes('?')) {
      addImage(url, "img");
    }
  }

  // CloudFront/AWS S3 image extraction
  const awsRegex = /https?:\/\/[^"'\s]+\.(cloudfront\.net|amazonaws\.com)\/[^"'\s]+\.(jpg|jpeg|png|gif|webp)[^"'\s]*/gi;
  while ((match = awsRegex.exec(html)) !== null) {
    let url = match[0].replace(/\\u002F/g, '/').replace(/\\/g, '');
    addImage(url, "img");
  }

  // Generic high-quality image URLs in JSON (looking for larger dimensions in URL)
  const largeImageRegex = /"(https?:\/\/[^"]+(?:\/(?:large|full|original|max|1080|1200|1600|2000)[^"]*)?\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
  while ((match = largeImageRegex.exec(html)) !== null) {
    let url = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
    if (isImageUrl(url)) {
      addImage(url, "img");
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

    // Always allow Behance project images
    if (url.includes('mir-s3-cdn-cf.behance.net/projects/')) return true;
    if (url.includes('mir-s3-cdn-cf.behance.net/project_modules/')) return true;
    // Always allow Pinterest images (736x size)
    if (url.includes('i.pinimg.com/736x/')) return true;
    if (url.includes('i.pinimg.com/originals/')) return true;
    // Skip small Pinterest thumbnails
    if (url.includes('i.pinimg.com/60x60/')) return false;
    if (url.includes('i.pinimg.com/75x75/')) return false;
    if (url.includes('i.pinimg.com/150x150/')) return false;
    // Always allow Cosmos.so images
    if (url.includes('cosmos.so') || url.includes('cosmos-cdn') || url.includes('cosmoscdn')) return true;
    // Always allow major CDN images
    if (url.includes('cloudinary.com')) return true;
    if (url.includes('imgix.net')) return true;
    if (url.includes('imagedelivery.net')) return true;
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
        // Build extensive scroll actions to load more content
        const scrollActions: Array<{ type: "scroll"; direction: "down" } | { type: "wait"; milliseconds: number }> = [];
        // Scroll 15 times to load lots of content
        for (let i = 0; i < 15; i++) {
          scrollActions.push({ type: "scroll", direction: "down" });
          scrollActions.push({ type: "wait", milliseconds: 1200 });
        }

        const scrapeResult = await firecrawl.scrape(url, {
          formats: ["html"],
          waitFor: 5000, // Wait 5 seconds for initial JS to render
          actions: scrollActions,
        });

        const htmlContent = scrapeResult.html;
        if (htmlContent) {
          images = extractImagesFromHtml(htmlContent, baseUrl);
          console.log(`Firecrawl extracted ${images.length} images from ${url}`);
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
