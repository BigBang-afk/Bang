# Zarghoon Jewellers - Account & Ledger Management Software

A complete, offline desktop application for managing a jewelry shop's cash and
gold accounts, built with **WPF (.NET 8)** and a local **SQLite** database.
No internet connection or external server is required to run it.

---

## 1. What you get

- A full Visual Studio solution you can open and run with `F5`.
- An offline SQLite database created automatically on first run.
- 9 screens: Dashboard, Cash In, Cash Out, Gold In, Gold Out, Karigar Ledger,
  Karigar Management, Reports, Settings.
- Professional A4 printing for the Karigar Ledger and the Reports screen
  (also usable as PDF export - see section 6).

---

## 2. Opening the project in Visual Studio

1. Install **Visual Studio 2022** (Community edition is fine) with the
   **".NET desktop development"** workload. This installs the .NET 8 SDK and
   the WPF designer.
2. Double-click **`ZarghoonJewellers.sln`** at the root of this folder. Visual
   Studio opens the solution with a single project, `ZarghoonJewellers.App`.
3. Visual Studio will automatically restore the one NuGet package the project
   needs (`Microsoft.Data.Sqlite`) the first time you build. If it doesn't,
   right-click the solution in **Solution Explorer** and choose
   **"Restore NuGet Packages"**.
4. Press **F5** (or the green ▶ "ZarghoonJewellers" button) to build and run.

That's it - no database server, no manual configuration.

---

## 3. Project structure (where everything lives)

```
ZarghoonJewellers.sln
src/
  ZarghoonJewellers.App/                 <- the only project in the solution
    ZarghoonJewellers.App.csproj
    App.xaml / App.xaml.cs               <- app startup, creates the database on first run
    Models/                              <- plain C# classes describing the data
      Karigar.cs
      TransactionType.cs                 <- enum: In / Out
      CashTransaction.cs
      GoldTransaction.cs
      AppSettings.cs
      LedgerEntry.cs                     <- one row of a Karigar's combined ledger
      KarigarSummary.cs                  <- Payable/Receivable totals for one Karigar
      DashboardSummary.cs                <- shop-wide dashboard totals
    Data/                                <- SQLite plumbing
      DatabasePaths.cs                   <- where the .db file lives
      SqliteConnectionFactory.cs         <- opens a ready-to-use connection
      DatabaseInitializer.cs             <- creates tables + seeds default settings
    Repositories/                        <- all CRUD / SQL lives here
      KarigarRepository.cs
      CashTransactionRepository.cs
      GoldTransactionRepository.cs
      SettingsRepository.cs
      LedgerRepository.cs                <- combines the above into ledgers/reports
    Services/
      ReportPrintService.cs              <- builds the A4 print documents
    Helpers/
      DateRangeHelper.cs                 <- Today / This Month presets
      Formatting.cs                      <- consistent number formatting
    Resources/
      Styles.xaml                        <- colors, card style, buttons, DataGrid, inputs
    Views/                               <- one screen per file (XAML + code-behind)
      MainWindow.xaml(.cs)               <- sidebar shell
      DashboardView.xaml(.cs)
      CashTransactionView.xaml(.cs)      <- used for BOTH Cash In and Cash Out
      GoldTransactionView.xaml(.cs)      <- used for BOTH Gold In and Gold Out
      KarigarLedgerView.xaml(.cs)
      KarigarManagementView.xaml(.cs)
      ReportsView.xaml(.cs)
      SettingsView.xaml(.cs)
      DateFilterBar.xaml(.cs)            <- reusable Today/This Month/Custom date picker
```

If you ever need to add a new screen: create a `UserControl` in `Views/`,
add a button for it in `Views/MainWindow.xaml`, and wire it up in
`Views/MainWindow.xaml.cs` (`Nav_Click`) the same way the existing screens are.

---

## 4. The database

On first launch, the app creates a SQLite file here:

```
%AppData%\ZarghoonJewellers\zarghoon_jewellers.db
```

(typically `C:\Users\<you>\AppData\Roaming\ZarghoonJewellers\zarghoon_jewellers.db`)

Tables created automatically (see `Data/DatabaseInitializer.cs`):

- **Karigars** - `Id, Name, Mobile, Address, Notes, CreatedAt`
- **CashTransactions** - `Id, Date, Type(In/Out), KarigarId, PersonName, Description, Amount, Notes, CreatedAt`
- **GoldTransactions** - `Id, Date, Type(In/Out), KarigarId, PersonName, Weight, Purity, Description, Notes, CreatedAt`
- **Settings** - `Key, Value` (shop name, address, phone, report header/footer)

`CashTransactions.KarigarId` and `GoldTransactions.KarigarId` are foreign
keys to `Karigars.Id`. The "Person / Karigar" field on the Cash/Gold forms is
an editable combo box: pick a registered Karigar to link the transaction to
their ledger, or type a name that isn't a Karigar (e.g. a walk-in customer or
a shop expense) to record it without affecting any Karigar's balance. A
Karigar with existing transactions cannot be deleted, to protect the ledger
from becoming inconsistent.

Because it's a normal file, backing up your shop's data is as simple as
copying that one `.db` file.

---

## 5. Accounting logic

Everything is calculated live from the transaction tables - nothing is
stored as a running total, so edits and deletes are always reflected
correctly everywhere (Dashboard, Karigar Ledger, Reports).

For a Karigar, always from the **shop's point of view**:

```
Gold Receivable = max(Gold Out to Karigar - Gold In from Karigar, 0)
Gold Payable    = max(Gold In from Karigar - Gold Out to Karigar, 0)
Gold Balance    = Gold Receivable - Gold Payable

Cash Receivable = max(Cash Out to Karigar - Cash In from Karigar, 0)
Cash Payable    = max(Cash In from Karigar - Cash Out to Karigar, 0)
Cash Balance    = Cash Receivable - Cash Payable
```

A positive balance means the **Karigar owes the shop** (Receivable); a
negative balance means the **shop owes the Karigar** (Payable). Gold and
cash are always tracked and displayed completely separately.

The Dashboard, Karigar Ledger and Reports screens all support the same
**Today / This Month / All Time / Custom (From-To)** date filter. Whichever
range you choose, every figure and every row on screen is recalculated for
that range only.

---

## 6. Printing A4 reports and exporting to PDF

The **Karigar Ledger** screen and the **Reports** screen each have a
**"Print A4 Report"** button. Clicking it opens the standard Windows Print
dialog with a print-ready, professionally formatted A4 document (shop name,
date range, summary totals, full transaction table, final balances).

To save as a **PDF** instead of printing on paper, choose the built-in
**"Microsoft Print to PDF"** printer in that same dialog (available on all
modern versions of Windows) and click Print - you'll be asked where to save
the `.pdf` file. No extra software or library is required.

---

## 7. Notes for future changes

- All SQL lives in `Repositories/`; the UI never talks to SQLite directly.
- Currency and gold-weight formatting is centralized in `Helpers/Formatting.cs`
  (2 decimals for cash, 3 decimals for gold grams) so it's consistent across
  every screen and every printed report.
- The visual theme (colors, card/button/grid styles) is defined once in
  `Resources/Styles.xaml` - change the colors there to re-brand the whole app.
- Default shop name is **ZARGHOON JEWELLERS**, editable any time from the
  **Settings** screen.
