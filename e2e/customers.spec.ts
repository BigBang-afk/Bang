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

test.describe("Zarghoon Jewellers — Phase 4 Customer CRM flow", () => {
  test("owner can add a customer, see them in the list, and view their profile", async ({ page }) => {
    const uniquePhone = `+92300${Date.now()}`;
    const firstName = `E2E`;
    const lastName = `Customer ${Date.now()}`;

    await login(page);
    await page.goto("/customers/add");
    await page.getByLabel("First Name").fill(firstName);
    await page.getByLabel("Last Name").fill(lastName);
    await page.getByLabel(/^Phone/).fill(uniquePhone);
    await page.getByRole("button", { name: "Save Customer" }).click();

    await page.waitForURL(/\/customers\/[0-9a-f-]{36}$/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: `${firstName} ${lastName}` })).toBeVisible();
    await expect(page.getByText(/ZJC-\d{6,}/)).toBeVisible();

    await page.goto("/customers");
    await page.getByPlaceholder(/Search name, phone/).fill(uniquePhone);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("link", { name: `${firstName} ${lastName}` })).toBeVisible({ timeout: 5_000 });
  });

  test("adding a customer with a matching phone shows the possible-duplicate dialog", async ({ page }) => {
    const uniquePhone = `+92301${Date.now()}`;
    await login(page);

    await page.goto("/customers/add");
    await page.getByLabel("First Name").fill("Original");
    await page.getByLabel(/^Phone/).fill(uniquePhone);
    await page.getByRole("button", { name: "Save Customer" }).click();
    await page.waitForURL(/\/customers\/[0-9a-f-]{36}$/, { timeout: 10_000 });

    await page.goto("/customers/add");
    await page.getByLabel("First Name").fill("Duplicate Attempt");
    await page.getByLabel(/^Phone/).fill(uniquePhone);
    await page.getByRole("button", { name: "Save Customer" }).click();

    await expect(page.getByRole("heading", { name: "Possible duplicate customer" })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("Original")).toBeVisible();
  });

  test("a credit sale posts to the customer ledger, and recording a payment settles the balance", async ({
    page,
  }) => {
    const productName = `E2E Credit Ring ${Date.now()}`;
    const uniquePhone = `+92302${Date.now()}`;

    await login(page);

    // Create a customer directly via Add Customer.
    await page.goto("/customers/add");
    await page.getByLabel("First Name").fill("Credit");
    await page.getByLabel("Last Name").fill(`Buyer ${Date.now()}`);
    await page.getByLabel(/^Phone/).fill(uniquePhone);
    await page.getByRole("button", { name: "Save Customer" }).click();
    await page.waitForURL(/\/customers\/[0-9a-f-]{36}$/, { timeout: 10_000 });
    const profileUrl = page.url();

    await addStockItem(page, productName);

    // Sell it to that customer with a partial (credit) payment.
    await page.goto("/pos");
    await page.getByPlaceholder(/Scan barcode or search/).fill(productName);
    await page.locator("button", { hasText: productName }).first().click();
    await expect(page.getByText("Rs. 500,000").first()).toBeVisible({ timeout: 5_000 });

    await page.getByPlaceholder(/Search customer by name or phone/).fill(uniquePhone);
    const customerResult = page.getByRole("button", { name: /^Credit Buyer/ });
    await expect(customerResult).toBeVisible({ timeout: 5_000 });
    await customerResult.click();

    // Put the whole sale on credit for this customer.
    await page.getByRole("combobox").filter({ hasText: "Cash" }).click();
    await page.getByRole("option", { name: "Credit" }).click();
    await page.getByPlaceholder("Amount").fill("500000");

    const completeButton = page.getByRole("button", { name: /Complete Sale/ });
    await expect(completeButton).toBeEnabled({ timeout: 5_000 });
    await completeButton.click();
    await expect(page.getByRole("heading", { name: "Sale completed" })).toBeVisible({ timeout: 10_000 });

    // Back on the customer's profile, the ledger and balance should reflect it.
    await page.goto(profileUrl);
    await expect(page.getByText("Rs. 500,000").first()).toBeVisible({ timeout: 5_000 });

    await page.getByRole("tab", { name: "Ledger" }).click();
    await expect(page.getByText("Sale", { exact: true }).first()).toBeVisible();

    await page.getByRole("tab", { name: "Payments" }).click();
    await page.getByRole("button", { name: "Receive Payment" }).click();
    await page.getByLabel("Amount").fill("500000");
    await page.getByRole("button", { name: "Record Payment" }).click();
    await expect(page.getByText(/New balance: Rs\. 0/)).toBeVisible({ timeout: 5_000 });
  });

  test("a high-value purchase surfaces the customer on the VIP page; segments, inactive, dashboard, and export all render", async ({
    page,
  }) => {
    const productName = `E2E VIP Ring ${Date.now()}`;
    const uniquePhone = `+92303${Date.now()}`;
    const lastName = `VIP ${Date.now()}`;

    await login(page);

    await page.goto("/customers/add");
    await page.getByLabel("First Name").fill("Highspend");
    await page.getByLabel("Last Name").fill(lastName);
    await page.getByLabel(/^Phone/).fill(uniquePhone);
    await page.getByRole("button", { name: "Save Customer" }).click();
    await page.waitForURL(/\/customers\/[0-9a-f-]{36}$/, { timeout: 10_000 });

    // A big enough sale to clear the default Rs. 2,000,000 VIP threshold.
    await page.goto("/inventory/add");
    await page.getByLabel("Product Name").fill(productName);
    await page.getByRole("combobox", { name: "Category" }).click();
    await page.getByRole("option", { name: "Rings", exact: true }).click();
    await page.getByLabel("Net Weight (grams)").fill("40");
    await page.getByLabel("Gold Rate (per gram)").fill("40000");
    await page.getByLabel("Wastage %").fill("5");
    await page.getByLabel("Selling Price").fill("2100000");
    await page.getByRole("button", { name: "Save Stock" }).click();
    await page.waitForURL(/\/inventory\/[0-9a-f-]{36}$/, { timeout: 10_000 });

    await page.goto("/pos");
    await page.getByPlaceholder(/Scan barcode or search/).fill(productName);
    await page.locator("button", { hasText: productName }).first().click();
    await expect(page.getByText("Rs. 2,100,000").first()).toBeVisible({ timeout: 5_000 });

    await page.getByPlaceholder(/Search customer by name or phone/).fill(uniquePhone);
    const customerResult = page.getByRole("button", { name: /^Highspend/ });
    await expect(customerResult).toBeVisible({ timeout: 5_000 });
    await customerResult.click();

    await page.getByPlaceholder("Amount").fill("2100000");
    const completeButton = page.getByRole("button", { name: /Complete Sale/ });
    await expect(completeButton).toBeEnabled({ timeout: 5_000 });
    await completeButton.click();
    await expect(page.getByRole("heading", { name: "Sale completed" })).toBeVisible({ timeout: 10_000 });

    await page.goto("/customers/vip");
    await expect(page.getByRole("link", { name: `Highspend ${lastName}` })).toBeVisible({ timeout: 5_000 });

    await page.goto("/customers/inactive");
    await expect(page.getByRole("heading", { name: "Inactive Customers" })).toBeVisible();

    await page.goto("/customers/segments");
    await expect(page.getByRole("heading", { name: "Customer Segments" })).toBeVisible();
    await page.locator('a[href="/customers/segments?segment=VIP"]').click();
    await expect(page.getByRole("link", { name: `Highspend ${lastName}` })).toBeVisible({ timeout: 5_000 });

    await page.goto("/customers/ledger");
    await expect(page.getByRole("heading", { name: "Customer Ledger" })).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText("Total Customers")).toBeVisible();
    await expect(page.getByText("Upcoming Birthdays")).toBeVisible();
    await expect(page.getByText("Upcoming Anniversaries")).toBeVisible();

    await page.goto("/customers");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/customers-.*\.csv/);
  });
});
