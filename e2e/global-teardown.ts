import fs from "node:fs";
import path from "node:path";

import { chromium, type FullConfig } from "@playwright/test";

export default async function teardown(config: FullConfig) {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
  for (const project of config.projects) {
    const file = path.join(__dirname, ".auth", `${project.name}.json`);
    if (!fs.existsSync(file)) continue;
    const page = await browser.newPage({
      storageState: file,
      ...(project.use.baseURL ? { baseURL: project.use.baseURL } : {}),
    });
    try {
      await page.goto("/settings");
      if (!new URL(page.url()).pathname.startsWith("/settings")) continue;
      const username = (await page.getByText(/^Signed in as @/).innerText()).replace(
        "Signed in as @",
        "",
      );
      if (!username.startsWith("e2e_")) continue;
      await page.getByRole("button", { name: "Delete account" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel(`Type ${username} to confirm`).fill(username);
      await dialog.locator("#delete-password").fill("Oink-e2e-Pass-2026!");
      await dialog.getByRole("button", { name: "Delete my account forever" }).click();
      await page.waitForURL(/\/(login|register)/);
    } finally {
      await page.close();
      fs.rmSync(file, { force: true });
    }
  }
  await browser.close();
}
