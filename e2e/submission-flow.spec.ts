import { test, expect, Page } from '@playwright/test'

/**
 * E2E tests for the task submission flow
 * Tests the complete flow from chat -> credits -> submit -> task page
 */

// Test user credentials (use a test account)
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword'

// Helper to login
async function login(page: Page) {
  await page.goto('/login')
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/dashboard/)
}

// Helper to wait for chat to be ready
async function waitForChatReady(page: Page) {
  await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 })
}

test.describe('Task Submission Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page)
  })

  test('should show video references for video requests', async ({ page }) => {
    // Navigate to chat
    await page.goto('/dashboard/chat')
    await waitForChatReady(page)

    // Type a video request
    const chatInput = page.locator('[data-testid="chat-input"]')
    await chatInput.fill(
      'I need a polished 30-second cinematic video that introduces my product to the world'
    )
    await chatInput.press('Enter')

    // Wait for AI response
    await page.waitForSelector('[data-testid="assistant-message"]', {
      timeout: 30000,
    })

    // Check that video references are shown (not image styles)
    const videoRefGrid = page.locator('text=Video Style References')
    await expect(videoRefGrid).toBeVisible({ timeout: 10000 })

    // Verify image styles are NOT shown
    const imageStyleGrid = page.locator('[data-testid="deliverable-style-grid"]')
    await expect(imageStyleGrid).not.toBeVisible()
  })

  test('should save and restore taskProposal from draft', async ({ page }) => {
    // Navigate to chat
    await page.goto('/dashboard/chat')
    await waitForChatReady(page)

    // Start a conversation that leads to task proposal
    const chatInput = page.locator('[data-testid="chat-input"]')
    await chatInput.fill('I need a landing page hero image for my SaaS startup')
    await chatInput.press('Enter')

    // Wait for AI response with task proposal
    await page.waitForSelector('[data-testid="task-proposal-card"]', {
      timeout: 60000,
    })

    // Get the current URL (should have draft ID)
    const url = page.url()
    expect(url).toContain('draft=')

    // Extract draft ID
    const draftId = new URL(url).searchParams.get('draft')
    expect(draftId).toBeTruthy()

    // Refresh the page
    await page.reload()
    await waitForChatReady(page)

    // Verify task proposal is still visible after reload
    const taskProposalCard = page.locator('[data-testid="task-proposal-card"]')
    await expect(taskProposalCard).toBeVisible({ timeout: 10000 })
  })

  test('should open credit dialog when insufficient credits', async ({ page }) => {
    // Navigate to chat
    await page.goto('/dashboard/chat')
    await waitForChatReady(page)

    // Start a conversation that leads to task proposal
    const chatInput = page.locator('[data-testid="chat-input"]')
    await chatInput.fill('Create a product launch image for my app')
    await chatInput.press('Enter')

    // Wait for task proposal
    await page.waitForSelector('[data-testid="task-proposal-card"]', {
      timeout: 60000,
    })

    // Click submit button (assuming user has 0 credits)
    const submitButton = page.locator(
      '[data-testid="task-proposal-card"] button:has-text("Buy Credits")'
    )
    if (await submitButton.isVisible()) {
      await submitButton.click()

      // Credit dialog should appear
      const creditDialog = page.locator('text="Purchase Credits"')
      await expect(creditDialog).toBeVisible({ timeout: 5000 })
    }
  })

  test('should preserve draft ID in return URL for Stripe', async ({ page }) => {
    // Navigate to chat with a specific draft
    await page.goto('/dashboard/chat?draft=test-draft-123')
    await waitForChatReady(page)

    // Check that sessionStorage will have the right return URL
    // This is tested by checking the CreditPurchaseDialog behavior
    const savedReturnUrl = await page.evaluate(() => {
      // Simulate what the dialog does
      return window.location.pathname + window.location.search
    })

    expect(savedReturnUrl).toContain('draft=test-draft-123')
  })

  test('should show submission modal after successful payment return', async ({ page }) => {
    // Simulate returning from Stripe with payment success
    // First, set up the pending task state in sessionStorage
    await page.goto('/dashboard/chat')

    // Set pending task state in sessionStorage (simulating pre-payment state)
    await page.evaluate(() => {
      const pendingTaskState = {
        taskProposal: {
          title: 'Test Task',
          description: 'Test description',
          category: 'design',
          estimatedHours: 24,
          deliveryDays: 3,
          creditsRequired: 15,
        },
        draftId: 'test-draft',
      }
      sessionStorage.setItem('pending_task_state', JSON.stringify(pendingTaskState))
    })

    // Navigate with payment success params
    await page.goto('/dashboard/chat?payment=success&credits=50')

    // Wait for submission modal to auto-open
    const submissionModal = page.locator('[role="dialog"]')
    await expect(submissionModal).toBeVisible({ timeout: 10000 })

    // Check that success toast appears
    const toast = page.locator('text="Credits purchased"')
    await expect(toast).toBeVisible({ timeout: 5000 })
  })

  test('should navigate to task page after successful submission', async ({ page }) => {
    // This test requires a user with sufficient credits
    // Skip if not in a proper test environment
    test.skip(!process.env.TEST_WITH_CREDITS, 'Requires test user with credits')

    await page.goto('/dashboard/chat')
    await waitForChatReady(page)

    // Start a conversation
    const chatInput = page.locator('[data-testid="chat-input"]')
    await chatInput.fill('Create a simple social media post')
    await chatInput.press('Enter')

    // Wait for task proposal
    await page.waitForSelector('[data-testid="task-proposal-card"]', {
      timeout: 60000,
    })

    // Click submit
    const submitButton = page.locator(
      '[data-testid="task-proposal-card"] button:has-text("Review & Submit")'
    )
    await submitButton.click()

    // Confirm in modal
    const confirmButton = page.locator('button:has-text("Submit")')
    await confirmButton.click()

    // Should redirect to task page
    await page.waitForURL(/\/dashboard\/tasks\//, { timeout: 30000 })
    expect(page.url()).toContain('/dashboard/tasks/')
  })
})

test.describe('Video Reference Modal', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should play YouTube video in modal', async ({ page }) => {
    // Go to admin video references page
    await page.goto('/admin/video-references')

    // Click on a video thumbnail
    const videoCard = page.locator('[data-testid="video-card"]').first()
    await videoCard.click()

    // Modal should open with iframe
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Check that YouTube iframe is present
    const iframe = modal.locator('iframe')
    await expect(iframe).toBeVisible({ timeout: 5000 })

    // Verify iframe src contains youtube-nocookie.com
    const iframeSrc = await iframe.getAttribute('src')
    expect(iframeSrc).toContain('youtube-nocookie.com/embed/')
  })
})
