import { test, expect } from "@playwright/test";

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@zarghoonjewellers.com";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!";

test.describe("Zarghoon Jewellers — Phase 1 core flow", () => {
  test("unauthenticated visitors are redirected to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("owner can log in, set today's gold rates, and see them on the dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(OWNER_EMAIL);
    await page.getByLabel("Password").fill(OWNER_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);

    const gateHeading = page.getByRole("heading", { name: "Set Today's Gold Rates" });
    if (await gateHeading.isVisible().catch(() => false)) {
      await page.getByLabel("24K Gold").fill("40000");
      await page.getByLabel("22K Gold").fill("36700");
      await page.getByLabel("21K Gold").fill("35000");
      await page.getByLabel("18K Gold").fill("30000");
      await page.getByRole("button", { name: "Save Rates & Open Dashboard" }).click();
      await expect(gateHeading).not.toBeVisible({ timeout: 10_000 });
    }

    await expect(page.getByRole("heading", { name: "Today's Gold Rates" })).toBeVisible();
    await expect(page.getByText("Rs. 40,000").first()).toBeVisible();

    // Reloading must not show the gate again for the same business day.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Set Today's Gold Rates" })).toHaveCount(0);

    // Gold value calculator produces a server-verified result for 24K.
    await expect(page.getByText("Gold Value Calculator")).toBeVisible();
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "24K Gold" }).click();
    await expect(page.getByText("Rs. 420,000")).toBeVisible({ timeout: 5_000 });

    // Gold rate history shows the entry we just created.
    await page.goto("/settings/gold-rates/history");
    await expect(page.getByRole("cell", { name: "Rs. 40,000" }).first()).toBeVisible();

    // Log out returns to the login screen and re-protects the dashboard.
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Zarghoon Owner|owner@zarghoonjewellers.com/i }).click();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("invalid credentials show an error and do not create a session", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(OWNER_EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });
});
