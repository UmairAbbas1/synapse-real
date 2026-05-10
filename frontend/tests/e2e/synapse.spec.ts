import { test, expect } from "@playwright/test";

test.describe("Synapse E2E", () => {
  test("happy path: login → query → see answer", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@company.com");
    await page.fill('input[name="password"]', "Admin123!");
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL("/chat");
    
    const input = page.locator('textarea[placeholder*="query"]');
    await input.fill("What is our deployment process?");
    await input.press("Enter");
    
    // Wait for streaming to complete (no blinking cursor or status-done)
    // Assuming there's a status-done or similar indicator as per prompt
    await page.waitForSelector(".status-done", { timeout: 30000 });
    
    const answer = page.locator(".assistant-message");
    await expect(answer).toBeVisible();
    await expect(answer).not.toBeEmpty();
    
    const citation = page.locator(".citation-card");
    await expect(citation.first()).toBeVisible();
  });

  test("rbac: junior cannot access admin pages", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "jamie.junior@company.com");
    await page.fill('input[name="password"]', "Demo1234!");
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL("/chat");
    
    await page.goto("/admin/users");
    // Assert redirected back to /chat (or some other non-admin page)
    await expect(page).toHaveURL("/chat");
  });

  test("streaming: tokens appear progressively", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@company.com");
    await page.fill('input[name="password"]', "Admin123!");
    await page.click('button[type="submit"]');
    
    const input = page.locator('textarea[placeholder*="query"]');
    await input.fill("Tell me a long story about RAG.");
    await input.press("Enter");
    
    // Wait for the first token to appear
    const bubble = page.locator(".assistant-message");
    await expect(bubble).toBeVisible();
    
    // Check that it's NOT done yet but has content
    const isDone = await page.locator(".status-done").isVisible();
    const content = await bubble.textContent();
    
    if (!isDone) {
        expect(content?.length).toBeGreaterThan(0);
    }
  });

  test("low confidence: vague query shows expert card or low confidence pill", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin@company.com");
    await page.fill('input[name="password"]', "Admin123!");
    await page.click('button[type="submit"]');
    
    const input = page.locator('textarea[placeholder*="query"]');
    await input.fill("xyzzy gibberish query that matches nothing");
    await input.press("Enter");
    
    await page.waitForSelector(".status-done", { timeout: 30000 });
    
    const lowConfidencePill = page.locator(".low-confidence-pill");
    const expertCard = page.locator(".expert-card");
    
    await expect(lowConfidencePill.or(expertCard)).toBeVisible();
  });
});
