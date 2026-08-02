# Zarghoon Jewellers — Private Cloud POS

A private, gold-themed point-of-sale web app for Zarghoon Jewellers.

## Features

- **Private login** — the site is gated behind a username/password screen and is not indexed by search engines.
- **Daily gold rate prompt** — the first time you log in each day you're asked to confirm or update the **21 Karat** gold rate per gram (or per tola). 18K/22K/24K rates auto-derive from it, or can be set independently. The rate is fully editable anytime from **Settings → Gold Rate Management**, and from the sidebar / dashboard shortcut.
- **Point of Sale** — searchable product grid, cart, customer + payment details, discounts, and a printable invoice/receipt. Prices are calculated live from weight, karat, making charges and stone charges against the current gold rate.
- **Inventory management** — add/edit/delete jewellery items (SKU, category, karat, weight, making charge, stock).
- **Sales history** — browse past invoices with line-item breakdowns, filterable by today/week/all.
- **Dashboard** — today's rate, today's revenue, inventory value, low-stock alerts, 7-day revenue chart, recent transactions.
- **Settings** — shop info, currency symbol, gold rates, change password, reset data.

## Getting started

```bash
npm install
npm run dev
```

Default login: `admin` / `zarghoon123` (change it under Settings → Account Security after signing in).

## Notes

Data (products, sales, rates, settings) is stored locally in the browser via `localStorage`, so this runs entirely client-side with no backend required. For multi-device / multi-user syncing, wire the stores in `src/store/` up to a real backend API.
