import AxeBuilder from "@axe-core/playwright";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

const RUN = process.env.E2E_RUN ?? "local";
const userFor = (project: string) => `e2e_${RUN}_${project === "desktop" ? "d" : "m"}`.slice(0, 20);
const authFile = (project: string) => path.join(__dirname, ".auth", `${project}.json`);
const password = "Oink-e2e-Pass-2026!";

test.describe.configure({ mode: "default" });

async function clickUntil(page: Page, name: string, next: string) {
  await expect(async () => {
    await page.getByRole("button", { name, exact: true }).click({ timeout: 3000 });
    await expect(page.getByRole("button", { name: next, exact: true })).toBeVisible({
      timeout: 3000,
    });
  }).toPass({ timeout: 60_000 });
}

async function openQuickAdd(page: Page) {
  await page.waitForLoadState("networkidle");
  await page
    .getByRole("button", { name: "Add transaction" })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function expectNoOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect.soft(overflow, "page should not scroll sideways").toBeLessThanOrEqual(0);
}

test("register and onboard", async ({ page }, info) => {
  const username = userFor(info.project.name);
  await page.goto("/register");
  await page.waitForLoadState("networkidle");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.locator("#confirmPassword").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Save your recovery codes" })).toBeVisible();
  await page.getByLabel("I saved my recovery codes somewhere safe.").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForURL(/onboarding/);
  await page.waitForLoadState("networkidle");
  await clickUntil(page, "Let's go", "Continue");
  await clickUntil(page, "Continue", "Start tracking");
  await page.getByRole("button", { name: "Start tracking" }).click();
  await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
  await page.context().storageState({ path: authFile(info.project.name) });
});

for (const path of ["/login", "/register", "/forgot-password"]) {
  test(`a11y and layout (signed out): ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoOverflow(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .exclude("nextjs-portal")
      .analyze();
    expect
      .soft(
        results.violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 90)).join(", ")}`),
      )
      .toEqual([]);
  });
}

test.describe("signed in", () => {
  test.use({ storageState: async ({}, provide, info) => provide(authFile(info.project.name)) });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeVisible();
  });

  test("log an expense by typing it", async ({ page }) => {
    await openQuickAdd(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Type it").fill("jollibee lunch 150");
    await dialog.getByRole("button", { name: /^Fill/ }).click();
    await expect(dialog.locator("#qa-amount")).toHaveValue("150");
    await expect(dialog.locator("#qa-note")).toHaveValue("Jollibee lunch");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.reload();
    await expect(page.getByText("Jollibee lunch").first()).toBeVisible();
  });

  test("a tight budget makes the pig worry", async ({ page }) => {
    await page.goto("/plan");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Add budget" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#b-cat").selectOption("");
    await dialog.locator("#b-amount").fill("160");
    await dialog.getByRole("button", { name: "Add budget" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.goto("/");
    await expect(page.getByText(/Budget is \d+% used/)).toBeVisible();
    await expect(page.getByRole("meter", { name: /health/ })).toBeVisible();
  });

  test("account menu reaches Accounts on phones", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile-320", "phone-only menu");
    await page.getByRole("button", { name: "Account menu" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("link", { name: "Accounts & wallets" }).click();
    await expect(page.getByRole("heading", { name: "Accounts", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("search and export", async ({ page }) => {
    await page.goto("/activity?q=jollibee");
    await expect(page.getByText("Jollibee lunch").first()).toBeVisible();

    await page.goto("/insights");
    const href = await page.getByRole("link", { name: "Export CSV" }).getAttribute("href");
    expect(href).toBeTruthy();
    const res = await page.request.get(href ?? "");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    expect(await res.text()).toContain("Jollibee lunch");
  });

  for (const path of [
    "/",
    "/activity",
    "/activity/calendar",
    "/plan",
    "/insights",
    "/settings",
    "/assistant",
  ]) {
    test(`a11y and layout: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(new URL(page.url()).pathname).toBe(path);
      await expectNoOverflow(page);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .exclude("nextjs-portal")
        .analyze();
      const serious = results.violations
        .filter((v) => v.impact === "serious" || v.impact === "critical")
        .map(
          (v) =>
            `${v.id}: ${v.nodes
              .map((n) => `${n.target.join(" ")} ${n.html.slice(0, 90)}`)
              .slice(0, 3)
              .join(", ")}`,
        );
      expect.soft(serious).toEqual([]);
    });
  }
});
