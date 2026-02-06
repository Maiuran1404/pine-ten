/**
 * Smart Task Assignment Algorithm
 *
 * A multi-factor scoring system for matching tasks to artists based on:
 * - Skill match (35%)
 * - Timezone fit (20%)
 * - Experience match (20%)
 * - Workload balance (15%)
 * - Performance history (10%)
 */

import { db } from "@/db";
import {
  freelancerProfiles,
  users,
  tasks,
  assignmentAlgorithmConfig,
  taskOffers,
  skills,
  artistSkills,
  clientArtistAffinity,
  taskCategories,
} from "@/db/schema";
import { eq, and, sql, not, inArray, desc, count } from "drizzle-orm";
import { logger } from "@/lib/logger";

// ============================================
// Types
// ============================================

export interface AlgorithmConfig {
  weights: {
    skillMatch: number;
    timezoneFit: number;
    experienceMatch: number;
    workloadBalance: number;
    performanceHistory: number;
  };
  acceptanceWindows: {
    critical: number;
    urgent: number;
    standard: number;
    flexible: number;
  };
  escalationSettings: {
    level1SkillThreshold: number;
    level2SkillThreshold: number;
    level1MaxOffers: number;
    level2MaxOffers: number;
    level3BroadcastMinutes: number;
    maxWorkloadOverride: number;
  };
  timezoneSettings: {
    peakHoursStart: string;
    peakHoursEnd: string;
    peakScore: number;
    eveningScore: number;
    earlyMorningScore: number;
    lateEveningScore: number;
    nightScore: number;
  };
  experienceMatrix: {
    SIMPLE: { JUNIOR: number; MID: number; SENIOR: number; EXPERT: number };
    INTERMEDIATE: { JUNIOR: number; MID: number; SENIOR: number; EXPERT: number };
    ADVANCED: { JUNIOR: number; MID: number; SENIOR: number; EXPERT: number };
    EXPERT: { JUNIOR: number; MID: number; SENIOR: number; EXPERT: number };
  };
  workloadSettings: {
    maxActiveTasks: number;
    scorePerTask: number;
  };
  exclusionRules: {
    minSkillScoreToInclude: number;
    excludeOverloaded: boolean;
    excludeNightHoursForUrgent: boolean;
    excludeVacationMode: boolean;
  };
  bonusModifiers: {
    categorySpecializationBonus: number;
    niceToHaveSkillBonus: number;
    favoriteArtistBonus: number;
  };
}

export interface ArtistData {
  userId: string;
  name: string;
  email: string;
  timezone: string | null;
  experienceLevel: "JUNIOR" | "MID" | "SENIOR" | "EXPERT";
  rating: number;
  completedTasks: number;
  acceptanceRate: number | null;
  onTimeRate: number | null;
  maxConcurrentTasks: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  acceptsUrgentTasks: boolean;
  vacationMode: boolean;
  skills: string[];
  specializations: string[];
  preferredCategories: string[];
}

export interface TaskData {
  id: string;
  title: string;
  complexity: "SIMPLE" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  urgency: "CRITICAL" | "URGENT" | "STANDARD" | "FLEXIBLE";
  categorySlug: string | null;
  requiredSkills: string[];
  clientId: string;
  deadline: Date | null;
}

export interface ScoreBreakdown {
  skillScore: number;
  timezoneScore: number;
  experienceScore: number;
  workloadScore: number;
  performanceScore: number;
}

export interface ArtistScore {
  artist: ArtistData;
  totalScore: number;
  breakdown: ScoreBreakdown;
  excluded: boolean;
  exclusionReason?: string;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_CONFIG: AlgorithmConfig = {
  weights: {
    skillMatch: 35,
    timezoneFit: 20,
    experienceMatch: 20,
    workloadBalance: 15,
    performanceHistory: 10,
  },
  acceptanceWindows: {
    critical: 10,
    urgent: 30,
    standard: 120,
    flexible: 240,
  },
  escalationSettings: {
    level1SkillThreshold: 70,
    level2SkillThreshold: 50,
    level1MaxOffers: 3,
    level2MaxOffers: 3,
    level3BroadcastMinutes: 30,
    maxWorkloadOverride: 1,
  },
  timezoneSettings: {
    peakHoursStart: "09:00",
    peakHoursEnd: "18:00",
    peakScore: 100,
    eveningScore: 80,
    earlyMorningScore: 70,
    lateEveningScore: 50,
    nightScore: 20,
  },
  experienceMatrix: {
    SIMPLE: { JUNIOR: 100, MID: 90, SENIOR: 70, EXPERT: 50 },
    INTERMEDIATE: { JUNIOR: 60, MID: 100, SENIOR: 90, EXPERT: 80 },
    ADVANCED: { JUNIOR: 20, MID: 70, SENIOR: 100, EXPERT: 95 },
    EXPERT: { JUNIOR: 0, MID: 40, SENIOR: 80, EXPERT: 100 },
  },
  workloadSettings: {
    maxActiveTasks: 5,
    scorePerTask: 20,
  },
  exclusionRules: {
    minSkillScoreToInclude: 50,
    excludeOverloaded: true,
    excludeNightHoursForUrgent: true,
    excludeVacationMode: true,
  },
  bonusModifiers: {
    categorySpecializationBonus: 10,
    niceToHaveSkillBonus: 5,
    favoriteArtistBonus: 10,
  },
};

// ============================================
// Configuration Management
// ============================================

export async function getActiveConfig(): Promise<AlgorithmConfig> {
  try {
    const [activeConfig] = await db
      .select()
      .from(assignmentAlgorithmConfig)
      .where(eq(assignmentAlgorithmConfig.isActive, true))
      .orderBy(desc(assignmentAlgorithmConfig.version))
      .limit(1);

    if (!activeConfig) {
      return DEFAULT_CONFIG;
    }

    return {
      weights: activeConfig.weights as AlgorithmConfig["weights"],
      acceptanceWindows: activeConfig.acceptanceWindows as AlgorithmConfig["acceptanceWindows"],
      escalationSettings: activeConfig.escalationSettings as AlgorithmConfig["escalationSettings"],
      timezoneSettings: activeConfig.timezoneSettings as AlgorithmConfig["timezoneSettings"],
      experienceMatrix: activeConfig.experienceMatrix as AlgorithmConfig["experienceMatrix"],
      workloadSettings: activeConfig.workloadSettings as AlgorithmConfig["workloadSettings"],
      exclusionRules: activeConfig.exclusionRules as AlgorithmConfig["exclusionRules"],
      bonusModifiers: activeConfig.bonusModifiers as AlgorithmConfig["bonusModifiers"],
    };
  } catch (error) {
    logger.error({ error }, "Failed to get active algorithm config, using defaults");
    return DEFAULT_CONFIG;
  }
}

// ============================================
// Scoring Functions
// ============================================

/**
 * Calculate skill match score (0-100)
 */
export function calculateSkillScore(
  artistSkills: string[],
  requiredSkills: string[],
  config: AlgorithmConfig
): number {
  if (requiredSkills.length === 0) {
    return 100; // No skill requirements = perfect match
  }

  const normalizedArtistSkills = artistSkills.map((s) => s.toLowerCase().trim());
  const normalizedRequiredSkills = requiredSkills.map((s) => s.toLowerCase().trim());

  const matchedSkills = normalizedRequiredSkills.filter((skill) =>
    normalizedArtistSkills.some(
      (artistSkill) =>
        artistSkill === skill ||
        artistSkill.includes(skill) ||
        skill.includes(artistSkill)
    )
  );

  const matchRatio = matchedSkills.length / normalizedRequiredSkills.length;
  return Math.round(matchRatio * 100);
}

/**
 * Calculate timezone fit score (0-100)
 */
export function calculateTimezoneScore(
  artistTimezone: string | null,
  config: AlgorithmConfig
): number {
  if (!artistTimezone) {
    return 50; // Unknown timezone = neutral score
  }

  try {
    // Get current time in artist's timezone
    const now = new Date();
    const artistTime = new Date(
      now.toLocaleString("en-US", { timeZone: artistTimezone })
    );
    const hour = artistTime.getHours();
    const minute = artistTime.getMinutes();
    const currentTime = hour + minute / 60;

    // Parse working hours
    const [peakStartHour, peakStartMin] = config.timezoneSettings.peakHoursStart
      .split(":")
      .map(Number);
    const [peakEndHour, peakEndMin] = config.timezoneSettings.peakHoursEnd
      .split(":")
      .map(Number);
    const peakStart = peakStartHour + peakStartMin / 60;
    const peakEnd = peakEndHour + peakEndMin / 60;

    // Determine score based on time of day
    if (currentTime >= peakStart && currentTime <= peakEnd) {
      return config.timezoneSettings.peakScore; // Peak hours (9-18)
    } else if (currentTime > peakEnd && currentTime <= 21) {
      return config.timezoneSettings.eveningScore; // Evening (18-21)
    } else if (currentTime >= 7 && currentTime < peakStart) {
      return config.timezoneSettings.earlyMorningScore; // Early morning (7-9)
    } else if (currentTime > 21 && currentTime <= 23) {
      return config.timezoneSettings.lateEveningScore; // Late evening (21-23)
    } else {
      return config.timezoneSettings.nightScore; // Night (23-7)
    }
  } catch (error) {
    logger.warn({ artistTimezone, error }, "Failed to calculate timezone score");
    return 50; // Invalid timezone = neutral score
  }
}

/**
 * Check if artist is in night hours
 */
export function isNightHours(artistTimezone: string | null): boolean {
  if (!artistTimezone) return false;

  try {
    const now = new Date();
    const artistTime = new Date(
      now.toLocaleString("en-US", { timeZone: artistTimezone })
    );
    const hour = artistTime.getHours();
    return hour >= 23 || hour < 7;
  } catch (error) {
    logger.debug({ err: error, artistTimezone }, "Failed to check night hours for timezone");
    return false;
  }
}

/**
 * Calculate experience match score (0-100)
 */
export function calculateExperienceScore(
  artistLevel: "JUNIOR" | "MID" | "SENIOR" | "EXPERT",
  taskComplexity: "SIMPLE" | "INTERMEDIATE" | "ADVANCED" | "EXPERT",
  config: AlgorithmConfig
): number {
  return config.experienceMatrix[taskComplexity][artistLevel];
}

/**
 * Calculate workload balance score (0-100)
 */
export function calculateWorkloadScore(
  activeTasks: number,
  config: AlgorithmConfig
): number {
  const score = Math.max(
    0,
    100 - activeTasks * config.workloadSettings.scorePerTask
  );
  return score;
}

/**
 * Calculate performance history score (0-100)
 */
export function calculatePerformanceScore(
  rating: number,
  onTimeRate: number | null,
  acceptanceRate: number | null
): number {
  // Rating contributes 50% (scale 0-5 to 0-100)
  const ratingScore = (rating / 5) * 100;

  // On-time rate contributes 30%
  const onTimeScore = onTimeRate !== null ? onTimeRate : 80;

  // Acceptance rate contributes 20%
  const acceptScore = acceptanceRate !== null ? acceptanceRate : 80;

  return Math.round(ratingScore * 0.5 + onTimeScore * 0.3 + acceptScore * 0.2);
}

// ============================================
// Main Scoring Algorithm
// ============================================

/**
 * Calculate composite score for an artist-task match
 */
export function calculateMatchScore(
  artist: ArtistData,
  task: TaskData,
  activeTasks: number,
  config: AlgorithmConfig,
  isFavorite: boolean = false
): ArtistScore {
  // Calculate individual scores
  const skillScore = calculateSkillScore(
    [...artist.skills, ...artist.specializations],
    task.requiredSkills,
    config
  );
  const timezoneScore = calculateTimezoneScore(artist.timezone, config);
  const experienceScore = calculateExperienceScore(
    artist.experienceLevel,
    task.complexity,
    config
  );
  const workloadScore = calculateWorkloadScore(activeTasks, config);
  const performanceScore = calculatePerformanceScore(
    artist.rating,
    artist.onTimeRate,
    artist.acceptanceRate
  );

  const breakdown: ScoreBreakdown = {
    skillScore,
    timezoneScore,
    experienceScore,
    workloadScore,
    performanceScore,
  };

  // Check exclusion rules
  let excluded = false;
  let exclusionReason: string | undefined;

  if (
    config.exclusionRules.excludeVacationMode &&
    artist.vacationMode
  ) {
    excluded = true;
    exclusionReason = "Artist is on vacation";
  } else if (skillScore < config.exclusionRules.minSkillScoreToInclude) {
    excluded = true;
    exclusionReason = `Skill score (${skillScore}) below threshold (${config.exclusionRules.minSkillScoreToInclude})`;
  } else if (
    config.exclusionRules.excludeOverloaded &&
    activeTasks >= config.workloadSettings.maxActiveTasks
  ) {
    excluded = true;
    exclusionReason = `At max capacity (${activeTasks}/${config.workloadSettings.maxActiveTasks} tasks)`;
  } else if (
    config.exclusionRules.excludeNightHoursForUrgent &&
    (task.urgency === "CRITICAL" || task.urgency === "URGENT") &&
    isNightHours(artist.timezone)
  ) {
    excluded = true;
    exclusionReason = "Urgent task during night hours";
  } else if (
    (task.urgency === "CRITICAL" || task.urgency === "URGENT") &&
    !artist.acceptsUrgentTasks
  ) {
    excluded = true;
    exclusionReason = "Artist does not accept urgent tasks";
  }

  if (excluded) {
    return {
      artist,
      totalScore: -1,
      breakdown,
      excluded: true,
      exclusionReason,
    };
  }

  // Calculate weighted composite score
  let totalScore =
    skillScore * (config.weights.skillMatch / 100) +
    timezoneScore * (config.weights.timezoneFit / 100) +
    experienceScore * (config.weights.experienceMatch / 100) +
    workloadScore * (config.weights.workloadBalance / 100) +
    performanceScore * (config.weights.performanceHistory / 100);

  // Apply bonus modifiers
  if (
    task.categorySlug &&
    artist.preferredCategories.includes(task.categorySlug)
  ) {
    totalScore += config.bonusModifiers.categorySpecializationBonus;
  }

  if (isFavorite) {
    totalScore += config.bonusModifiers.favoriteArtistBonus;
  }

  // Cap at 100
  totalScore = Math.min(100, Math.round(totalScore * 100) / 100);

  return {
    artist,
    totalScore,
    breakdown,
    excluded: false,
  };
}

// ============================================
// Artist Ranking
// ============================================

/**
 * Get all eligible artists and rank them for a task
 */
export async function rankArtistsForTask(
  task: TaskData,
  escalationLevel: number = 1
): Promise<ArtistScore[]> {
  const config = await getActiveConfig();

  // Get all approved, available artists
  const activeArtists = await db
    .select({
      userId: freelancerProfiles.userId,
      name: users.name,
      email: users.email,
      timezone: freelancerProfiles.timezone,
      experienceLevel: freelancerProfiles.experienceLevel,
      rating: freelancerProfiles.rating,
      completedTasks: freelancerProfiles.completedTasks,
      acceptanceRate: freelancerProfiles.acceptanceRate,
      onTimeRate: freelancerProfiles.onTimeRate,
      maxConcurrentTasks: freelancerProfiles.maxConcurrentTasks,
      workingHoursStart: freelancerProfiles.workingHoursStart,
      workingHoursEnd: freelancerProfiles.workingHoursEnd,
      acceptsUrgentTasks: freelancerProfiles.acceptsUrgentTasks,
      vacationMode: freelancerProfiles.vacationMode,
      skills: freelancerProfiles.skills,
      specializations: freelancerProfiles.specializations,
      preferredCategories: freelancerProfiles.preferredCategories,
    })
    .from(freelancerProfiles)
    .innerJoin(users, eq(freelancerProfiles.userId, users.id))
    .where(
      and(
        eq(freelancerProfiles.status, "APPROVED"),
        eq(freelancerProfiles.availability, true)
      )
    );

  if (activeArtists.length === 0) {
    return [];
  }

  // Get task counts per artist
  const taskCounts = await db
    .select({
      freelancerId: tasks.freelancerId,
      count: count(),
    })
    .from(tasks)
    .where(
      and(
        sql`${tasks.freelancerId} IS NOT NULL`,
        sql`${tasks.status} NOT IN ('COMPLETED', 'CANCELLED')`
      )
    )
    .groupBy(tasks.freelancerId);

  const countMap = new Map<string, number>();
  taskCounts.forEach((tc) => {
    if (tc.freelancerId) {
      countMap.set(tc.freelancerId, Number(tc.count));
    }
  });

  // Check for client favorites
  const favorites = await db
    .select({ artistId: clientArtistAffinity.artistId })
    .from(clientArtistAffinity)
    .where(
      and(
        eq(clientArtistAffinity.clientId, task.clientId),
        eq(clientArtistAffinity.isFavorite, true)
      )
    );

  const favoriteIds = new Set(favorites.map((f) => f.artistId));

  // Adjust thresholds based on escalation level
  let adjustedConfig = { ...config };
  if (escalationLevel >= 2) {
    adjustedConfig = {
      ...config,
      exclusionRules: {
        ...config.exclusionRules,
        minSkillScoreToInclude: config.escalationSettings.level2SkillThreshold,
      },
      workloadSettings: {
        ...config.workloadSettings,
        maxActiveTasks:
          config.workloadSettings.maxActiveTasks +
          config.escalationSettings.maxWorkloadOverride,
      },
    };
  }

  // Score all artists
  const scores: ArtistScore[] = activeArtists.map((artist) => {
    const artistData: ArtistData = {
      userId: artist.userId,
      name: artist.name,
      email: artist.email,
      timezone: artist.timezone,
      experienceLevel: (artist.experienceLevel || "JUNIOR") as ArtistData["experienceLevel"],
      rating: Number(artist.rating) || 0,
      completedTasks: artist.completedTasks,
      acceptanceRate: artist.acceptanceRate ? Number(artist.acceptanceRate) : null,
      onTimeRate: artist.onTimeRate ? Number(artist.onTimeRate) : null,
      maxConcurrentTasks: artist.maxConcurrentTasks,
      workingHoursStart: artist.workingHoursStart || "09:00",
      workingHoursEnd: artist.workingHoursEnd || "18:00",
      acceptsUrgentTasks: artist.acceptsUrgentTasks,
      vacationMode: artist.vacationMode,
      skills: (artist.skills as string[]) || [],
      specializations: (artist.specializations as string[]) || [],
      preferredCategories: (artist.preferredCategories as string[]) || [],
    };

    const activeTasks = countMap.get(artist.userId) || 0;
    const isFavorite = favoriteIds.has(artist.userId);

    return calculateMatchScore(artistData, task, activeTasks, adjustedConfig, isFavorite);
  });

  // Sort by score (highest first), excluding invalid scores
  return scores
    .filter((s) => !s.excluded)
    .sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Get the acceptance window for a task based on urgency
 */
export async function getAcceptanceWindow(
  urgency: "CRITICAL" | "URGENT" | "STANDARD" | "FLEXIBLE"
): Promise<number> {
  const config = await getActiveConfig();
  return config.acceptanceWindows[urgency.toLowerCase() as keyof typeof config.acceptanceWindows];
}

/**
 * Calculate the offer expiration time
 */
export function calculateOfferExpiration(
  urgency: "CRITICAL" | "URGENT" | "STANDARD" | "FLEXIBLE",
  config: AlgorithmConfig
): Date {
  const minutes = config.acceptanceWindows[urgency.toLowerCase() as keyof typeof config.acceptanceWindows];
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
  return expiresAt;
}

// ============================================
// Offer Management
// ============================================

/**
 * Create a task offer to an artist
 */
export async function createTaskOffer(
  taskId: string,
  artistScore: ArtistScore,
  escalationLevel: number = 1
): Promise<string> {
  const config = await getActiveConfig();

  // Get task urgency
  const [task] = await db
    .select({ urgency: tasks.urgency })
    .from(tasks)
    .where(eq(tasks.id, taskId));

  const urgency = (task?.urgency || "STANDARD") as TaskData["urgency"];
  const expiresAt = calculateOfferExpiration(urgency, config);

  const [offer] = await db
    .insert(taskOffers)
    .values({
      taskId,
      artistId: artistScore.artist.userId,
      matchScore: artistScore.totalScore.toString(),
      escalationLevel,
      expiresAt,
      response: "PENDING",
      scoreBreakdown: artistScore.breakdown,
    })
    .returning();

  // Update task with offer info
  await db
    .update(tasks)
    .set({
      status: "OFFERED",
      offeredTo: artistScore.artist.userId,
      offerExpiresAt: expiresAt,
      escalationLevel,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));

  return offer.id;
}

/**
 * Get artists who have already been offered this task
 */
export async function getPreviouslyOfferedArtists(taskId: string): Promise<string[]> {
  const offers = await db
    .select({ artistId: taskOffers.artistId })
    .from(taskOffers)
    .where(eq(taskOffers.taskId, taskId));

  return offers.map((o) => o.artistId);
}

/**
 * Find the next best artist for a task (excluding already offered)
 */
export async function findNextBestArtist(
  task: TaskData,
  escalationLevel: number = 1
): Promise<ArtistScore | null> {
  const previouslyOffered = await getPreviouslyOfferedArtists(task.id);
  const rankedArtists = await rankArtistsForTask(task, escalationLevel);

  // Filter out previously offered artists
  const availableArtists = rankedArtists.filter(
    (score) => !previouslyOffered.includes(score.artist.userId)
  );

  if (availableArtists.length === 0) {
    return null;
  }

  return availableArtists[0];
}

// ============================================
// Complexity Detection
// ============================================

/**
 * Auto-detect task complexity based on various factors
 */
export function detectTaskComplexity(
  estimatedHours: number | null,
  requiredSkillsCount: number,
  description: string
): "SIMPLE" | "INTERMEDIATE" | "ADVANCED" | "EXPERT" {
  let complexityScore = 0;

  // Estimated hours factor
  if (estimatedHours !== null) {
    if (estimatedHours <= 2) complexityScore += 0;
    else if (estimatedHours <= 4) complexityScore += 1;
    else if (estimatedHours <= 8) complexityScore += 2;
    else complexityScore += 3;
  }

  // Required skills factor
  if (requiredSkillsCount <= 1) complexityScore += 0;
  else if (requiredSkillsCount <= 2) complexityScore += 1;
  else if (requiredSkillsCount <= 4) complexityScore += 2;
  else complexityScore += 3;

  // Description keywords
  const complexKeywords = [
    "complex",
    "advanced",
    "expert",
    "multi-page",
    "campaign",
    "series",
    "animation",
    "3d",
    "motion graphics",
  ];
  const simpleKeywords = ["simple", "basic", "quick", "minor", "small", "edit"];

  const lowerDesc = description.toLowerCase();
  if (complexKeywords.some((kw) => lowerDesc.includes(kw))) complexityScore += 2;
  if (simpleKeywords.some((kw) => lowerDesc.includes(kw))) complexityScore -= 1;

  // Map score to complexity
  if (complexityScore <= 1) return "SIMPLE";
  if (complexityScore <= 3) return "INTERMEDIATE";
  if (complexityScore <= 5) return "ADVANCED";
  return "EXPERT";
}

/**
 * Auto-detect task urgency based on deadline
 */
export function detectTaskUrgency(
  deadline: Date | null
): "CRITICAL" | "URGENT" | "STANDARD" | "FLEXIBLE" {
  if (!deadline) return "FLEXIBLE";

  const now = new Date();
  const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDeadline <= 4) return "CRITICAL";
  if (hoursUntilDeadline <= 24) return "URGENT";
  if (hoursUntilDeadline <= 72) return "STANDARD";
  return "FLEXIBLE";
}

// ============================================
// Metrics Calculation
// ============================================

/**
 * Calculate and update artist metrics
 */
export async function updateArtistMetrics(artistId: string): Promise<void> {
  // Get all completed offers for this artist
  const offers = await db
    .select({
      response: taskOffers.response,
      offeredAt: taskOffers.offeredAt,
      respondedAt: taskOffers.respondedAt,
    })
    .from(taskOffers)
    .where(
      and(
        eq(taskOffers.artistId, artistId),
        not(eq(taskOffers.response, "PENDING"))
      )
    );

  if (offers.length === 0) return;

  // Calculate acceptance rate
  const acceptedCount = offers.filter((o) => o.response === "ACCEPTED").length;
  const acceptanceRate = (acceptedCount / offers.length) * 100;

  // Calculate average response time
  const responseTimes = offers
    .filter((o) => o.respondedAt)
    .map((o) => {
      const offered = new Date(o.offeredAt).getTime();
      const responded = new Date(o.respondedAt!).getTime();
      return (responded - offered) / (1000 * 60); // minutes
    });

  const avgResponseTime =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        )
      : null;

  // Get on-time rate from completed tasks
  const completedTasks = await db
    .select({
      deadline: tasks.deadline,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .where(
      and(eq(tasks.freelancerId, artistId), eq(tasks.status, "COMPLETED"))
    );

  const tasksWithDeadline = completedTasks.filter(
    (t) => t.deadline && t.completedAt
  );
  const onTimeCount = tasksWithDeadline.filter(
    (t) => new Date(t.completedAt!) <= new Date(t.deadline!)
  ).length;
  const onTimeRate =
    tasksWithDeadline.length > 0
      ? (onTimeCount / tasksWithDeadline.length) * 100
      : null;

  // Calculate experience level based on completed tasks
  const totalCompleted = completedTasks.length;
  let experienceLevel: "JUNIOR" | "MID" | "SENIOR" | "EXPERT" = "JUNIOR";
  if (totalCompleted > 150) experienceLevel = "EXPERT";
  else if (totalCompleted > 50) experienceLevel = "SENIOR";
  else if (totalCompleted > 10) experienceLevel = "MID";

  // Update profile
  await db
    .update(freelancerProfiles)
    .set({
      acceptanceRate: acceptanceRate.toString(),
      avgResponseTimeMinutes: avgResponseTime,
      onTimeRate: onTimeRate?.toString() || null,
      experienceLevel,
      completedTasks: totalCompleted,
      updatedAt: new Date(),
    })
    .where(eq(freelancerProfiles.userId, artistId));
}
