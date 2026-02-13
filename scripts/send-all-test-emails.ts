/**
 * Send all email templates to a test address.
 * Usage: npx tsx scripts/send-all-test-emails.ts
 */
import 'dotenv/config'

import { register } from 'tsconfig-paths'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const tsconfig = JSON.parse(readFileSync(resolve(__dirname, '../tsconfig.json'), 'utf-8'))
register({
  baseUrl: resolve(__dirname, '..'),
  paths: tsconfig.compilerOptions.paths,
})

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const { sendEmail, emailTemplates } = await import('@/lib/notifications/email')
  const { adminNotifications } = await import('@/lib/notifications/email')
  const { config } = await import('@/lib/config')

  const TO = 'maiuran@getcrafted.ai'
  const BASE = config.app.url
  const DELAY = 1200 // ms between sends to respect 2 req/s rate limit
  const results: { name: string; success: boolean; error?: unknown }[] = []

  async function send(name: string, template: { subject: string; html: string }) {
    console.log(`  Sending: ${name}`)
    try {
      const res = await sendEmail({
        to: TO,
        subject: `[TEST] ${template.subject}`,
        html: template.html,
      })
      results.push({ name, success: res.success, error: res.error })
      if (res.success) console.log(`  ✓ Sent`)
      else console.log(`  ✗ Failed: ${JSON.stringify(res.error)}`)
    } catch (err) {
      results.push({ name, success: false, error: err })
      console.log(`  ✗ Error: ${err}`)
    }
    await sleep(DELAY)
  }

  // ── 14 User Templates ──────────────────────────────────
  console.log('\n=== USER TEMPLATES (14) ===\n')

  await send('1. welcomeClient', emailTemplates.welcomeClient('Maiuran', `${BASE}/dashboard`))
  await send(
    '2. emailVerification',
    emailTemplates.emailVerification('Maiuran', `${BASE}/verify?token=test123`)
  )
  await send(
    '3. passwordReset',
    emailTemplates.passwordReset('Maiuran', `${BASE}/reset?token=test123`)
  )
  await send(
    '4. creditsPurchased',
    emailTemplates.creditsPurchased('Maiuran', 100, `${BASE}/dashboard`)
  )
  await send('5. lowCredits', emailTemplates.lowCredits('Maiuran', 3, `${BASE}/dashboard/credits`))
  await send(
    '6. taskAssigned',
    emailTemplates.taskAssigned(
      'Maiuran',
      'Brand Identity Refresh — Acme Corp',
      `${BASE}/portal/tasks/test-task-1`
    )
  )
  await send(
    '7. taskAssignedToClient',
    emailTemplates.taskAssignedToClient(
      'Maiuran',
      'Brand Identity Refresh — Acme Corp',
      'Sarah Chen',
      `${BASE}/dashboard/tasks/test-task-1`
    )
  )
  await send(
    '8. deliverableSubmittedToClient',
    emailTemplates.deliverableSubmittedToClient(
      'Maiuran',
      'Brand Identity Refresh — Acme Corp',
      'Sarah Chen',
      `${BASE}/dashboard/tasks/test-task-1`
    )
  )
  await send(
    '9. taskCompleted',
    emailTemplates.taskCompleted(
      'Maiuran',
      'Brand Identity Refresh — Acme Corp',
      `${BASE}/dashboard/tasks/test-task-1`
    )
  )
  await send(
    '10. taskApprovedForClient',
    emailTemplates.taskApprovedForClient(
      'Maiuran',
      'Brand Identity Refresh — Acme Corp',
      `${BASE}/dashboard/designs`
    )
  )
  await send(
    '11. taskApprovedForFreelancer',
    emailTemplates.taskApprovedForFreelancer('Maiuran', 'Brand Identity Refresh — Acme Corp', 25)
  )
  await send(
    '12. revisionRequested',
    emailTemplates.revisionRequested(
      'Maiuran',
      'Brand Identity Refresh — Acme Corp',
      `${BASE}/portal/tasks/test-task-1`,
      'The logo looks great but could you try a darker shade of green? Also the tagline font feels a bit too casual — something more refined would work better.'
    )
  )
  await send(
    '13. freelancerApproved',
    emailTemplates.freelancerApproved('Maiuran', `${BASE}/portal`)
  )
  await send('14. freelancerRejected', emailTemplates.freelancerRejected('Maiuran'))

  // ── 13 Admin Templates ─────────────────────────────────
  console.log('\n=== ADMIN TEMPLATES (13) ===\n')

  const adminCalls: { name: string; fn: () => Promise<unknown> }[] = [
    {
      name: '15. admin:newClientSignup',
      fn: () =>
        adminNotifications.newClientSignup({
          name: 'Alex Johnson',
          email: 'alex@testcompany.com',
          userId: 'test-user-id',
          company: { name: 'TestCo', industry: 'Technology' },
        }),
    },
    {
      name: '16. admin:newFreelancerApplication',
      fn: () =>
        adminNotifications.newFreelancerApplication({
          name: 'Sarah Chen',
          email: 'sarah@designer.com',
          skills: ['Brand Design', 'UI/UX', 'Motion Graphics'],
          portfolioUrls: ['https://dribbble.com/sarahchen', 'https://behance.net/sarahchen'],
          userId: 'test-freelancer-id',
          hourlyRate: 75,
        }),
    },
    {
      name: '17. admin:newTaskCreated',
      fn: () =>
        adminNotifications.newTaskCreated({
          taskId: 'test-task-1',
          taskTitle: 'Brand Identity Refresh — Acme Corp',
          clientName: 'Alex Johnson',
          clientEmail: 'alex@testcompany.com',
          category: 'Static Ads',
          creditsUsed: 25,
          companyId: 'test-company-id',
        }),
    },
    {
      name: '18. admin:taskAssigned',
      fn: () =>
        adminNotifications.taskAssigned({
          taskId: 'test-task-1',
          taskTitle: 'Brand Identity Refresh — Acme Corp',
          freelancerName: 'Sarah Chen',
          freelancerEmail: 'sarah@designer.com',
          clientName: 'Alex Johnson',
          credits: 25,
        }),
    },
    {
      name: '19. admin:taskCompleted',
      fn: () =>
        adminNotifications.taskCompleted({
          taskId: 'test-task-1',
          taskTitle: 'Brand Identity Refresh — Acme Corp',
          freelancerName: 'Sarah Chen',
          clientName: 'Alex Johnson',
          credits: 25,
        }),
    },
    {
      name: '20. admin:creditPurchase',
      fn: () =>
        adminNotifications.creditPurchase({
          clientName: 'Alex Johnson',
          clientEmail: 'alex@testcompany.com',
          credits: 100,
          amount: 490.0,
          paymentId: 'pi_test_abc123xyz',
          newBalance: 125,
        }),
    },
    {
      name: '21. admin:freelancerApproved',
      fn: () =>
        adminNotifications.freelancerApproved({
          name: 'Sarah Chen',
          email: 'sarah@designer.com',
          approvedBy: 'Admin',
          userId: 'test-freelancer-id',
          skills: ['Brand Design', 'UI/UX'],
        }),
    },
    {
      name: '22. admin:freelancerRejected',
      fn: () =>
        adminNotifications.freelancerRejected({
          name: 'John Doe',
          email: 'john@example.com',
          rejectedBy: 'Admin',
          reason: 'Portfolio quality below threshold',
          userId: 'test-rejected-id',
        }),
    },
    {
      name: '23. admin:revisionRequested',
      fn: () =>
        adminNotifications.revisionRequested({
          taskId: 'test-task-1',
          taskTitle: 'Brand Identity Refresh — Acme Corp',
          clientName: 'Alex Johnson',
          freelancerName: 'Sarah Chen',
          revisionsUsed: 1,
          maxRevisions: 2,
          feedback: 'Needs darker green shade',
        }),
    },
    {
      name: '24. admin:deliverablePendingReview',
      fn: () =>
        adminNotifications.deliverablePendingReview({
          taskId: 'test-task-1',
          taskTitle: 'Brand Identity Refresh — Acme Corp',
          freelancerName: 'Sarah Chen',
          freelancerEmail: 'sarah@designer.com',
          clientName: 'Alex Johnson',
          clientEmail: 'alex@testcompany.com',
          fileCount: 4,
          credits: 25,
        }),
    },
    {
      name: '25. admin:deliverableVerified',
      fn: () =>
        adminNotifications.deliverableVerified({
          taskTitle: 'Brand Identity Refresh — Acme Corp',
          clientName: 'Maiuran',
          clientEmail: TO,
          freelancerName: 'Sarah Chen',
          taskUrl: `${BASE}/dashboard/tasks/test-task-1`,
        }),
    },
    {
      name: '26. admin:taskUnassignable',
      fn: () =>
        adminNotifications.taskUnassignable({
          taskId: 'test-task-1',
          taskTitle: 'Brand Identity Refresh — Acme Corp',
          reason: 'No freelancers available with matching skills (Brand Design + Motion Graphics)',
          escalationLevel: 2,
        }),
    },
    {
      name: '27. admin:taskOfferSent',
      fn: () =>
        adminNotifications.taskOfferSent({
          taskId: 'test-task-1',
          taskTitle: 'Brand Identity Refresh — Acme Corp',
          artistName: 'Sarah Chen',
          artistEmail: 'sarah@designer.com',
          matchScore: 87.5,
          expiresInMinutes: 30,
        }),
    },
  ]

  for (const { name, fn } of adminCalls) {
    console.log(`  Sending: ${name}`)
    try {
      const res = (await fn()) as { success?: boolean; error?: unknown } | undefined
      const success = (res as { success?: boolean })?.success ?? true
      results.push({ name, success, error: (res as { error?: unknown })?.error })
      if (success) console.log(`  ✓ Sent`)
      else console.log(`  ✗ Failed`)
    } catch (err) {
      results.push({ name, success: false, error: err })
      console.log(`  ✗ Error: ${err}`)
    }
    await sleep(DELAY)
  }

  // ── Summary ─────────────────────────────────────────────
  console.log('\n=== SUMMARY ===\n')
  const passed = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length
  console.log(`Total: ${results.length} | Sent: ${passed} | Failed: ${failed}`)
  if (failed > 0) {
    console.log('\nFailed:')
    results.filter((r) => !r.success).forEach((r) => console.log(`  - ${r.name}`))
  }
  console.log(`\nAll emails sent to: ${TO}`)
}

main().catch(console.error)
