import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";

/**
 * Audit action types - must match the database enum
 */
export type AuditAction =
  // Authentication
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT"
  | "AUTH_FAILED_LOGIN"
  | "AUTH_PASSWORD_CHANGE"
  | "AUTH_2FA_ENABLED"
  | "AUTH_2FA_DISABLED"
  // User management
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "USER_ROLE_CHANGE"
  // Freelancer management
  | "FREELANCER_APPROVE"
  | "FREELANCER_REJECT"
  | "FREELANCER_SUSPEND"
  | "FREELANCER_BULK_ACTION"
  // Task management
  | "TASK_CREATE"
  | "TASK_ASSIGN"
  | "TASK_STATUS_CHANGE"
  | "TASK_DELETE"
  // Credit/billing
  | "CREDIT_PURCHASE"
  | "CREDIT_USAGE"
  | "CREDIT_REFUND"
  | "CREDIT_MANUAL_ADJUST"
  // Settings
  | "SETTINGS_UPDATE"
  | "COUPON_CREATE"
  | "COUPON_DELETE"
  // Admin actions
  | "ADMIN_DATABASE_ACCESS"
  | "ADMIN_EXPORT_DATA"
  | "ADMIN_IMPERSONATE"
  // Security
  | "SECURITY_TEST_RUN"
  | "SECURITY_ALERT";

/**
 * Actor information for audit logs
 */
interface AuditActor {
  id: string;
  email: string;
  role: string;
}

/**
 * Options for creating an audit log entry
 */
interface AuditLogOptions {
  /** The user performing the action (null for system actions) */
  actor: AuditActor | null;
  /** The action being performed */
  action: AuditAction;
  /** Type of resource being affected (e.g., "user", "task", "coupon") */
  resourceType: string;
  /** ID of the affected resource (optional) */
  resourceId?: string;
  /** Additional context about the action */
  details?: Record<string, unknown>;
  /** Previous state before the change (for updates) */
  previousValue?: unknown;
  /** New state after the change (for updates) */
  newValue?: unknown;
  /** Whether the action was successful */
  success?: boolean;
  /** Error message if the action failed */
  errorMessage?: string;
  /** API endpoint that triggered this action */
  endpoint?: string;
}

/**
 * Extract request context (IP, User-Agent) from headers
 */
async function getRequestContext(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  try {
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwarded?.split(",")[0]?.trim() || realIp || null;
    const userAgent = headersList.get("user-agent");
    return { ipAddress, userAgent };
  } catch (error) {
    // Headers might not be available in some contexts (e.g., background jobs)
    logger.debug({ err: error }, "Could not get request context for audit log");
    return { ipAddress: null, userAgent: null };
  }
}

/**
 * Log an action to the audit trail
 *
 * @example
 * ```ts
 * await audit({
 *   actor: { id: user.id, email: user.email, role: user.role },
 *   action: "FREELANCER_APPROVE",
 *   resourceType: "freelancer",
 *   resourceId: freelancerId,
 *   details: { reason: "Excellent portfolio" },
 *   endpoint: "POST /api/admin/freelancers/[id]/approve",
 * });
 * ```
 */
export async function audit(options: AuditLogOptions): Promise<void> {
  const { ipAddress, userAgent } = await getRequestContext();

  try {
    await db.insert(auditLogs).values({
      actorId: options.actor?.id ?? null,
      actorEmail: options.actor?.email ?? null,
      actorRole: options.actor?.role ?? null,
      action: options.action,
      resourceType: options.resourceType,
      resourceId: options.resourceId ?? null,
      details: options.details ?? null,
      previousValue: options.previousValue ?? null,
      newValue: options.newValue ?? null,
      success: options.success ?? true,
      errorMessage: options.errorMessage ?? null,
      ipAddress,
      userAgent,
      endpoint: options.endpoint ?? null,
    });

    // Also log to pino for real-time monitoring
    logger.info(
      {
        type: "audit",
        action: options.action,
        actorId: options.actor?.id,
        actorEmail: options.actor?.email,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        success: options.success ?? true,
        endpoint: options.endpoint,
      },
      `Audit: ${options.action} on ${options.resourceType}`
    );
  } catch (error) {
    // Audit logging should never fail silently but also never break the main flow
    logger.error(
      {
        err: error,
        action: options.action,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
      },
      "Failed to write audit log"
    );
  }
}

/**
 * Fire-and-forget audit logging (doesn't await the result)
 * Use this when you don't want to block the main flow
 */
export function auditAsync(options: AuditLogOptions): void {
  audit(options).catch((error) => {
    logger.error({ err: error }, "Async audit log failed");
  });
}

/**
 * Helper to create actor from session user
 */
export function actorFromUser(user: {
  id: string;
  email: string;
  role?: string;
}): AuditActor {
  return {
    id: user.id,
    email: user.email,
    role: user.role ?? "unknown",
  };
}

/**
 * Pre-built audit helpers for common operations
 */
export const auditHelpers = {
  /** Log database table access (for admin database viewer) */
  databaseAccess: (
    actor: AuditActor,
    tableName: string,
    endpoint: string
  ) =>
    audit({
      actor,
      action: "ADMIN_DATABASE_ACCESS",
      resourceType: "database",
      resourceId: tableName,
      details: { tableName },
      endpoint,
    }),

  /** Log freelancer approval */
  freelancerApprove: (
    actor: AuditActor,
    freelancerId: string,
    freelancerEmail: string,
    endpoint: string
  ) =>
    audit({
      actor,
      action: "FREELANCER_APPROVE",
      resourceType: "freelancer",
      resourceId: freelancerId,
      details: { freelancerEmail },
      endpoint,
    }),

  /** Log freelancer rejection */
  freelancerReject: (
    actor: AuditActor,
    freelancerId: string,
    freelancerEmail: string,
    reason: string | undefined,
    endpoint: string
  ) =>
    audit({
      actor,
      action: "FREELANCER_REJECT",
      resourceType: "freelancer",
      resourceId: freelancerId,
      details: { freelancerEmail, reason },
      endpoint,
    }),

  /** Log bulk freelancer action */
  freelancerBulkAction: (
    actor: AuditActor,
    action: "approve" | "reject",
    freelancerIds: string[],
    successCount: number,
    failedCount: number,
    endpoint: string
  ) =>
    audit({
      actor,
      action: "FREELANCER_BULK_ACTION",
      resourceType: "freelancer",
      details: {
        bulkAction: action,
        freelancerIds,
        totalCount: freelancerIds.length,
        successCount,
        failedCount,
      },
      endpoint,
    }),

  /** Log user role change */
  userRoleChange: (
    actor: AuditActor,
    userId: string,
    userEmail: string,
    previousRole: string,
    newRole: string,
    endpoint: string
  ) =>
    audit({
      actor,
      action: "USER_ROLE_CHANGE",
      resourceType: "user",
      resourceId: userId,
      details: { userEmail },
      previousValue: { role: previousRole },
      newValue: { role: newRole },
      endpoint,
    }),

  /** Log coupon creation */
  couponCreate: (
    actor: AuditActor,
    couponId: string,
    couponName: string,
    endpoint: string
  ) =>
    audit({
      actor,
      action: "COUPON_CREATE",
      resourceType: "coupon",
      resourceId: couponId,
      details: { name: couponName },
      endpoint,
    }),

  /** Log coupon deletion */
  couponDelete: (
    actor: AuditActor,
    couponId: string,
    endpoint: string
  ) =>
    audit({
      actor,
      action: "COUPON_DELETE",
      resourceType: "coupon",
      resourceId: couponId,
      endpoint,
    }),

  /** Log settings update */
  settingsUpdate: (
    actor: AuditActor,
    settingKey: string,
    previousValue: unknown,
    newValue: unknown,
    endpoint: string
  ) =>
    audit({
      actor,
      action: "SETTINGS_UPDATE",
      resourceType: "settings",
      resourceId: settingKey,
      previousValue,
      newValue,
      endpoint,
    }),

  /** Log login attempt */
  loginAttempt: (
    userId: string | null,
    email: string,
    success: boolean,
    errorMessage?: string
  ) =>
    audit({
      actor: userId ? { id: userId, email, role: "unknown" } : null,
      action: success ? "AUTH_LOGIN" : "AUTH_FAILED_LOGIN",
      resourceType: "session",
      details: { email },
      success,
      errorMessage,
      endpoint: "POST /api/auth/login",
    }),

  /** Log task creation */
  taskCreate: (
    actor: AuditActor,
    taskId: string,
    taskTitle: string,
    endpoint: string
  ) =>
    audit({
      actor,
      action: "TASK_CREATE",
      resourceType: "task",
      resourceId: taskId,
      details: { title: taskTitle },
      endpoint,
    }),

  /** Log task assignment */
  taskAssign: (
    actor: AuditActor,
    taskId: string,
    freelancerId: string,
    freelancerEmail: string,
    endpoint: string
  ) =>
    audit({
      actor,
      action: "TASK_ASSIGN",
      resourceType: "task",
      resourceId: taskId,
      details: { freelancerId, freelancerEmail },
      endpoint,
    }),

  /** Log credit purchase */
  creditPurchase: (
    actor: AuditActor,
    amount: number,
    stripePaymentId: string,
    endpoint: string
  ) =>
    audit({
      actor,
      action: "CREDIT_PURCHASE",
      resourceType: "credits",
      resourceId: actor.id,
      details: { amount, stripePaymentId },
      endpoint,
    }),

  /** Log security test run */
  securityTestRun: (
    actor: AuditActor,
    runId: string,
    testCount: number,
    endpoint: string
  ) =>
    audit({
      actor,
      action: "SECURITY_TEST_RUN",
      resourceType: "security_test",
      resourceId: runId,
      details: { testCount },
      endpoint,
    }),
};
