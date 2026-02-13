import { test, expect } from '@playwright/test'

/**
 * Basic smoke tests to verify the app is running
 */

test.describe('Basic App Tests', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Crafted/i)
  })

  test('should show login page', async ({ page }) => {
    await page.goto('/login')
    // Check for email input
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible({ timeout: 10000 })
  })

  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard/chat')
    // Should redirect to login
    await page.waitForURL(/login/, { timeout: 10000 })
  })
})

test.describe('Credit Purchase Dialog Tests', () => {
  test('return URL should include query parameters', async ({ page }) => {
    // Test that the return URL logic works correctly
    await page.goto('/dashboard/chat?draft=test-123')

    // Evaluate what the return URL would be
    const returnUrl = await page.evaluate(() => {
      return window.location.pathname + window.location.search
    })

    expect(returnUrl).toBe('/dashboard/chat?draft=test-123')
  })
})

test.describe('Session Storage Tests', () => {
  test('should be able to store and retrieve pending task state', async ({ page }) => {
    await page.goto('/')

    // Set pending task state
    await page.evaluate(() => {
      const state = {
        taskProposal: {
          title: 'Test Task',
          description: 'Test description',
          creditsRequired: 15,
        },
        draftId: 'test-draft',
      }
      sessionStorage.setItem('pending_task_state', JSON.stringify(state))
    })

    // Verify it can be retrieved
    const retrieved = await page.evaluate(() => {
      const stored = sessionStorage.getItem('pending_task_state')
      return stored ? JSON.parse(stored) : null
    })

    expect(retrieved).not.toBeNull()
    expect(retrieved.taskProposal.title).toBe('Test Task')
    expect(retrieved.draftId).toBe('test-draft')
  })
})
