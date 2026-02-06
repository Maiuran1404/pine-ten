/**
 * Platform settings utility
 * Fetches configuration from database with fallback to hardcoded defaults
 *
 * IMPORTANT: These settings are admin-configurable through the dashboard
 * Changes take effect immediately without code deployment
 */

import { db } from "@/db";
import { platformSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { config } from "./config";

// Types for platform settings
export interface CreditSettings {
  pricePerCredit: number;
  currency: string;
  lowBalanceThreshold: number;
}

export interface PayoutSettings {
  artistPercentage: number;
  minimumPayoutCredits: number;
  holdingPeriodDays: number;
  creditValueUSD: number;
}

export interface PlatformSettingsData {
  credits: CreditSettings;
  payouts: PayoutSettings;
}

// Default values (used when database settings are not available)
const DEFAULTS: PlatformSettingsData = {
  credits: {
    pricePerCredit: config.credits.pricePerCredit,
    currency: config.credits.currency,
    lowBalanceThreshold: config.credits.lowBalanceThreshold,
  },
  payouts: {
    artistPercentage: config.payouts.artistPercentage,
    minimumPayoutCredits: config.payouts.minimumPayoutCredits,
    holdingPeriodDays: config.payouts.holdingPeriodDays,
    creditValueUSD: config.payouts.creditValueUSD,
  },
};

// Setting keys in database
const SETTING_KEYS = {
  CREDITS: "credits",
  PAYOUTS: "payouts",
} as const;

/**
 * Fetch a single setting from the database
 */
async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const result = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1);

    if (result.length > 0 && result[0].value !== null) {
      return result[0].value as T;
    }
    return defaultValue;
  } catch (error) {
    // Log error but don't throw - return default value
    console.error(`Failed to fetch setting "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Get credit settings (price, currency, thresholds)
 */
export async function getCreditSettings(): Promise<CreditSettings> {
  return getSetting(SETTING_KEYS.CREDITS, DEFAULTS.credits);
}

/**
 * Get payout settings (artist percentage, minimums, holding period)
 */
export async function getPayoutSettings(): Promise<PayoutSettings> {
  return getSetting(SETTING_KEYS.PAYOUTS, DEFAULTS.payouts);
}

/**
 * Get all platform settings at once
 */
export async function getAllPlatformSettings(): Promise<PlatformSettingsData> {
  const [credits, payouts] = await Promise.all([
    getCreditSettings(),
    getPayoutSettings(),
  ]);

  return { credits, payouts };
}

/**
 * Update a platform setting
 * Used by admin API to persist changes
 */
export async function updateSetting(
  key: string,
  value: unknown,
  description?: string
): Promise<void> {
  const existing = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(platformSettings)
      .set({ value, description, updatedAt: new Date() })
      .where(eq(platformSettings.key, key));
  } else {
    await db.insert(platformSettings).values({
      key,
      value,
      description,
    });
  }
}

/**
 * Initialize default platform settings in database if not present
 * Should be called during app startup or seeding
 */
export async function initializeDefaultSettings(): Promise<void> {
  const settingsToInit = [
    {
      key: SETTING_KEYS.CREDITS,
      value: DEFAULTS.credits,
      description: "Credit pricing and thresholds (pricePerCredit, currency, lowBalanceThreshold)",
    },
    {
      key: SETTING_KEYS.PAYOUTS,
      value: DEFAULTS.payouts,
      description: "Payout configuration (artistPercentage, minimumPayoutCredits, holdingPeriodDays, creditValueUSD)",
    },
  ];

  for (const setting of settingsToInit) {
    const existing = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, setting.key))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(platformSettings).values(setting);
    }
  }
}

/**
 * Calculate artist payout for a given number of credits
 */
export async function calculateArtistPayout(credits: number): Promise<number> {
  const settings = await getPayoutSettings();
  return credits * settings.creditValueUSD;
}

/**
 * Calculate platform revenue for a given number of credits
 */
export async function calculatePlatformRevenue(credits: number): Promise<number> {
  const [creditSettings, payoutSettings] = await Promise.all([
    getCreditSettings(),
    getPayoutSettings(),
  ]);

  const totalRevenue = credits * creditSettings.pricePerCredit;
  const artistPayout = credits * payoutSettings.creditValueUSD;
  return totalRevenue - artistPayout;
}
