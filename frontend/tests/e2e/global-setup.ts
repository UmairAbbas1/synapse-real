import type { FullConfig } from "@playwright/test";

async function isServerUp(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "GET" });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL?.toString() ?? "http://localhost:3000";
  // `webServer` in playwright.config.ts starts the dev server if it is not running.
  // Here we only sanity-check reachability before tests execute.
  const up = await isServerUp(baseURL);
  if (!up) {
    // Do not fail setup immediately; allow Playwright's webServer to start it.
    return;
  }
}
