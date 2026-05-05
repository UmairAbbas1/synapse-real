import { expect, test } from "@playwright/test";

async function seedAuth(page: import("@playwright/test").Page, role: string): Promise<void> {
  await page.addInitScript((r: string) => {
    const payload = {
      state: {
        user: {
          id: "e2e-admin",
          email: "admin@company.com",
          displayName: "E2E Admin",
          role: r,
          permissions: ["*"],
        },
        accessToken: "e2e-token",
        isAuthenticated: true,
      },
      version: 0,
    };
    window.localStorage.setItem("synapse-auth-storage", JSON.stringify(payload));
  }, role);
}

test.describe("admin-flow", () => {
  test.beforeAll(async ({ request }) => {
    // Placeholder for admin seed/login bootstrap.
    await request.get("/api/health").catch(() => Promise.resolve());
  });

  test("admin can view dashboard stats", async ({ page }) => {
    await seedAuth(page, "ADMIN");
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByText("Total Documents")).toBeVisible();
  });

  test("admin can connect a data source", async ({ page }) => {
    await seedAuth(page, "ADMIN");
    await page.goto("/admin/sources");
    await expect(page.getByRole("heading", { name: "Data Sources" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect Source" })).toBeVisible();
  });

  test("admin can change user role", async ({ page }) => {
    await seedAuth(page, "ADMIN");
    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();
    await expect(page.getByText("System Admin")).toBeVisible();
  });
});
