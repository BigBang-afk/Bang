import { test, expect } from "@playwright/test";

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@zarghoonjewellers.com";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "ChangeMe123!";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(OWNER_EMAIL);
  await page.getByLabel("Password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe("Zarghoon Jewellers — Phase 2 inventory flow", () => {
  test("owner can add stock, see it in All Stock, view detail, and change status", async ({ page }) => {
    await login(page);

    const productName = `E2E Test Ring ${Date.now()}`;

    await page.goto("/inventory/add");
    await expect(page.getByRole("heading", { name: "Add New Stock" })).toBeVisible();

    await page.getByLabel("Product Name").fill(productName);

    // Category select (Radix combobox)
    await page.getByRole("combobox", { name: "Category" }).click();
    await page.getByRole("option", { name: "Rings", exact: true }).click();

    await page.getByLabel("Net Weight (grams)").fill("10");
    await page.getByLabel("Gold Rate (per gram)").fill("40000");
    await page.getByLabel("Wastage %").fill("5");

    await page.getByLabel("Making Charges").fill("15000");
    await page.getByLabel("Stone Charges").fill("5000");
    await page.getByLabel("Other Charges").fill("2000");
    await page.getByLabel("Selling Price").fill("500000");

    // Wait for the server-verified preview to compute before saving.
    await expect(page.getByText("Rs. 442,000")).toBeVisible({ timeout: 5_000 });

    await page.getByRole("button", { name: "Save Stock" }).click();

    // Redirects to the new item's detail page.
    await page.waitForURL(/\/inventory\/[0-9a-f-]{36}$/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: productName })).toBeVisible();
    await expect(page.getByText(/^ZJ-\d{6,}$/).first()).toBeVisible();
    await expect(page.getByText("Rs. 442,000")).toBeVisible();
    await expect(page.getByText("Rs. 500,000")).toBeVisible();

    const barcodeText = await page.locator("p.font-mono").first().innerText();
    const barcodeCode = barcodeText.trim();
    expect(barcodeCode).toMatch(/^ZJ-\d{6,}$/);

    // Find it again from the All Stock search.
    await page.goto("/inventory");
    await page.getByPlaceholder(/Search barcode, product/).fill(productName);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("link", { name: productName })).toBeVisible();
    await expect(page.getByText(barcodeCode)).toBeVisible();

    // Open detail again and change status IN_STOCK -> RESERVED.
    await page.getByRole("link", { name: productName }).click();
    await page.waitForURL(/\/inventory\/[0-9a-f-]{36}$/);

    await page.getByRole("combobox", { name: "Change status to" }).click();
    await page.getByRole("option", { name: "Reserved" }).click();
    await page.getByRole("button", { name: "Update Status" }).click();

    await expect(page.getByText("Reserved", { exact: true }).first()).toBeVisible({ timeout: 5_000 });

    // Stock history shows both the creation and the status change.
    await expect(page.getByText("Stock created")).toBeVisible();
    await expect(page.getByText("Marked as reserved")).toBeVisible();
  });

  test("barcode print page renders a scannable label without a permission error", async ({ page }) => {
    await login(page);
    await page.goto("/inventory");
    await page.locator('a[title="Print barcode"]').first().click();
    await page.waitForURL(/\/print\/barcode$/);
    await expect(page.locator("svg[aria-label^='Barcode']")).toBeVisible();
    await expect(page.getByRole("button", { name: "Print Barcode" })).toBeVisible();
  });

  test("categories page lists the seeded defaults and can add a new one", async ({ page }) => {
    await login(page);
    await page.goto("/inventory/categories");
    await expect(page.getByRole("cell", { name: "Rings", exact: true })).toBeVisible();

    const categoryName = `E2E Category ${Date.now()}`;
    await page.getByLabel("Category Name").fill(categoryName);
    await page.getByRole("button", { name: "Add Category" }).click();
    await expect(page.getByRole("cell", { name: categoryName })).toBeVisible({ timeout: 5_000 });
  });
});
