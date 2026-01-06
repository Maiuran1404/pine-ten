import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Errors } from "@/lib/errors";

/**
 * User roles in the system
 */
export type UserRole = "CLIENT" | "FREELANCER" | "ADMIN";

/**
 * Extended session user with role and other fields
 */
export interface SessionUser {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  image?: string | null;
  companyId?: string | null;
  onboardingCompleted?: boolean;
  freelancerApproved?: boolean;
}

/**
 * Authenticated session result
 */
export interface AuthenticatedSession {
  user: SessionUser;
}

/**
 * Get the current session and throw if not authenticated
 * @throws {APIError} If user is not authenticated
 */
export async function requireAuth(): Promise<AuthenticatedSession> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw Errors.unauthorized("Authentication required");
  }

  return {
    user: session.user as SessionUser,
  };
}

/**
 * Get the current session and verify the user has the required role
 * @param allowedRoles - Array of roles that are permitted
 * @throws {APIError} If user is not authenticated or doesn't have required role
 */
export async function requireRole(
  ...allowedRoles: UserRole[]
): Promise<AuthenticatedSession> {
  const session = await requireAuth();

  if (!allowedRoles.includes(session.user.role)) {
    throw Errors.forbidden(
      `This action requires one of the following roles: ${allowedRoles.join(", ")}`
    );
  }

  return session;
}

/**
 * Require the user to be an admin
 * @throws {APIError} If user is not authenticated or not an admin
 */
export async function requireAdmin(): Promise<AuthenticatedSession> {
  return requireRole("ADMIN");
}

/**
 * Require the user to be a freelancer
 * @throws {APIError} If user is not authenticated or not a freelancer
 */
export async function requireFreelancer(): Promise<AuthenticatedSession> {
  return requireRole("FREELANCER");
}

/**
 * Require the user to be a client
 * @throws {APIError} If user is not authenticated or not a client
 */
export async function requireClient(): Promise<AuthenticatedSession> {
  return requireRole("CLIENT");
}

/**
 * Require the user to be either an admin or freelancer
 * @throws {APIError} If user is not authenticated or doesn't have required role
 */
export async function requireAdminOrFreelancer(): Promise<AuthenticatedSession> {
  return requireRole("ADMIN", "FREELANCER");
}

/**
 * Check if the current user owns a resource or is an admin
 * @param resourceOwnerId - The ID of the resource owner
 * @throws {APIError} If user is not authenticated, doesn't own the resource, and is not an admin
 */
export async function requireOwnerOrAdmin(
  resourceOwnerId: string
): Promise<AuthenticatedSession> {
  const session = await requireAuth();

  if (session.user.id !== resourceOwnerId && session.user.role !== "ADMIN") {
    throw Errors.forbidden("You do not have permission to access this resource");
  }

  return session;
}

/**
 * Check if the current user is an approved freelancer
 * @throws {APIError} If user is not an approved freelancer
 */
export async function requireApprovedFreelancer(): Promise<AuthenticatedSession> {
  const session = await requireRole("FREELANCER");

  // Note: freelancerApproved is stored in the freelancer_profiles table
  // This check is a basic one - for full verification, check the profile status
  if (!session.user.freelancerApproved) {
    throw Errors.forbidden("Your freelancer account is pending approval");
  }

  return session;
}
