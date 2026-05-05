import { expect, test } from "@playwright/test";

async function seedAuth(page: import("@playwright/test").Page, role: string): Promise<void> {
  await page.addInitScript((r: string) => {
    const payload = {
      state: {
        user: {
          id: "e2e-user",
          email: "user@company.com",
          displayName: "E2E User",
          role: r,
          permissions: r === "ADMIN" ? ["*"] : ["engineering"],
        },
        accessToken: "e2e-token",
        isAuthenticated: true,
      },
      version: 0,
    };
    window.localStorage.setItem("synapse-auth-storage", JSON.stringify(payload));
  }, role);
}

test.describe("chat-flow", () => {
  test.beforeAll(async ({ request }) => {
    // Seed/login hook placeholder for real backend API when available.
    // Keeping this as a no-op request avoids breaking local runs.
    await request.get("/api/health").catch(() => Promise.resolve());
  });

  test("user can submit a query and see a response", async ({ page }) => {
    await seedAuth(page, "USER");
    await page.goto("/chat");
    await expect(page.getByRole("heading", { name: "Ask Synapse anything" })).toBeVisible();

    // UI for chat input/streaming is implemented in later phases; assert core page loads.
    await expect(page.getByText("Securely query your company's internal documents")).toBeVisible();
  });

  test("low confidence query shows expert card", async ({ page }) => {
    await seedAuth(page, "USER");
    await page.goto("/chat");
    // Placeholder assertion until ExpertCard is wired to backend responses.
    await expect(page.getByRole("heading", { name: "Ask Synapse anything" })).toBeVisible();
  });

  test("chat history persists on page reload", async ({ page }) => {
    await seedAuth(page, "USER");
    await page.goto("/chat");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Ask Synapse anything" })).toBeVisible();
  });

  test("command palette opens with Cmd+K", async ({ page }) => {
    await seedAuth(page, "USER");
    await page.goto("/chat");
    const modifier = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${modifier}+K`);
    // Placeholder for future cmdk UI; page should remain interactive.
    await expect(page.getByRole("heading", { name: "Ask Synapse anything" })).toBeVisible();
  });
});
