import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db'
import { taskCategories } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'

/**
 * GET /api/freelancer/earnings-guide
 * Returns earning examples based on task categories
 * Used to show artists what they can earn per task type without revealing percentages
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch active task categories
    const categories = await db
      .select({
        id: taskCategories.id,
        name: taskCategories.name,
        slug: taskCategories.slug,
        description: taskCategories.description,
        baseCredits: taskCategories.baseCredits,
      })
      .from(taskCategories)
      .where(eq(taskCategories.isActive, true))

    // Complexity multipliers for showing ranges
    const complexityMultipliers = {
      simple: 1,
      moderate: 1.5,
      complex: 2,
      premium: 3,
    }

    // Artist earnings per credit (from config, without revealing percentage)
    const artistEarningsPerCredit = config.payouts.creditValueUSD

    // Build earnings guide for each category
    const earningsGuide = categories.map((category) => {
      const baseCredits = category.baseCredits

      // Calculate earnings range based on complexity
      const simpleEarnings = Math.round(
        baseCredits * complexityMultipliers.simple * artistEarningsPerCredit
      )
      const moderateEarnings = Math.round(
        baseCredits * complexityMultipliers.moderate * artistEarningsPerCredit
      )
      const complexEarnings = Math.round(
        baseCredits * complexityMultipliers.complex * artistEarningsPerCredit
      )
      const premiumEarnings = Math.round(
        baseCredits * complexityMultipliers.premium * artistEarningsPerCredit
      )

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        baseCredits: baseCredits,
        earnings: {
          simple: simpleEarnings,
          moderate: moderateEarnings,
          complex: complexEarnings,
          premium: premiumEarnings,
          range: {
            min: simpleEarnings,
            max: premiumEarnings,
          },
        },
        // Examples for display
        examples: getExamplesForCategory(category.slug, {
          simple: simpleEarnings,
          moderate: moderateEarnings,
          complex: complexEarnings,
          premium: premiumEarnings,
        }),
      }
    })

    // Sort by base credits (higher earning tasks first)
    earningsGuide.sort((a, b) => b.baseCredits - a.baseCredits)

    return NextResponse.json({
      earningsGuide,
      notes: [
        'Earnings vary based on task complexity and requirements',
        'More complex projects pay significantly more',
        'Video and motion graphics projects typically have the highest earnings',
        'Earnings are deposited after client approval and a brief processing period',
      ],
    })
  } catch (error) {
    logger.error({ error }, 'Earnings guide fetch error')
    return NextResponse.json({ error: 'Failed to fetch earnings guide' }, { status: 500 })
  }
}

/**
 * Get example descriptions for each category to show realistic scenarios
 */
function getExamplesForCategory(
  slug: string,
  earnings: { simple: number; moderate: number; complex: number; premium: number }
): Array<{ description: string; earning: number; complexity: string }> {
  const examplesByCategory: Record<
    string,
    Array<{ description: string; earning: number; complexity: string }>
  > = {
    'video-motion-graphics': [
      {
        description: 'Simple logo animation (5-10 seconds)',
        earning: earnings.simple,
        complexity: 'Simple',
      },
      {
        description: 'Social media video ad (15-30 seconds)',
        earning: earnings.moderate,
        complexity: 'Moderate',
      },
      {
        description: 'Product showcase video with effects',
        earning: earnings.complex,
        complexity: 'Complex',
      },
      {
        description: 'Full campaign video with motion graphics',
        earning: earnings.premium,
        complexity: 'Premium',
      },
    ],
    'static-ads': [
      { description: 'Single static banner ad', earning: earnings.simple, complexity: 'Simple' },
      {
        description: 'Multi-size ad set (3-5 sizes)',
        earning: earnings.moderate,
        complexity: 'Moderate',
      },
      {
        description: 'Campaign ad set with variations',
        earning: earnings.complex,
        complexity: 'Complex',
      },
      {
        description: 'Full brand campaign (10+ assets)',
        earning: earnings.premium,
        complexity: 'Premium',
      },
    ],
    'social-media-content': [
      { description: 'Single social media post', earning: earnings.simple, complexity: 'Simple' },
      {
        description: 'Post series (3-5 posts)',
        earning: earnings.moderate,
        complexity: 'Moderate',
      },
      {
        description: 'Multi-platform content pack',
        earning: earnings.complex,
        complexity: 'Complex',
      },
      { description: 'Monthly content calendar', earning: earnings.premium, complexity: 'Premium' },
    ],
    'ui-ux-design': [
      { description: 'Simple UI component design', earning: earnings.simple, complexity: 'Simple' },
      { description: 'Landing page design', earning: earnings.moderate, complexity: 'Moderate' },
      {
        description: 'Multi-page website design',
        earning: earnings.complex,
        complexity: 'Complex',
      },
      {
        description: 'Full app UI/UX with prototypes',
        earning: earnings.premium,
        complexity: 'Premium',
      },
    ],
  }

  // Default examples if category not found
  const defaultExamples = [
    { description: 'Basic task', earning: earnings.simple, complexity: 'Simple' },
    { description: 'Standard task', earning: earnings.moderate, complexity: 'Moderate' },
    { description: 'Complex task', earning: earnings.complex, complexity: 'Complex' },
    { description: 'Premium project', earning: earnings.premium, complexity: 'Premium' },
  ]

  return examplesByCategory[slug] || defaultExamples
}
