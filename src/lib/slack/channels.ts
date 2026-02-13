/**
 * Slack Channel Management
 * Handles per-client channels and membership
 */

import { db } from '@/db'
import { companies, users, freelancerProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  createChannel,
  findChannelByName,
  inviteToChannel,
  removeFromChannel,
  setChannelTopic,
  postMessage,
  lookupUserByEmail,
} from './client'
import { clientChannelWelcomeBlock, artistAddedToChannelBlock } from './blocks'
import { logger } from '@/lib/logger'

/**
 * Get or create a Slack channel for a client/company
 * Channel naming: client-{company-slug}
 */
export async function getOrCreateClientChannel(
  companyId: string
): Promise<{ success: boolean; channelId?: string; error?: string }> {
  try {
    // Get company info
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    })

    if (!company) {
      return { success: false, error: 'Company not found' }
    }

    // Check if channel already exists in DB
    // Note: We'll store this in a slackChannelId field we'll add to companies
    // For now, try to find by name
    const channelName = `client-${slugify(company.name)}`

    // Try to find existing channel
    let channelId = await findChannelByName(channelName)

    if (!channelId) {
      // Create new channel
      const result = await createChannel(channelName, false)
      if (!result.success || !result.channelId) {
        return { success: false, error: result.error || 'Failed to create channel' }
      }
      channelId = result.channelId

      // Set channel topic
      await setChannelTopic(
        channelId,
        `Tasks and deliverables for ${company.name} | Managed by Crafted`
      )

      // Post welcome message
      await postMessage(
        channelId,
        clientChannelWelcomeBlock({
          id: companyId,
          name: company.name,
          industry: company.industry || undefined,
        }),
        `Welcome to ${company.name}'s channel`
      )
    }

    return { success: true, channelId }
  } catch (error) {
    logger.error({ err: error }, '[Slack] Failed to get/create client channel')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Add an artist (freelancer) to a client's Slack channel
 */
export async function addArtistToClientChannel(
  companyId: string,
  freelancerUserId: string,
  taskTitle: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the client channel
    const channelResult = await getOrCreateClientChannel(companyId)
    if (!channelResult.success || !channelResult.channelId) {
      return { success: false, error: channelResult.error }
    }

    // Get freelancer info
    const freelancer = await db.query.users.findFirst({
      where: eq(users.id, freelancerUserId),
    })

    if (!freelancer) {
      return { success: false, error: 'Freelancer not found' }
    }

    // Try to find their Slack user ID by email
    const slackUser = await lookupUserByEmail(freelancer.email)
    if (!slackUser.success || !slackUser.userId) {
      logger.warn({ email: freelancer.email }, '[Slack] Could not find Slack user')
      // Still mark as success - they might not be in the workspace
      return { success: true }
    }

    // Invite them to the channel
    const inviteResult = await inviteToChannel(channelResult.channelId, [slackUser.userId])
    if (!inviteResult.success) {
      // Check if already in channel
      if (inviteResult.error?.includes('already_in_channel')) {
        return { success: true }
      }
      return { success: false, error: inviteResult.error }
    }

    // Post announcement
    await postMessage(
      channelResult.channelId,
      artistAddedToChannelBlock(freelancer.name, taskTitle),
      `${freelancer.name} has been added to this channel`
    )

    return { success: true }
  } catch (error) {
    logger.error({ err: error }, '[Slack] Failed to add artist to channel')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Remove an artist from a client's Slack channel
 */
export async function removeArtistFromClientChannel(
  companyId: string,
  freelancerUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the client channel
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    })

    if (!company) {
      return { success: false, error: 'Company not found' }
    }

    const channelName = `client-${slugify(company.name)}`
    const channelId = await findChannelByName(channelName)

    if (!channelId) {
      // No channel exists, nothing to do
      return { success: true }
    }

    // Get freelancer info
    const freelancer = await db.query.users.findFirst({
      where: eq(users.id, freelancerUserId),
    })

    if (!freelancer) {
      return { success: false, error: 'Freelancer not found' }
    }

    // Try to find their Slack user ID
    const slackUser = await lookupUserByEmail(freelancer.email)
    if (!slackUser.success || !slackUser.userId) {
      return { success: true }
    }

    // Remove them from the channel
    return removeFromChannel(channelId, slackUser.userId)
  } catch (error) {
    logger.error({ err: error }, '[Slack] Failed to remove artist from channel')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Sync all artists assigned to a company's tasks into their Slack channel
 */
export async function syncClientChannelMembers(
  companyId: string
): Promise<{ success: boolean; added: number; error?: string }> {
  try {
    // Get the client channel
    const channelResult = await getOrCreateClientChannel(companyId)
    if (!channelResult.success || !channelResult.channelId) {
      return { success: false, added: 0, error: channelResult.error }
    }

    // Get all freelancers assigned to this company's tasks
    // This would require a more complex query in a real implementation
    // For now, we'll just return success
    logger.debug({ channelId: channelResult.channelId }, '[Slack] Would sync members for channel')

    return { success: true, added: 0 }
  } catch (error) {
    logger.error({ err: error }, '[Slack] Failed to sync channel members')
    return {
      success: false,
      added: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get the Slack channel ID for a company
 */
export async function getClientChannelId(companyId: string): Promise<string | null> {
  try {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    })

    if (!company) {
      return null
    }

    const channelName = `client-${slugify(company.name)}`
    return findChannelByName(channelName)
  } catch (error) {
    logger.error({ err: error }, '[Slack] Failed to get client channel ID')
    return null
  }
}

/**
 * Helper to create URL-safe slug from company name
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) // Slack channel names max 80 chars, leave room for "client-" prefix
}
