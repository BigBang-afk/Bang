# Zarghoon Jewelry Pro

A jewelry shop management system built with **C# Windows Forms (.NET 8)** and
**MySQL**. Built module by module — do not skip ahead.

## Roadmap

### Version 1 — MVP (building now)
1. Project setup + Database connection + Login ✅
2. Dashboard ✅
3. **Customer form** ← you are here
4. Stock form
5. Sales billing
6. Repair form
7. Cash in/out
8. Reports
9. Print receipt
10. Backup

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
