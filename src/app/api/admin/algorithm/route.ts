import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { assignmentAlgorithmConfig, skills } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import {
  withErrorHandling,
  successResponse,
  Errors,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { DEFAULT_CONFIG, AlgorithmConfig } from "@/lib/assignment-algorithm";

/**
 * GET /api/admin/algorithm
 * Get all algorithm configurations and the active one
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw Errors.unauthorized();
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      throw Errors.forbidden("Admin access required");
    }

    // Get all configurations
    const configs = await db
      .select()
      .from(assignmentAlgorithmConfig)
      .orderBy(desc(assignmentAlgorithmConfig.version));

    // Get active configuration or default
    const activeConfig = configs.find((c) => c.isActive) || null;

    // Get all skills for reference
    const allSkills = await db
      .select()
      .from(skills)
      .where(eq(skills.isActive, true))
      .orderBy(skills.category, skills.name);

    return successResponse({
      configurations: configs,
      activeConfig: activeConfig
        ? {
            id: activeConfig.id,
            version: activeConfig.version,
            name: activeConfig.name,
            description: activeConfig.description,
            isActive: activeConfig.isActive,
            weights: activeConfig.weights,
            acceptanceWindows: activeConfig.acceptanceWindows,
            escalationSettings: activeConfig.escalationSettings,
            timezoneSettings: activeConfig.timezoneSettings,
            experienceMatrix: activeConfig.experienceMatrix,
            workloadSettings: activeConfig.workloadSettings,
            exclusionRules: activeConfig.exclusionRules,
            bonusModifiers: activeConfig.bonusModifiers,
            publishedAt: activeConfig.publishedAt,
            createdAt: activeConfig.createdAt,
            updatedAt: activeConfig.updatedAt,
          }
        : {
            id: null,
            version: 0,
            name: "Default Configuration",
            description: "Built-in default configuration",
            isActive: true,
            ...DEFAULT_CONFIG,
            publishedAt: null,
            createdAt: null,
            updatedAt: null,
          },
      defaultConfig: DEFAULT_CONFIG,
      skills: allSkills,
    });
  }, { endpoint: "GET /api/admin/algorithm" });
}

/**
 * POST /api/admin/algorithm
 * Create a new algorithm configuration (as draft)
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw Errors.unauthorized();
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      throw Errors.forbidden("Admin access required");
    }

    const body = await request.json();
    const {
      name,
      description,
      weights,
      acceptanceWindows,
      escalationSettings,
      timezoneSettings,
      experienceMatrix,
      workloadSettings,
      exclusionRules,
      bonusModifiers,
    } = body;

    // Validate weights sum to 100
    const weightSum =
      (weights?.skillMatch || DEFAULT_CONFIG.weights.skillMatch) +
      (weights?.timezoneFit || DEFAULT_CONFIG.weights.timezoneFit) +
      (weights?.experienceMatch || DEFAULT_CONFIG.weights.experienceMatch) +
      (weights?.workloadBalance || DEFAULT_CONFIG.weights.workloadBalance) +
      (weights?.performanceHistory || DEFAULT_CONFIG.weights.performanceHistory);

    if (Math.abs(weightSum - 100) > 0.01) {
      throw Errors.badRequest(`Weights must sum to 100 (currently ${weightSum})`);
    }

    // Get next version number
    const [latestConfig] = await db
      .select({ version: assignmentAlgorithmConfig.version })
      .from(assignmentAlgorithmConfig)
      .orderBy(desc(assignmentAlgorithmConfig.version))
      .limit(1);

    const nextVersion = (latestConfig?.version || 0) + 1;

    const [newConfig] = await db
      .insert(assignmentAlgorithmConfig)
      .values({
        name: name || `Configuration v${nextVersion}`,
        description,
        version: nextVersion,
        isActive: false, // Start as draft
        weights: weights || DEFAULT_CONFIG.weights,
        acceptanceWindows: acceptanceWindows || DEFAULT_CONFIG.acceptanceWindows,
        escalationSettings: escalationSettings || DEFAULT_CONFIG.escalationSettings,
        timezoneSettings: timezoneSettings || DEFAULT_CONFIG.timezoneSettings,
        experienceMatrix: experienceMatrix || DEFAULT_CONFIG.experienceMatrix,
        workloadSettings: workloadSettings || DEFAULT_CONFIG.workloadSettings,
        exclusionRules: exclusionRules || DEFAULT_CONFIG.exclusionRules,
        bonusModifiers: bonusModifiers || DEFAULT_CONFIG.bonusModifiers,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning();

    logger.info(
      { configId: newConfig.id, version: newConfig.version, userId: session.user.id },
      "New algorithm configuration created"
    );

    return successResponse({ config: newConfig }, 201);
  }, { endpoint: "POST /api/admin/algorithm" });
}

/**
 * PUT /api/admin/algorithm
 * Update an existing algorithm configuration
 */
export async function PUT(request: NextRequest) {
  return withErrorHandling(async () => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw Errors.unauthorized();
    }

    const user = session.user as { role?: string };
    if (user.role !== "ADMIN") {
      throw Errors.forbidden("Admin access required");
    }

    const body = await request.json();
    const {
      id,
      name,
      description,
      weights,
      acceptanceWindows,
      escalationSettings,
      timezoneSettings,
      experienceMatrix,
      workloadSettings,
      exclusionRules,
      bonusModifiers,
    } = body;

    if (!id) {
      throw Errors.badRequest("Configuration ID is required");
    }

    // Validate weights sum to 100
    if (weights) {
      const weightSum =
        (weights.skillMatch || 0) +
        (weights.timezoneFit || 0) +
        (weights.experienceMatch || 0) +
        (weights.workloadBalance || 0) +
        (weights.performanceHistory || 0);

      if (Math.abs(weightSum - 100) > 0.01) {
        throw Errors.badRequest(`Weights must sum to 100 (currently ${weightSum})`);
      }
    }

    // Check if config exists
    const [existingConfig] = await db
      .select()
      .from(assignmentAlgorithmConfig)
      .where(eq(assignmentAlgorithmConfig.id, id));

    if (!existingConfig) {
      throw Errors.notFound("Configuration");
    }

    // Can't edit active config directly - must create new version
    if (existingConfig.isActive) {
      throw Errors.badRequest(
        "Cannot edit active configuration. Create a new version instead."
      );
    }

    const [updatedConfig] = await db
      .update(assignmentAlgorithmConfig)
      .set({
        name: name ?? existingConfig.name,
        description: description ?? existingConfig.description,
        weights: weights ?? existingConfig.weights,
        acceptanceWindows: acceptanceWindows ?? existingConfig.acceptanceWindows,
        escalationSettings: escalationSettings ?? existingConfig.escalationSettings,
        timezoneSettings: timezoneSettings ?? existingConfig.timezoneSettings,
        experienceMatrix: experienceMatrix ?? existingConfig.experienceMatrix,
        workloadSettings: workloadSettings ?? existingConfig.workloadSettings,
        exclusionRules: exclusionRules ?? existingConfig.exclusionRules,
        bonusModifiers: bonusModifiers ?? existingConfig.bonusModifiers,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(assignmentAlgorithmConfig.id, id))
      .returning();

    logger.info(
      { configId: id, userId: session.user.id },
      "Algorithm configuration updated"
    );

    return successResponse({ config: updatedConfig });
  }, { endpoint: "PUT /api/admin/algorithm" });
}
