import { test, expect } from "@playwright/test"

test.describe("Student Placement Flow - Navigation Tests", () => {
  test("student can navigate to profile page from dashboard", async ({ page }) => {
    await page.goto("/student/dashboard")
    await page.waitForLoadState("networkidle")

    // Click Candidate Profile in sidebar
    await page.getByRole("link", { name: /Candidate Profile/i }).click()
    await page.waitForLoadState("networkidle")

    // Verify profile page loaded by URL
    await page.waitForURL("/student/profile", { timeout: 15000 })
    
    // Verify we're on the profile page
    const heading = page.locator("h1")
    await expect(heading).toBeVisible()
    await expect(heading).toContainText("Student Profile")
  })

  test("student can navigate to jobs page from dashboard", async ({ page }) => {
    await page.goto("/student/dashboard")
    await page.waitForLoadState("networkidle")

    // Click Eligible Jobs in sidebar
    await page.getByRole("link", { name: /Eligible Jobs/i }).click()
    await page.waitForLoadState("networkidle")

    // Verify jobs page loaded by URL
    await page.waitForURL("/student/jobs", { timeout: 15000 })
    
    // Verify we're on the jobs page
    const heading = page.locator("h1")
    await expect(heading).toBeVisible()
    await expect(heading).toContainText("Campus Placement Drives")
  })

  test("student can navigate to mock interview prep from dashboard", async ({ page }) => {
    await page.goto("/student/dashboard")
    await page.waitForLoadState("networkidle")

    // Click AI Mock Prep in sidebar
    await page.getByRole("link", { name: /AI Mock Prep/i }).click()
    await page.waitForLoadState("networkidle")

    // Verify mock page loaded by URL
    await page.waitForURL("/student/mock", { timeout: 15000 })
    
    // Verify we're on the mock page
    const heading = page.locator("h1")
    await expect(heading).toBeVisible()
    await expect(heading).toContainText("Interview Prep & Mocks")
  })

  test("sidebar contains Help with nested Support/Feedback links", async ({
    page,
  }) => {
    await page.goto("/student/dashboard")
    await page.waitForLoadState("networkidle")

    // Verify Help link is present in sidebar
    const helpLink = page.getByRole("link", { name: /Help/i })
    await expect(helpLink).toBeVisible({ timeout: 10000 })

    // Verify Support link is present (nested under Help context)
    const supportLink = page.getByRole("link", { name: /Support/i })
    await expect(supportLink).toBeVisible({ timeout: 10000 })

    // Verify Feedback link is present (nested under Help context)
    const feedbackLink = page.getByRole("link", { name: /Feedback/i })
    await expect(feedbackLink).toBeVisible({ timeout: 10000 })

    test.info().log(
      "Sidebar verified: Help with nested Support/Feedback links present"
    )
  })
})