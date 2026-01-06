import { describe, it, expect, vi } from "vitest";
import { APIError, ErrorCodes, Errors } from "./errors";

// Mock the logger
vi.mock("./logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("APIError", () => {
  it("should create an error with correct properties", () => {
    const error = new APIError(
      ErrorCodes.NOT_FOUND,
      "User not found",
      404,
      { userId: "123" }
    );

    expect(error.code).toBe(ErrorCodes.NOT_FOUND);
    expect(error.message).toBe("User not found");
    expect(error.statusCode).toBe(404);
    expect(error.details).toEqual({ userId: "123" });
    expect(error.name).toBe("APIError");
  });

  it("should default to 500 status code", () => {
    const error = new APIError(ErrorCodes.INTERNAL_ERROR, "Something went wrong");
    expect(error.statusCode).toBe(500);
  });
});

describe("Errors helper", () => {
  it("unauthorized should create 401 error", () => {
    const error = Errors.unauthorized();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
  });

  it("forbidden should create 403 error", () => {
    const error = Errors.forbidden();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe(ErrorCodes.INSUFFICIENT_PERMISSIONS);
  });

  it("notFound should create 404 error with resource name", () => {
    const error = Errors.notFound("Task");
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Task not found");
  });

  it("badRequest should create 400 error with details", () => {
    const error = Errors.badRequest("Invalid input", { field: "email" });
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ field: "email" });
  });

  it("insufficientCredits should include credit details", () => {
    const error = Errors.insufficientCredits(10, 5);
    expect(error.code).toBe(ErrorCodes.INSUFFICIENT_CREDITS);
    expect(error.details).toEqual({ required: 10, available: 5 });
  });

  it("rateLimited should create 429 error", () => {
    const error = Errors.rateLimited(60);
    expect(error.statusCode).toBe(429);
    expect(error.details).toEqual({ retryAfter: 60 });
  });

  it("csrfInvalid should create 403 error", () => {
    const error = Errors.csrfInvalid();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe(ErrorCodes.CSRF_INVALID);
  });
});

describe("ErrorCodes", () => {
  it("should have unique error codes", () => {
    const codes = Object.values(ErrorCodes);
    const uniqueCodes = new Set(codes);
    expect(codes.length).toBe(uniqueCodes.size);
  });

  it("should have correct prefixes for categories", () => {
    expect(ErrorCodes.UNAUTHORIZED).toMatch(/^AUTH_/);
    expect(ErrorCodes.VALIDATION_ERROR).toMatch(/^VAL_/);
    expect(ErrorCodes.NOT_FOUND).toMatch(/^RES_/);
    expect(ErrorCodes.INSUFFICIENT_CREDITS).toMatch(/^BIZ_/);
    expect(ErrorCodes.PAYMENT_FAILED).toMatch(/^PAY_/);
    expect(ErrorCodes.CSRF_INVALID).toMatch(/^SEC_/);
    expect(ErrorCodes.INTERNAL_ERROR).toMatch(/^SRV_/);
  });
});
