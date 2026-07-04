# Zarghoon Jewelry Pro

A jewelry shop management system built with **C# Windows Forms (.NET 8)** and
**MySQL**. Built module by module — do not skip ahead.

## Roadmap

### Version 1 — MVP
1. Project setup + Database connection + Login ✅
2. Dashboard ✅
3. Customer form ✅
4. Stock form ✅
5. Sales billing ✅
6. Repair form ✅
7. Cash in/out ✅
8. Reports ✅
9. Print receipt ✅
10. Backup ✅

The full MVP is done. Settings (a later "Module 15" in the original feature
list) is not part of the MVP list above, so its Dashboard button still shows
"Coming Soon".

### Version 2 — Added after MVP works
- Old gold exchange
- Supplier ledger
- Barcode
- Charts
- Staff permissions
- Advanced reports
- Multi-branch

---

## Prerequisites (install these once)

1. **Visual Studio 2022** (Community edition is fine) with the
   **".NET desktop development"** workload checked during install.
2. **.NET 8 SDK** — Visual Studio 2022 (17.8+) installs this automatically
   with the desktop workload.
3. **XAMPP** or **WAMP** (gives you MySQL Server + phpMyAdmin), OR a
   standalone MySQL Server + phpMyAdmin install.

---

## Troubleshooting: "Database error" / "unable to connect"

Every form shows a specific, actionable message for this now (via
`DatabaseHelper.GetFriendlyErrorMessage` in `Data/DatabaseHelper.cs`) instead of
a raw driver error. What it means and how to fix it:

| Message says | Cause | Fix |
|---|---|---|
| "Cannot reach the MySQL server at ..." | MySQL isn't running, or `Server`/`Port` in `DbConfig.cs` is wrong | Start MySQL (e.g. in the XAMPP/WAMP control panel, click Start next to MySQL until it's green). Confirm the port — default is `3306`. |
| "MySQL rejected the login" | Wrong `UserId`/`Password` in `DbConfig.cs` | Match whatever you use to log into phpMyAdmin. Fresh XAMPP installs use `root` with an empty password (`""`). |
| "The database 'zarghoon_jewelry' does not exist yet" | You haven't run the SQL scripts | Open phpMyAdmin → SQL tab → run `Database/01_schema_users.sql`, then `02`, `03`, `04`, in order. |
| "A required table is missing" | Only some SQL scripts were run | Re-run the remaining scripts in `Database/`, in numeric order. |

If you still see a generic "Database error: ..." message, the exact text after
"Raw error:" tells you precisely what MySQL said — copy that if you need to ask
for help.

---

## Module 1: Project Setup + Database Connection + Login Form

### What's in this module
- `ZarghoonJewelryPro.sln` — the Visual Studio solution
- `ZarghoonJewelryPro/` — the WinForms project (Program.cs, Data/, Forms/)
- `Database/01_schema_users.sql` — creates the database + `users` table
- A working **Login screen** connected to MySQL with SHA-256 password hashing

### Files and what they do

| File | Purpose |
|---|---|
| `Database/01_schema_users.sql` | Run once in phpMyAdmin. Creates `zarghoon_jewelry` database and `users` table with a default admin account. |
| `ZarghoonJewelryPro/Data/DbConfig.cs` | **Edit this file** to put in your own MySQL server/username/password. |
| `ZarghoonJewelryPro/Data/DatabaseHelper.cs` | Opens a MySQL connection using `DbConfig`. Every future form will call this. |
| `ZarghoonJewelryPro/Data/PasswordHelper.cs` | Turns a plain-text password into a SHA-256 hash so we never store real passwords. |
| `ZarghoonJewelryPro/Forms/frmLogin.Designer.cs` | **Design code** — control declarations, positions, sizes (auto-generated style, do not hand-edit in VS; the Designer view edits this file for you). |
| `ZarghoonJewelryPro/Forms/frmLogin.cs` | **Program code** — what happens when you click Login/Exit. |
| `ZarghoonJewelryPro/Program.cs` | The app's entry point. Opens `frmLogin` first. |

### Step-by-step setup

**1. Create the database**
- Open phpMyAdmin (e.g. `http://localhost/phpmyadmin`).
- Click the **SQL** tab.
- Open `Database/01_schema_users.sql` from this repo, copy all of it, paste it into the SQL box, click **Go**.
- You should now see a `zarghoon_jewelry` database with one table, `users`, containing one row (`admin`).

**2. Open the project**
- Clone/download this repo.
- Double-click `ZarghoonJewelryPro.sln` — it opens in Visual Studio.
- In **Solution Explorer**, expand `ZarghoonJewelryPro` → `Data` → open `DbConfig.cs`.

**3. Set your MySQL credentials**
- In `DbConfig.cs`, edit these lines to match your own MySQL setup (defaults work for a fresh XAMPP install: server `localhost`, user `root`, empty password):
  ```csharp
  public const string Server = "localhost";
  public const string Port = "3306";
  public const string DatabaseName = "zarghoon_jewelry";
  public const string UserId = "root";
  public const string Password = "";
  ```
- Save the file (Ctrl+S).

**4. Restore the MySQL NuGet package**
- Visual Studio will restore the `MySql.Data` package automatically on first build. If it doesn't: right-click the project → **Manage NuGet Packages** → **Restore**.

**5. Build and run**
- Press **F5** (or click ▶ Start).
- The **Zarghoon Jewelry Pro - Login** window should appear.

### How to test Module 1

1. Start MySQL (e.g. via XAMPP Control Panel) before running the app.
2. Run the app (F5). The login window opens.
3. Try logging in with:
   - Username: `admin`
   - Password: `admin123`
   - Expected: a "Login Successful" message box showing "Welcome, Shop Administrator (Admin)!".
4. Try a wrong password → expect red text **"Invalid username or password."**
5. Leave both fields blank and click Login → expect **"Please enter both username and password."**
6. Stop MySQL (e.g. quit XAMPP) and try logging in → expect a **"Database error"** message box (proves try/catch error handling works) instead of the app crashing.
7. Click **Exit** → the application closes.

If all 6 checks behave as described, Module 1 is working correctly.

### Next
Once you confirm Module 1 works on your machine, we'll build **Module 2: Dashboard** — the main menu screen that opens after a successful login and will link to every other module.

---

## Module 2: Dashboard

### What's new in this module
- Login now opens a **Dashboard** window on success instead of a message box.
- The Dashboard shows the shop name, who is logged in, a live clock, and a
  grid of navigation buttons for every MVP module.
- Buttons for modules that don't exist yet (everything except Dashboard)
  show a "Coming Soon" message telling you which module number will add it.
  As each module is built, its button will be wired to open the real form.

### Files added

| File | Purpose |
|---|---|
| `ZarghoonJewelryPro/Forms/frmDashboard.Designer.cs` | **Design code** — header panel (shop name, logged-in user, clock), menu panel with 8 navigation buttons, footer with Logout. |
| `ZarghoonJewelryPro/Forms/frmDashboard.cs` | **Program code** — starts the live clock, shows "Coming Soon" for unbuilt modules, confirms and handles Logout. |

`ZarghoonJewelryPro/Forms/frmLogin.cs` was also updated: on a successful login it now hides the Login window and opens `frmDashboard` (passing the user's full name and role) instead of showing a message box. Logging out closes the Dashboard and brings the Login window back.

### Where everything is
- No new files to create by hand — everything is already in the repo at the paths above.
- Nothing to change in `DbConfig.cs` for this module (Dashboard doesn't touch the database yet).

### How to test Module 2

1. Pull the latest code and rebuild (F5).
2. Log in with `admin` / `admin123`.
   - Expected: the Login window disappears and a **Dashboard** window opens, showing "Zarghoon Jewelry Pro" in the header, "Logged in as: Shop Administrator (Admin)", and a live clock that updates every second.
3. Click each of the 8 buttons (Customers, Stock / Inventory, Sales Billing, Repairs, Cash In / Out, Reports, Settings, Backup & Restore).
   - Expected: each shows a "Coming Soon" message box naming the module that will replace it.
4. Click **Logout** → confirm **Yes**.
   - Expected: the Dashboard closes and the Login window reappears with empty fields.
5. Click Logout again but choose **No** on the confirmation.
   - Expected: the Dashboard stays open.
6. Close the app entirely from the Login screen's **Exit** button.

If all 6 checks behave as described, Module 2 is working correctly.

### Next
Once you confirm Module 2 works, we'll build **Module 3: Customer form** — full CRUD (save/update/delete/search/clear) backed by a new `customers` table, with `txtCustomerName`-style controls and a `dgvCustomers` grid.

---

## Module 3: Customer form

### What's new in this module
- A new `customers` table.
- A full CRUD **Customer Management** screen: save, update, delete, search, and clear, backed by a `DataGridView` (`dgvCustomers`).
- The Dashboard's **Customers** button now opens this form instead of showing "Coming Soon".

### Files added

| File | Purpose |
|---|---|
| `Database/02_schema_customers.sql` | Creates the `customers` table. Run this in phpMyAdmin (same database, `zarghoon_jewelry`). |
| `ZarghoonJewelryPro/Forms/frmCustomer.Designer.cs` | **Design code** — `txtCustomerName`, `txtPhone`, `txtAddress`, `txtEmail`, `txtSearch`, `btnSearch`, `btnSave`, `btnUpdate`, `btnDelete`, `btnClear`, `btnClose`, and `dgvCustomers`. |
| `ZarghoonJewelryPro/Forms/frmCustomer.cs` | **Program code** — loads/searches customers, save/update/delete with parameterized queries, clicking a grid row fills the form fields for editing. |

`ZarghoonJewelryPro/Forms/frmDashboard.cs` was updated: `btnCustomers_Click` now opens `frmCustomer` with `ShowDialog()` instead of showing the "Coming Soon" message.

### Setup

1. Open phpMyAdmin → select the `zarghoon_jewelry` database → **SQL** tab.
2. Paste the contents of `Database/02_schema_customers.sql` and click **Go**.
   - This adds one new table, `customers`, with no rows yet.
3. Pull the latest code in Visual Studio and rebuild (F5). No changes needed in `DbConfig.cs`.

### How it works
- **Save**: type a name (required) + optional phone/address/email, click **Save** → inserts a new row and refreshes the grid.
- **Click a row in the grid**: the customer's details load into the text boxes above (their `CustomerID` is remembered internally — there's no visible ID box).
- **Update**: after selecting a row and editing the fields, click **Update** → saves changes to that customer. Clicking Update with nothing selected shows a warning instead of updating the wrong row.
- **Delete**: select a row, click **Delete**, confirm Yes/No.
- **Search**: type a name or phone number fragment into `txtSearch`, click **Search** → filters the grid. Search box shows partial matches (SQL `LIKE`) via a parameterized query, so it's injection-safe.
- **Clear**: empties the form fields, clears the grid selection, and reloads the full list.
- **Close**: returns to the Dashboard.

### How to test Module 3

1. From the Dashboard, click **Customers** → the Customer Management window opens (empty grid, since the table has no rows yet).
2. Leave the name blank and click **Save** → expect the warning "Customer name is required."
3. Fill in Name = `Ali Khan`, Phone = `03001234567`, Address = `Main Bazaar`, Email = `ali@example.com`, click **Save** → expect "Customer saved successfully." and the row appears in the grid.
4. Add a second customer, e.g. `Sara Ahmed` / `03111234567`.
5. Click the `Ali Khan` row in the grid → expect the text boxes to fill in with his details.
6. Change his phone number and click **Update** → expect "Customer updated successfully." and the grid shows the new phone number.
7. Click **Clear** → expect all fields empty and the grid still shows both customers.
8. Type `sara` into the search box and click **Search** → expect only Sara's row to show.
9. Click **Search** with an empty search box (after Clear) → expect both customers to show again.
10. Select a row and click **Delete** → confirm **Yes** → expect "Customer deleted successfully." and the row disappears from the grid.
11. Click **Delete** or **Update** with no row selected → expect a warning message instead of an error or crash.
12. Stop MySQL and click **Save** → expect a "Database error" message box, not a crash.
13. Click **Close** → returns to the Dashboard.

If all checks behave as described, Module 3 is working correctly.

### Next
Once you confirm Module 3 works, we'll build **Module 4: Stock / Inventory form** — categories, karat settings, and full CRUD for jewelry items.

---

## Module 4: Stock / Inventory form

### What's new in this module
- Two lookup tables — `categories` and `karats` — pre-filled with common jewelry categories (Ring, Necklace, Bangle, Earring, Chain, Bracelet, Set, Other) and standard karats/purities (24K, 22K, 21K, 18K, 14K). These are simple starter values; a future **Settings** module (Module 15) will let you manage them from the UI. For now, add/edit them directly in phpMyAdmin if needed.
- A `stock` table for jewelry items, linked to `categories` and `karats`.
- A full CRUD **Stock / Inventory Management** screen: save, update, delete, search, and clear, backed by `dgvStock`.
- The Dashboard's **Stock / Inventory** button now opens this form instead of "Coming Soon".

### Files added

| File | Purpose |
|---|---|
| `Database/03_schema_stock.sql` | Creates `categories`, `karats`, and `stock` tables with starter data. Run this in phpMyAdmin (same `zarghoon_jewelry` database). |
| `ZarghoonJewelryPro/Forms/frmStock.Designer.cs` | **Design code** — `txtItemCode`, `txtItemName`, `cboCategory`, `cboKarat`, `txtWeight`, `txtMakingCharges`, `txtQuantity`, `txtSearch`/`btnSearch`, `btnSave`/`btnUpdate`/`btnDelete`/`btnClear`/`btnClose`, and `dgvStock`. |
| `ZarghoonJewelryPro/Forms/frmStock.cs` | **Program code** — loads categories/karats into the dropdowns, loads/searches stock (joined with category and karat names), save/update/delete with parameterized queries and numeric validation, duplicate item-code detection. |

`ZarghoonJewelryPro/Forms/frmDashboard.cs` was updated: `btnStock_Click` now opens `frmStock` with `ShowDialog()`.

### Setup

1. Open phpMyAdmin → select the `zarghoon_jewelry` database → **SQL** tab.
2. Paste the contents of `Database/03_schema_stock.sql` and click **Go**.
   - This adds `categories` (8 rows), `karats` (5 rows), and an empty `stock` table.
3. Pull the latest code in Visual Studio and rebuild (F5).

### How it works
- **Category** and **Karat** are dropdowns (`ComboBox`, locked to list values) populated from the database — you can't mistype them.
- **Weight**, **Making Charges**, and **Quantity** must be valid numbers; invalid input shows a warning instead of crashing or saving garbage data.
- **Item Code** must be unique (e.g. `RING-001`). Trying to save/update with a code that already exists shows "This Item Code already exists" instead of a raw database error.
- **Save / Update / Delete / Search / Clear** behave the same way as the Customer form: click a grid row to load it for editing, Clear resets the form and grid.

### How to test Module 4

1. From the Dashboard, click **Stock / Inventory** → the window opens with an empty grid, and the Category/Karat dropdowns already show your seeded values.
2. Leave everything blank and click **Save** → expect "Item Code and Item Name are required."
3. Fill in Item Code = `RING-001`, Item Name = `Gold Ring`, Category = `Ring`, Karat = `22K`, Weight = `5.5`, Making Charges = `500`, Quantity = `2`, click **Save** → expect "Item saved successfully." and the row appears in the grid with Category/Karat shown as text.
4. Try saving another item with the same Item Code `RING-001` → expect "This Item Code already exists."
5. Type letters into Weight (e.g. `abc`) and click **Save** → expect "Please enter valid numeric values..."
6. Add a second item, e.g. `NECK-001` / `Gold Necklace` / Necklace / 21K / weight 12 / making charges 800 / qty 1.
7. Click the `RING-001` row → fields populate, including the correct Category and Karat selected in the dropdowns.
8. Change its Quantity to `5` and click **Update** → expect "Item updated successfully." and the grid reflects the new quantity.
9. Click **Clear** → all fields reset, dropdowns return to their first item, grid still shows both items.
10. Type `neck` in search and click **Search** → expect only the necklace row.
11. Click **Search** with an empty box → expect both items again.
12. Select a row, click **Delete**, confirm **Yes** → expect "Item deleted successfully." and the row disappears.
13. Click **Update** or **Delete** with nothing selected → expect a warning, not a crash.
14. Click **Close** → returns to the Dashboard.

If all checks behave as described, Module 4 is working correctly.

### Next
Once you confirm Module 4 works, we'll build **Module 5: Sales Billing form** — the item grid, totals, and stock deduction backed by new `sales` and `sales_items` tables.

---

## Module 5: Sales Billing form

### What's new in this module
- `sales` (invoice header) and `sales_items` (invoice lines) tables.
- A **Sales Billing** screen: pick a customer (or "Walk-in Customer"), add jewelry items to an on-screen invoice cart with a live-calculated total, enter the amount received, and see the balance due (or change) update as you type.
- Saving a sale is wrapped in a **database transaction**: the invoice header, every line item, and the stock quantity deductions all succeed together or all roll back together — a mid-save crash or database error can never leave half a sale recorded.
- The Dashboard's **Sales Billing** button now opens this form instead of "Coming Soon". A **Print Receipt** button is on the form already but just shows "Coming in Module 9" for now — it'll be wired up when we build printing.

### Files added

| File | Purpose |
|---|---|
| `Database/04_schema_sales.sql` | Creates `sales` and `sales_items`. Run this in phpMyAdmin (same `zarghoon_jewelry` database). |
| `ZarghoonJewelryPro/Forms/frmSales.Designer.cs` | **Design code** — invoice header (`lblInvoiceNumber`, `lblSaleDate`, `cboCustomer`), item-entry row (`cboItem`, `txtKarat`, `txtWeight`, `txtRatePerGram`, `txtMakingCharges`, `txtQuantity`, `btnAddItem`), the cart grid (`dgvSaleItems`), and totals/actions (`btnRemoveItem`, `lblTotalAmount`, `txtReceivedAmount`, `lblBalanceAmount`, `btnSaveSale`, `btnPrint`, `btnClear`, `btnClose`). |
| `ZarghoonJewelryPro/Forms/frmSales.cs` | **Program code** — builds an in-memory cart (`DataTable`), calculates line totals and running totals live, validates input, and saves everything in one transaction on `btnSaveSale_Click`. |

`ZarghoonJewelryPro/Forms/frmDashboard.cs` was updated: `btnSales_Click` now opens `frmSales` with `ShowDialog()`.

### Setup

1. Open phpMyAdmin → select the `zarghoon_jewelry` database → **SQL** tab.
2. Paste the contents of `Database/04_schema_sales.sql` and click **Go**.
3. Make sure you have at least one item in **Stock** with `Quantity > 0` (from Module 4) — the item dropdown only shows in-stock items.
4. Pull the latest code in Visual Studio and rebuild (F5).

### How it works
- **Invoice # / Date**: shown automatically. The invoice number is a preview (`INV-000001`) based on what the *next* sale ID will be; the real number is finalized from the actual database ID at save time, so it's always correct even if something else changes the count in between.
- **Customer**: dropdown of all customers plus "Walk-in Customer" (no customer record required for a cash sale).
- **Add an item**: pick it from **Item**, its Karat and Weight auto-fill (read-only, taken from Stock). Type today's **Rate/Gram** (gold price changes daily, so this isn't stored) and the **Making Charges** (pre-filled from Stock but editable per sale), set **Qty**, click **Add Item**. It's checked against how many are actually in stock.
- **Line total formula**: `(Weight × Rate/Gram + Making Charges) × Quantity`.
- **Remove Selected Item**: removes a row from the invoice cart (before saving — nothing is written to the database until you click Save Sale).
- **Received / Balance**: type what the customer actually paid; Balance updates live — shown in red as "Due: X" if they owe more, green as "Change: X" if they overpaid.
- **Save Sale**: writes the invoice header, every line item, and reduces `stock.Quantity` for each item sold — all inside one transaction.
- **Clear**: discards the current invoice and starts a fresh one (does not touch anything already saved).

### How to test Module 5

1. Make sure Stock (Module 4) has at least 2 items with quantity > 0, e.g. `RING-001` (qty 2) and `NECK-001` (qty 1) from the Module 4 test.
2. From the Dashboard, click **Sales Billing** → window opens showing an invoice number preview, today's date, and Walk-in Customer selected.
3. Click **Add Item** with nothing selected → expect "Please select an item."
4. Select `RING-001 - Gold Ring` → Karat and Weight auto-fill. Leave Rate/Gram blank and click **Add Item** → expect a validation warning.
5. Enter Rate/Gram = `20000`, Quantity = `1`, click **Add Item** → the item appears in the invoice grid and **Total Amount** updates.
6. Try to add the same item again with Quantity = `5` (more than remaining stock) → expect "Only X in stock for this item."
7. Add the necklace item too (its own rate/making charges), confirm the total updates to include both lines.
8. Type an amount less than the total into **Received** → expect **Balance** to show in red as "Due: ...".
9. Type an amount greater than the total → expect **Balance** to show in green as "Change: ...".
10. Select a row in the invoice grid and click **Remove Selected Item** → row disappears, total recalculates.
11. Click **Print Receipt** → expect "Receipt printing will be added in Module 9."
12. Add at least one item back, set a Received amount, click **Save Sale** → expect a confirmation with the real invoice number, total, received, and balance.
13. Go back to **Stock** (Dashboard → Stock/Inventory) and confirm the quantity for the sold item(s) decreased by the amount sold.
14. Reopen **Sales Billing** and confirm the invoice number preview has advanced, and the sold-out item (if quantity hit 0) no longer appears in the item dropdown.
15. Click **Save Sale** with an empty cart → expect "Please add at least one item to the invoice."
16. Click **Close** → returns to the Dashboard.

If all checks behave as described, Module 5 is working correctly.

---

## Module 6: Repair form

### What's new
- A `repairs` table and a **Repair Management** screen: log an item brought in for repair, track its status through Pending → In Progress → Completed → Delivered (or Cancelled), and record an estimated cost / advance payment.
- Each ticket gets an auto-generated receipt number (`REP-000001`, ...) using the same guaranteed-correct pattern as Sales invoice numbers (placeholder insert → real ID → update).
- Search by customer name, phone, or receipt number.
- The Dashboard's **Repairs** button now opens this form.

### Files added
| File | Purpose |
|---|---|
| `Database/05_schema_repairs.sql` | Creates the `repairs` table. Run in phpMyAdmin. |
| `ZarghoonJewelryPro/Forms/frmRepair.Designer.cs` | Design code — `txtCustomerName`, `txtCustomerPhone`, `txtItemDescription`, `txtWeight`, `txtEstimatedCost`, `txtAdvancePaid`, `cboStatus`, `dtpDeliveryDate`, search box, CRUD buttons, `dgvRepairs`. |
| `ZarghoonJewelryPro/Forms/frmRepair.cs` | Program code — receipt numbering, CRUD, search, status tracking. |

### How to test
1. Dashboard → **Repairs**. Leave Customer Name blank, click **Save** → expect a validation warning.
2. Fill in a customer name, phone, item description (e.g. "Gold ring — resize"), weight, estimated cost, advance paid, pick a status, click **Save** → expect a success message and a new row with a real `REP-` receipt number.
3. Click the row → fields populate. Change Status to "In Progress" and click **Update** → grid reflects the change.
4. Search by phone number → only matching tickets show.
5. Select a row, click **Delete**, confirm → row disappears.
6. Click **Update**/**Delete** with nothing selected → warning, not a crash.

---

## Module 7: Cash In/Out form

### What's new
- A `cash_transactions` table and a **Cash In / Out** screen for logging money in (sales income, etc.) and money out (expenses, withdrawals, ...).
- **Category** is a free-typeable combo box pre-loaded with common suggestions (Sales Income, Expense, Rent, Salary, Owner Withdrawal, ...) — pick one or type your own.
- Running **Total In**, **Total Out**, and **Net Balance** are shown live, computed from every transaction in the database (not just what's on screen).
- The Dashboard's **Cash In / Out** button now opens this form.

### Files added
| File | Purpose |
|---|---|
| `Database/06_schema_cash.sql` | Creates `cash_transactions`. Run in phpMyAdmin. |
| `ZarghoonJewelryPro/Forms/frmCashInOut.Designer.cs` | Design code — `cboType`, `cboCategory`, `txtAmount`, `txtDescription`, search box, CRUD buttons, `dgvCashTransactions`, and the totals row. |
| `ZarghoonJewelryPro/Forms/frmCashInOut.cs` | Program code — CRUD, search, and the running In/Out/Net totals. |

### How to test
1. Dashboard → **Cash In / Out**. Type `0` or leave Amount blank and click **Save** → expect a validation warning.
2. Set Type = `In`, Category = `Sales Income`, Amount = `5000`, click **Save** → row appears, **Total In** and **Net Balance** update.
3. Add an `Out` transaction, e.g. Category = `Rent`, Amount = `2000` → **Total Out** updates, **Net Balance** = In − Out.
4. Click a row, change the amount, click **Update** → totals recalculate.
5. Search by category text → filters the grid (totals stay based on everything, not just the filtered view).
6. Delete a transaction with confirmation → totals adjust.

---

## Module 8: Reports form

### What's new
- A **Reports** screen with four report types: **Sales**, **Cash In / Out**, **Repairs**, and **Customer Ledger** (a specific customer's full invoice history and outstanding balance — this covers the "customer ledger print" requirement).
- Date range filter (defaults to today, so leaving it as-is gives you a same-day "daily report").
- **Export CSV** — writes the current on-screen report to a `.csv` file, which opens directly in Excel (no extra library needed for that).
- **Print / Export PDF** — opens the standard Windows print dialog; choosing the built-in **"Microsoft Print to PDF"** printer there gives you a real PDF without any extra code or NuGet package.
- The Dashboard's **Reports** button now opens this form.

### Files added
| File | Purpose |
|---|---|
| `ZarghoonJewelryPro/Forms/frmReports.Designer.cs` | Design code — `cboReportType`, `dtpFromDate`/`dtpToDate`, `cboCustomer` (shown only for Customer Ledger), `dgvReport`, `lblSummary`, export/print buttons. |
| `ZarghoonJewelryPro/Forms/frmReports.cs` | Program code — one query per report type, CSV export, and a generic `PrintDocument` that prints whatever's in the grid. |

**Note on scope:** CSV *import* (for bulk-loading stock/customers) is not included in this pass — it's a reasonable future addition but was out of scope for the MVP reporting screen itself.

### How to test
1. Dashboard → **Reports**. Report Type defaults to **Sales**, From/To default to today.
2. Click **Generate** → shows today's sales (empty if none yet) with a summary line ("N sale(s) — Total: ...").
3. Switch Report Type to **Cash In / Out**, **Generate** → shows today's cash transactions with In/Out/Net summary.
4. Switch to **Customer Ledger** → a Customer dropdown appears. Pick a customer with past sales, widen the date range if needed, **Generate** → shows their invoices and total outstanding balance.
5. Click **Export CSV**, save the file, open it in Excel — confirm the data matches the grid.
6. Click **Print / Export PDF**, choose "Microsoft Print to PDF" (or any printer) in the dialog → confirm the printed page shows the shop name, report title, and rows.
7. Click **Generate**/**Export**/**Print** with no data → expect warnings, not crashes.

---

## Module 9: Print Receipt

### What's new
- The **Print Receipt** button on the Sales Billing form (previously a "Coming in Module 9" stub) now actually prints, via `PrintDocument` and a `PrintPreviewDialog` so you can see the receipt before committing it to paper.
- Layout includes: shop name, address, phone (from the new `Data/ShopInfo.cs`), invoice number, date, customer, an item table (name, karat, weight, qty, rate, making charges, line total), totals, and a signature line — matching the full receipt requirements.
- Printing is only available for the **last sale you saved** in the current session (you can't print an unsaved/in-progress invoice, since its numbers aren't final yet).

### Files added/changed
| File | Purpose |
|---|---|
| `ZarghoonJewelryPro/Data/ShopInfo.cs` | Shop name/address/phone shown on receipts. Edit these constants for your shop — a future Settings module will make them editable from the UI. |
| `ZarghoonJewelryPro/Forms/frmSales.Designer.cs` | Added a `PrintDocument` component (`printDocumentReceipt`). |
| `ZarghoonJewelryPro/Forms/frmSales.cs` | Snapshots the invoice (items, total, received, balance, customer, invoice #) right after a successful save; `btnPrint_Click` now opens a print preview instead of a stub message. |

### How to test
1. Edit `Data/ShopInfo.cs` with your real shop name/address/phone (optional but recommended).
2. Dashboard → **Sales Billing** → click **Print Receipt** *before* saving anything → expect "Please save the sale first before printing."
3. Add an item, save the sale, then click **Print Receipt** → a print preview window opens showing the shop header, invoice number, date, customer, item table, totals, and a signature line.
4. From the print preview, click the print icon to send it to your default printer (or "Microsoft Print to PDF" to get a PDF) and confirm the layout looks correct.
5. Save a second sale and print again → confirm the new invoice's details show (not the previous one).

---

## Module 10: Backup & Restore

### What's new
- A **Backup & Restore** screen using `mysqldump.exe`/`mysql.exe` (the same tools phpMyAdmin uses internally) via `System.Diagnostics.Process` — no extra NuGet package needed.
- **Backup Now**: choose where to save a `.sql` file containing your entire database.
- **Restore from File**: pick a previously saved `.sql` file and load it back in, after a confirmation (this **overwrites all current data**).
- **Daily Backup Reminder**: the Dashboard now checks on login whether a backup has happened today (tracked in a small `lastbackup.txt` file next to the exe) and reminds you if not.
- The Dashboard's **Backup & Restore** button now opens this form.

### Files added
| File | Purpose |
|---|---|
| `ZarghoonJewelryPro/Data/BackupTracker.cs` | Records/reads the last-backup timestamp for the daily reminder. |
| `ZarghoonJewelryPro/Forms/frmBackup.Designer.cs` | Design code — `btnBackupNow`, `btnRestore`, `txtLog` (shows what happened), `btnClose`. |
| `ZarghoonJewelryPro/Forms/frmBackup.cs` | Runs `mysqldump`/`mysql` as child processes, using `ArgumentList` (not a raw command string) to avoid any shell-injection risk, and the `MYSQL_PWD` environment variable instead of a `-p` flag so the password never appears in the process list. |

`ZarghoonJewelryPro/Data/DbConfig.cs` gained one more setting:
```csharp
public const string MySqlBinPath = @"C:\xampp\mysql\bin\";
```
**Edit this** to match where your MySQL is installed if it's not a default XAMPP setup (e.g. WAMP is typically `C:\wamp64\bin\mysql\mysql8.0.x\bin\`).

### How to test
1. Confirm `DbConfig.MySqlBinPath` points to the folder containing `mysqldump.exe` and `mysql.exe` (for XAMPP, check `C:\xampp\mysql\bin\` exists with those two files).
2. Dashboard → **Backup & Restore** → **Backup Now** → choose a save location → expect "Backup completed successfully" and a `.sql` file at that location with real content (open it in Notepad to confirm it has `CREATE TABLE`/`INSERT` statements).
3. Log out and back in → the "Daily Backup Reminder" should **not** appear again today (since you just backed up).
4. In Stock, add a throwaway test item so you can see it disappear after restore.
5. Click **Restore from File**, confirm the warning, pick the `.sql` file from step 2 → expect "Restore completed successfully," and the throwaway item from step 4 (added *after* the backup) should now be gone, since the backup didn't include it.
6. Temporarily rename `DbConfig.MySqlBinPath` to a wrong path and try **Backup Now** again → expect a clear "Could not find mysqldump.exe" message rather than a crash. Change it back afterward.

---

## What's next (Version 2, after MVP)

The MVP (Modules 1–10) is complete. Natural next steps, in roughly the order they build on what exists:
- **Settings module** — make `DbConfig`-style constants (shop info, gold rate, receipt size, currency, backup path, categories, karats, payment methods, expense categories) editable from the UI and persisted in the database instead of hardcoded.
- **Old gold exchange** — a variant of Sales Billing that takes old gold in as partial payment.
- **Supplier ledger** — mirrors the Customer Ledger report, but for what you owe suppliers.
- **Barcode** — print/scan barcodes for stock items instead of typing Item Codes.
- **Charts** — visual dashboards over the Reports data.
- **Staff permissions** — restrict which modules/actions each `Role` in `users` can access.
- **CSV import** — bulk-load stock/customers from a spreadsheet.
- **Multi-branch** — scope stock/sales/reports to a specific shop location.
