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

async function addStockItem(page: import("@playwright/test").Page, productName: string) {
  await page.goto("/inventory/add");
  await page.getByLabel("Product Name").fill(productName);
  await page.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: "Rings", exact: true }).click();
  await page.getByLabel("Net Weight (grams)").fill("10");
  await page.getByLabel("Gold Rate (per gram)").fill("40000");
  await page.getByLabel("Wastage %").fill("5");
  await page.getByLabel("Selling Price").fill("500000");
  await expect(page.getByText("Rs. 420,000").first()).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: "Save Stock" }).click();
  await page.waitForURL(/\/inventory\/[0-9a-f-]{36}$/, { timeout: 10_000 });
}

test.describe("Zarghoon Jewellers — Phase 3 POS flow", () => {
  test("owner can search a product, complete a cash sale, and see it in Sales History", async ({ page }) => {
    const productName = `E2E POS Ring ${Date.now()}`;

    await login(page);
    await addStockItem(page, productName);

    await page.goto("/pos");
    await expect(page.getByPlaceholder(/Scan barcode or search/)).toBeVisible();

    await page.getByPlaceholder(/Scan barcode or search/).fill(productName);
    await page.locator("button", { hasText: productName }).first().click();

    // Item is now in the cart and the live server-side preview has run.
    await expect(page.getByText("Rs. 500,000").first()).toBeVisible({ timeout: 5_000 });

    await page.getByPlaceholder("Amount").fill("500000");

    const completeButton = page.getByRole("button", { name: /Complete Sale/ });
    await expect(completeButton).toBeEnabled({ timeout: 5_000 });
    await completeButton.click();

    await expect(page.getByRole("heading", { name: "Sale completed" })).toBeVisible({ timeout: 10_000 });
    const invoiceText = await page.getByText(/^ZJ-INV-\d{6,}$/).innerText();

    await page.getByRole("button", { name: "View invoice" }).click();
    await page.waitForURL(/\/pos\/sales\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: invoiceText })).toBeVisible();
    await expect(page.getByText(productName, { exact: true })).toBeVisible();
    await expect(page.getByText("Completed")).toBeVisible();
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();

    await page.goto("/pos/sales");
    await page.getByPlaceholder(/Search invoice number/).fill(invoiceText);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByText(invoiceText)).toBeVisible({ timeout: 5_000 });
  });

  test("scanning an already-sold item's barcode is rejected", async ({ page }) => {
    const productName = `E2E Sold Ring ${Date.now()}`;
    await login(page);
    await addStockItem(page, productName);

    const barcodeCode = (await page.locator("p.font-mono").first().innerText()).trim();

    // Sell it once via the POS.
    await page.goto("/pos");
    await page.getByPlaceholder(/Scan barcode or search/).fill(productName);
    await page.locator("button", { hasText: productName }).first().click();
    await expect(page.getByText("Rs. 500,000").first()).toBeVisible({ timeout: 5_000 });
    await page.getByPlaceholder("Amount").fill("500000");
    const completeButton = page.getByRole("button", { name: /Complete Sale/ });
    await expect(completeButton).toBeEnabled({ timeout: 5_000 });
    await completeButton.click();
    await expect(page.getByRole("heading", { name: "Sale completed" })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "New sale" }).click();

    // Scanning the same barcode again must be rejected, not silently added.
    await page.getByPlaceholder(/Scan barcode or search/).fill(barcodeCode);
    await page.getByPlaceholder(/Scan barcode or search/).press("Enter");
    await expect(page.getByText(new RegExp(`No matching item found|not available for sale`))).toBeVisible({
      timeout: 5_000,
    });
  });

  test("applying a discount reduces the grand total, and the resulting invoice prints and downloads as a real PDF", async ({
    page,
  }) => {
    const productName = `E2E Discount Ring ${Date.now()}`;
    await login(page);
    await addStockItem(page, productName);

    await page.goto("/pos");
    await page.getByPlaceholder(/Scan barcode or search/).fill(productName);
    await page.locator("button", { hasText: productName }).first().click();
    await expect(page.getByText("Rs. 500,000").first()).toBeVisible({ timeout: 5_000 });

    await page.getByRole("combobox", { name: "Discount type" }).click();
    await page.getByRole("option", { name: "% off" }).click();
    await page.getByPlaceholder("Discount").fill("10");

    // Grand total in the Totals card drops to 450,000 once the server-side
    // preview recalculates the discount.
    await expect(page.getByText("Rs. 450,000").first()).toBeVisible({ timeout: 5_000 });

    await page.getByPlaceholder("Amount").fill("450000");
    const completeButton = page.getByRole("button", { name: /Complete Sale/ });
    await expect(completeButton).toBeEnabled({ timeout: 5_000 });
    await completeButton.click();
    await expect(page.getByRole("heading", { name: "Sale completed" })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "View invoice" }).click();
    await page.waitForURL(/\/pos\/sales\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Rs. 450,000").first()).toBeVisible();

    await page.getByRole("link", { name: "Print" }).click();
    await page.waitForURL(/\/pos\/sales\/[0-9a-f-]{36}\/invoice$/);
    await expect(page.getByText(productName).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Print Invoice" })).toBeVisible();

    const pdfLink = await page.getByRole("link", { name: "Download PDF" }).getAttribute("href");
    const pdfResponse = await page.request.get(pdfLink!);
    expect(pdfResponse.ok()).toBe(true);
    expect(pdfResponse.headers()["content-type"]).toBe("application/pdf");
    const body = await pdfResponse.body();
    expect(body.length).toBeGreaterThan(500);
    expect(body.subarray(0, 5).toString("utf-8")).toBe("%PDF-");
  });
});
