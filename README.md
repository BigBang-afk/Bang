# Zarghoon Jewelry Pro

A jewelry shop management system built with **C# Windows Forms (.NET 8)** and
**MySQL**. Built module by module — do not skip ahead.

## Roadmap

### Version 1 — MVP (building now)
1. Project setup + Database connection + Login ✅
2. **Dashboard** ← you are here
3. Customer form
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
