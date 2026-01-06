import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";

/**
 * Standard API error codes for client handling
 */
export const ErrorCodes = {
  // Authentication errors (1xxx)
  UNAUTHORIZED: "AUTH_001",
  INVALID_TOKEN: "AUTH_002",
  SESSION_EXPIRED: "AUTH_003",
  INSUFFICIENT_PERMISSIONS: "AUTH_004",

  // Validation errors (2xxx)
  VALIDATION_ERROR: "VAL_001",
  INVALID_INPUT: "VAL_002",
  MISSING_FIELD: "VAL_003",

  // Resource errors (3xxx)
  NOT_FOUND: "RES_001",
  ALREADY_EXISTS: "RES_002",
  CONFLICT: "RES_003",

  // Business logic errors (4xxx)
  INSUFFICIENT_CREDITS: "BIZ_001",
  TASK_NOT_AVAILABLE: "BIZ_002",
  MAX_REVISIONS_REACHED: "BIZ_003",
  FREELANCER_NOT_APPROVED: "BIZ_004",
  INVALID_STATUS_TRANSITION: "BIZ_005",

  // Payment errors (5xxx)
  PAYMENT_FAILED: "PAY_001",
  INVALID_PACKAGE: "PAY_002",
  WEBHOOK_ERROR: "PAY_003",

  // Server errors (9xxx)
  INTERNAL_ERROR: "SRV_001",
  DATABASE_ERROR: "SRV_002",
  EXTERNAL_SERVICE_ERROR: "SRV_003",
  RATE_LIMITED: "SRV_004",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Custom API Error class
 */
export class APIError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "APIError";
  }
}

/**
 * Standard API response format
 */
interface APIErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a standardized error response
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  statusCode: number = 500,
  details?: Record<string, unknown>
): NextResponse<APIErrorResponse> {
  const requestId = generateRequestId();

  logger.error({
    requestId,
    errorCode: code,
    message,
    details,
    statusCode,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
        requestId,
      },
    },
    { status: statusCode }
  );
}

/**
 * Handle and format Zod validation errors
 */
export function handleZodError(error: ZodError): NextResponse<APIErrorResponse> {
  const fieldErrors: Record<string, string[]> = {};

  error.issues.forEach((issue) => {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) {
      fieldErrors[path] = [];
    }
    fieldErrors[path].push(issue.message);
  });

  return errorResponse(
    ErrorCodes.VALIDATION_ERROR,
    "Validation failed",
    400,
    { fields: fieldErrors }
  );
}

/**
 * Wrapper to handle API route errors consistently
 */
export async function withErrorHandling<T>(
  handler: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T | NextResponse<APIErrorResponse>> {
  try {
    return await handler();
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return handleZodError(error);
    }

    // Handle custom API errors
    if (error instanceof APIError) {
      return errorResponse(
        error.code,
        error.message,
        error.statusCode,
        error.details
      );
    }

    // Handle unknown errors
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    logger.error({
      err: error,
      context,
      type: "unhandled_error",
    });

    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      process.env.NODE_ENV === "development"
        ? message
        : "An unexpected error occurred",
      500
    );
  }
}

/**
 * Success response helper
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse<{ success: true; data: T }> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: statusCode }
  );
}

/**
 * Shorthand error creators
 */
export const Errors = {
  unauthorized: (message = "Unauthorized") =>
    new APIError(ErrorCodes.UNAUTHORIZED, message, 401),

  forbidden: (message = "Insufficient permissions") =>
    new APIError(ErrorCodes.INSUFFICIENT_PERMISSIONS, message, 403),

  notFound: (resource = "Resource") =>
    new APIError(ErrorCodes.NOT_FOUND, `${resource} not found`, 404),

  badRequest: (message: string, details?: Record<string, unknown>) =>
    new APIError(ErrorCodes.INVALID_INPUT, message, 400, details),

  conflict: (message: string) =>
    new APIError(ErrorCodes.CONFLICT, message, 409),

  insufficientCredits: (required: number, available: number) =>
    new APIError(
      ErrorCodes.INSUFFICIENT_CREDITS,
      "Insufficient credits",
      400,
      { required, available }
    ),

  rateLimited: (retryAfter?: number) =>
    new APIError(ErrorCodes.RATE_LIMITED, "Too many requests", 429, {
      retryAfter,
    }),

  internal: (message = "Internal server error") =>
    new APIError(ErrorCodes.INTERNAL_ERROR, message, 500),
};
