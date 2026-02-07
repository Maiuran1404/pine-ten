import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { db } from "@/db";
import { stripeConnectAccounts, payouts } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the artist portal URL (handles subdomain for dev/prod)
 */
function getArtistPortalUrl(): string {
  const appUrl = config.app.url;
  const baseDomain = config.app.baseDomain;

  // In production: use artist.baseDomain
  if (appUrl.includes(baseDomain)) {
    const protocol = appUrl.startsWith("https") ? "https" : "http";
    return `${protocol}://artist.${baseDomain}`;
  }

  // In development: use artist.localhost:3000
  try {
    const url = new URL(appUrl);
    return `${url.protocol}//artist.${url.host}`;
  } catch {
    return appUrl; // fallback
  }
}

/**
 * Create a Stripe Connect Express account for an artist
 */
export async function createConnectAccount(
  freelancerId: string,
  email: string,
  country: string = "US"
): Promise<{ accountId: string; onboardingUrl: string }> {
  const stripe = getStripe();

  // Create Express account
  const account = await stripe.accounts.create({
    type: "express",
    country,
    email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: {
      freelancerId,
    },
  });

  // Store in database
  await db.insert(stripeConnectAccounts).values({
    freelancerId,
    stripeAccountId: account.id,
    accountType: "express",
    country,
  });

  // Generate onboarding link — use artist subdomain for redirect
  const artistUrl = getArtistPortalUrl();
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${artistUrl}/portal/payouts?stripe_refresh=true`,
    return_url: `${artistUrl}/portal/payouts?stripe_onboarded=true`,
    type: "account_onboarding",
  });

  logger.info({ freelancerId, accountId: account.id }, "Created Stripe Connect account");

  return {
    accountId: account.id,
    onboardingUrl: accountLink.url,
  };
}

/**
 * Get onboarding link for existing Connect account
 */
export async function getOnboardingLink(
  stripeAccountId: string
): Promise<string> {
  const stripe = getStripe();
  const artistUrl = getArtistPortalUrl();

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${artistUrl}/portal/payouts?stripe_refresh=true`,
    return_url: `${artistUrl}/portal/payouts?stripe_onboarded=true`,
    type: "account_onboarding",
  });

  return accountLink.url;
}

/**
 * Get dashboard link for connected account
 */
export async function getDashboardLink(
  stripeAccountId: string
): Promise<string> {
  const stripe = getStripe();

  const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
  return loginLink.url;
}

/**
 * Sync Connect account status from Stripe
 */
export async function syncConnectAccountStatus(
  stripeAccountId: string
): Promise<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  externalAccountLast4: string | null;
  externalAccountType: string | null;
}> {
  const stripe = getStripe();

  const account = await stripe.accounts.retrieve(stripeAccountId);

  // Get external account info if available
  let externalAccountLast4: string | null = null;
  let externalAccountType: string | null = null;

  if (account.external_accounts?.data?.length) {
    const externalAccount = account.external_accounts.data[0];
    if (externalAccount.object === "bank_account") {
      externalAccountLast4 = externalAccount.last4 || null;
      externalAccountType = "bank_account";
    } else if (externalAccount.object === "card") {
      externalAccountLast4 = externalAccount.last4 || null;
      externalAccountType = "card";
    }
  }

  // Update in database
  await db
    .update(stripeConnectAccounts)
    .set({
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      defaultCurrency: account.default_currency,
      externalAccountLast4,
      externalAccountType,
      updatedAt: new Date(),
    })
    .where(eq(stripeConnectAccounts.stripeAccountId, stripeAccountId));

  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted || false,
    externalAccountLast4,
    externalAccountType,
  };
}

/**
 * Get Connect account for a freelancer
 */
export async function getConnectAccount(freelancerId: string) {
  const result = await db
    .select()
    .from(stripeConnectAccounts)
    .where(eq(stripeConnectAccounts.freelancerId, freelancerId))
    .limit(1);

  return result[0] || null;
}

/**
 * Calculate payout amounts based on credits and revenue split
 */
export function calculatePayoutAmounts(creditsAmount: number): {
  grossAmountUsd: number;
  platformFeeUsd: number;
  netAmountUsd: number;
  artistPercentage: number;
} {
  const pricePerCredit = config.credits.pricePerCredit;
  const artistPercentage = config.payouts.artistPercentage;

  const grossAmountUsd = creditsAmount * pricePerCredit;
  const netAmountUsd = (grossAmountUsd * artistPercentage) / 100;
  const platformFeeUsd = grossAmountUsd - netAmountUsd;

  return {
    grossAmountUsd: Math.round(grossAmountUsd * 100) / 100, // Round to 2 decimals
    platformFeeUsd: Math.round(platformFeeUsd * 100) / 100,
    netAmountUsd: Math.round(netAmountUsd * 100) / 100,
    artistPercentage,
  };
}

/**
 * Create a payout request
 */
export async function createPayoutRequest(
  freelancerId: string,
  creditsAmount: number,
  stripeConnectAccountId: string
): Promise<{ payoutId: string; status: string }> {
  const amounts = calculatePayoutAmounts(creditsAmount);

  const [payout] = await db
    .insert(payouts)
    .values({
      freelancerId,
      creditsAmount,
      grossAmountUsd: amounts.grossAmountUsd.toString(),
      platformFeeUsd: amounts.platformFeeUsd.toString(),
      netAmountUsd: amounts.netAmountUsd.toString(),
      artistPercentage: amounts.artistPercentage,
      status: "PENDING",
      payoutMethod: "STRIPE_CONNECT",
      stripeConnectAccountId,
    })
    .returning({ id: payouts.id });

  logger.info(
    { freelancerId, payoutId: payout.id, creditsAmount, netAmountUsd: amounts.netAmountUsd },
    "Created payout request"
  );

  return {
    payoutId: payout.id,
    status: "PENDING",
  };
}

/**
 * Process a payout via Stripe Connect Transfer
 */
export async function processPayoutTransfer(payoutId: string): Promise<{
  success: boolean;
  transferId?: string;
  error?: string;
}> {
  const stripe = getStripe();

  // Get payout details
  const [payout] = await db
    .select()
    .from(payouts)
    .where(eq(payouts.id, payoutId))
    .limit(1);

  if (!payout) {
    return { success: false, error: "Payout not found" };
  }

  if (payout.status !== "PENDING") {
    return { success: false, error: `Payout is ${payout.status}, cannot process` };
  }

  if (!payout.stripeConnectAccountId) {
    return { success: false, error: "No Stripe Connect account linked" };
  }

  try {
    // Update status to processing
    await db
      .update(payouts)
      .set({ status: "PROCESSING", updatedAt: new Date() })
      .where(eq(payouts.id, payoutId));

    // Create transfer to connected account
    const transfer = await stripe.transfers.create({
      amount: Math.round(Number(payout.netAmountUsd) * 100), // Convert to cents
      currency: "usd",
      destination: payout.stripeConnectAccountId,
      metadata: {
        payoutId: payout.id,
        freelancerId: payout.freelancerId,
        creditsAmount: payout.creditsAmount.toString(),
      },
    });

    // Update payout with transfer ID
    await db
      .update(payouts)
      .set({
        status: "COMPLETED",
        stripeTransferId: transfer.id,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, payoutId));

    logger.info(
      { payoutId, transferId: transfer.id, amount: payout.netAmountUsd },
      "Payout transfer completed"
    );

    return { success: true, transferId: transfer.id };
  } catch (err) {
    const error = err as Error;

    // Update payout with failure
    await db
      .update(payouts)
      .set({
        status: "FAILED",
        failureReason: error.message,
        updatedAt: new Date(),
      })
      .where(eq(payouts.id, payoutId));

    logger.error({ payoutId, error: error.message }, "Payout transfer failed");

    return { success: false, error: error.message };
  }
}

/**
 * Handle Stripe Connect webhook events
 */
export async function handleConnectWebhook(
  event: Stripe.Event
): Promise<void> {
  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;

    // Update account status in database
    await syncConnectAccountStatus(account.id);

    logger.info(
      { accountId: account.id, chargesEnabled: account.charges_enabled },
      "Connect account updated"
    );
  }

  if (event.type === "transfer.created" || event.type === "transfer.updated") {
    const transfer = event.data.object as Stripe.Transfer;
    const payoutId = transfer.metadata?.payoutId;

    if (payoutId) {
      // Update payout status based on transfer status
      // This is a backup in case the initial update failed
      await db
        .update(payouts)
        .set({
          stripeTransferId: transfer.id,
          updatedAt: new Date(),
        })
        .where(eq(payouts.id, payoutId));
    }
  }
}
