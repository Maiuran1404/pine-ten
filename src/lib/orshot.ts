import { logger } from "@/lib/logger";

/**
 * Orshot Service - Quick Design Generation
 * Integrates with Orshot API for generating branded designs from Studio templates
 */

const ORSHOT_API_BASE = "https://api.orshot.com/v1";

/**
 * Get Orshot API key
 * Throws if ORSHOT_API_KEY is not configured
 */
function getApiKey(): string {
  const apiKey = process.env.ORSHOT_API_KEY;
  if (!apiKey) {
    throw new Error("ORSHOT_API_KEY is not configured");
  }
  return apiKey;
}

/**
 * Check if Orshot is configured and available
 */
export function isOrshotEnabled(): boolean {
  return !!process.env.ORSHOT_API_KEY;
}

/**
 * Parameter mapping type - maps brand fields to Orshot template parameters
 */
export interface ParameterMapping {
  [brandField: string]: {
    paramId: string;
    type: "text" | "color" | "image" | "number";
    style?: {
      fontSize?: string;
      fontFamily?: string;
      fontWeight?: string;
      textAlign?: string;
    };
  };
}

/**
 * Brand data interface (matches companies table structure)
 */
export interface BrandData {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  primaryFont?: string | null;
  secondaryFont?: string | null;
  tagline?: string | null;
}

/**
 * Generate design response
 */
export interface GenerateDesignResponse {
  success: boolean;
  imageUrl?: string;
  format?: string;
  error?: string;
  responseTime?: number;
}

/**
 * Map brand data to Orshot template modifications
 */
export function mapBrandToModifications(
  brand: BrandData,
  mapping: ParameterMapping
): Record<string, unknown> {
  const modifications: Record<string, unknown> = {};

  for (const [brandField, config] of Object.entries(mapping)) {
    const value = brand[brandField as keyof BrandData];

    if (value !== null && value !== undefined) {
      // Set the main value
      modifications[config.paramId] = value;

      // Handle style modifications if defined
      if (config.style) {
        for (const [styleProp, styleValue] of Object.entries(config.style)) {
          if (styleValue) {
            modifications[`${config.paramId}.${styleProp}`] = styleValue;
          }
        }
      }
    }
  }

  logger.debug({ modifications }, "Mapped brand to template modifications");
  return modifications;
}

/**
 * Generate a design from an Orshot Studio template
 * Uses direct API call since SDK doesn't support Studio templates
 */
export async function generateDesignFromTemplate(
  templateId: number,
  modifications: Record<string, unknown>,
  format: "png" | "jpg" | "webp" | "pdf" = "png"
): Promise<GenerateDesignResponse> {
  const startTime = Date.now();

  try {
    logger.info(
      { templateId, format, modificationKeys: Object.keys(modifications) },
      "Generating design from Orshot Studio template"
    );

    const apiKey = getApiKey();

    const response = await fetch(`${ORSHOT_API_BASE}/studio/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        templateId,
        modifications,
        response: {
          format,
          type: "url",
        },
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error(
        { status: response.status, error: errorData, templateId },
        "Orshot API error"
      );

      if (response.status === 429) {
        return {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
          responseTime,
        };
      }

      return {
        success: false,
        error: errorData.message || `API error: ${response.status}`,
        responseTime,
      };
    }

    const data = await response.json();

    logger.info(
      { templateId, responseTime, format },
      "Design generated successfully"
    );

    // Handle response - content can be a string (single page) or array (multi-page)
    const imageUrl =
      typeof data.data?.content === "string"
        ? data.data.content
        : Array.isArray(data.data?.content)
          ? data.data.content[0]?.content
          : data.content;

    if (!imageUrl) {
      return {
        success: false,
        error: "No image URL in response",
        responseTime,
      };
    }

    return {
      success: true,
      imageUrl,
      format,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    logger.error(
      { err: error, templateId, responseTime },
      "Failed to generate design from Orshot"
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      responseTime,
    };
  }
}

/**
 * Generate a design with brand data and parameter mapping
 * This is the main function to use from API routes
 */
export async function generateBrandedDesign(
  templateId: number,
  brand: BrandData,
  parameterMapping: ParameterMapping,
  format: "png" | "jpg" | "webp" | "pdf" = "png"
): Promise<GenerateDesignResponse> {
  // Map brand data to template modifications
  const modifications = mapBrandToModifications(brand, parameterMapping);

  // Generate the design
  return generateDesignFromTemplate(templateId, modifications, format);
}

/**
 * Validate that required brand fields are present for a template
 */
export function validateBrandForTemplate(
  brand: BrandData,
  mapping: ParameterMapping
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  for (const brandField of Object.keys(mapping)) {
    const value = brand[brandField as keyof BrandData];
    if (value === null || value === undefined || value === "") {
      missingFields.push(brandField);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
