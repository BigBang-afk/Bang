import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Users,
  Hammer,
  Building2,
  Truck,
  ScrollText,
  Wallet,
  BookUser,
  TrendingUp,
  Sparkles,
  Settings,
  Calculator,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  status: "active" | "soon";
  description?: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, status: "active" },
  {
    label: "POS",
    href: "/pos",
    icon: ShoppingCart,
    status: "active",
    description: "Point-of-sale billing, sales history, and invoices.",
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Boxes,
    status: "active",
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
    status: "active",
    description: "Customer CRM, ledgers, and segmentation.",
  },
  {
    label: "Karigars",
    href: "/karigars",
    icon: Hammer,
    status: "active",
    description: "Artisan management, gold-job tracking, and job-work wastage reconciliation.",
  },
  {
    label: "Suppliers",
    href: "/suppliers",
    icon: Building2,
    status: "active",
    description: "Supplier management and gold/cash positions.",
  },
  {
    label: "Purchases",
    href: "/purchases",
    icon: Truck,
    status: "active",
    description: "Supplier purchases and incoming stock.",
  },
  {
    label: "Gold Ledger",
    href: "/gold-ledger",
    icon: ScrollText,
    status: "active",
    description: "Gold-weight accounting across karigars and suppliers.",
  },
  {
    label: "Cash Management",
    href: "/cash-management",
    icon: Wallet,
    status: "active",
    description: "Cash in/out, till reconciliation, and expenses.",
  },
  {
    label: "Party Ledger",
    href: "/party-ledger",
    icon: BookUser,
    status: "active",
    description: "Combined karigar/supplier gold and cash position.",
  },
  {
    label: "Accounting",
    href: "/accounting",
    icon: Calculator,
    status: "active",
    description: "Financial dashboard, expenses, daily closing, P&L, and financial reports.",
  },
  {
    label: "Business Intelligence",
    href: "/business-intelligence",
    icon: TrendingUp,
    status: "active",
    description: "Executive dashboard, analytics, forecasting, alerts, and multi-branch foundation.",
  },
  {
    label: "AI Marketing",
    href: "/ai-marketing",
    icon: Sparkles,
    status: "active",
    description: "AI-assisted customer segmentation, campaigns, and marketing analytics.",
  },
  { label: "Settings", href: "/settings", icon: Settings, status: "active" },
];

export type SubNavItem = { label: string; href: string };

export const INVENTORY_SUB_NAV: SubNavItem[] = [
  { label: "All Stock", href: "/inventory" },
  { label: "Add Stock", href: "/inventory/add" },
  { label: "Stock Movements", href: "/inventory/movements" },
  { label: "Categories", href: "/inventory/categories" },
  { label: "Barcodes", href: "/inventory/barcodes" },
  { label: "Old Stock", href: "/inventory/old-stock" },
];

export const POS_SUB_NAV: SubNavItem[] = [
  { label: "New Sale", href: "/pos" },
  { label: "Sales History", href: "/pos/sales" },
  { label: "Returns", href: "/pos/returns" },
  { label: "Invoices", href: "/pos/invoices" },
];

export const CUSTOMERS_SUB_NAV: SubNavItem[] = [
  { label: "All Customers", href: "/customers" },
  { label: "Add Customer", href: "/customers/add" },
  { label: "Customer Ledger", href: "/customers/ledger" },
  { label: "VIP Customers", href: "/customers/vip" },
  { label: "Inactive Customers", href: "/customers/inactive" },
  { label: "Customer Segments", href: "/customers/segments" },
];

export const KARIGARS_SUB_NAV: SubNavItem[] = [
  { label: "All Karigars", href: "/karigars" },
  { label: "Add Karigar", href: "/karigars/add" },
  { label: "Karigar Ledger", href: "/karigars/ledger" },
  { label: "Gold With Karigar", href: "/karigars/gold" },
  { label: "Cash With Karigar", href: "/karigars/cash" },
];

export const SUPPLIERS_SUB_NAV: SubNavItem[] = [
  { label: "All Suppliers", href: "/suppliers" },
  { label: "Add Supplier", href: "/suppliers/add" },
  { label: "Supplier Ledger", href: "/suppliers/ledger" },
];

export const PURCHASES_SUB_NAV: SubNavItem[] = [
  { label: "New Purchase", href: "/purchases" },
  { label: "Purchase History", href: "/purchases/history" },
];

export const GOLD_LEDGER_SUB_NAV: SubNavItem[] = [
  { label: "Gold Transactions", href: "/gold-ledger" },
  { label: "Gold With Karigars", href: "/gold-ledger/karigars" },
  { label: "Gold With Suppliers", href: "/gold-ledger/suppliers" },
  { label: "Gold Reconciliation", href: "/gold-ledger/reconciliation" },
];

export const CASH_MANAGEMENT_SUB_NAV: SubNavItem[] = [
  { label: "Cash Transactions", href: "/cash-management" },
  { label: "Cash Payable", href: "/cash-management/payable" },
  { label: "Cash Receivable", href: "/cash-management/receivable" },
  { label: "Cash Reconciliation", href: "/cash-management/reconciliation" },
];

export const ACCOUNTING_SUB_NAV: SubNavItem[] = [
  { label: "Financial Dashboard", href: "/accounting" },
  { label: "Expenses", href: "/accounting/expenses" },
  { label: "Income", href: "/accounting/income" },
  { label: "Daily Closing", href: "/accounting/daily-closing" },
  { label: "Profit & Loss", href: "/accounting/profit-loss" },
  { label: "Cash Report", href: "/accounting/cash-report" },
  { label: "Gold Report", href: "/accounting/gold-report" },
  { label: "Receivables", href: "/accounting/receivables" },
  { label: "Payables", href: "/accounting/payables" },
  { label: "Sales Report", href: "/accounting/sales-report" },
  { label: "Purchase Report", href: "/accounting/purchase-report" },
  { label: "Inventory Valuation", href: "/accounting/inventory-valuation" },
  { label: "Financial Reconciliation", href: "/accounting/reconciliation" },
];

export const BUSINESS_INTELLIGENCE_SUB_NAV: SubNavItem[] = [
  { label: "Executive Dashboard", href: "/business-intelligence" },
  { label: "Sales Analytics", href: "/business-intelligence/sales" },
  { label: "Profit Analytics", href: "/business-intelligence/profit" },
  { label: "Inventory Analytics", href: "/business-intelligence/inventory" },
  { label: "Gold Analytics", href: "/business-intelligence/gold" },
  { label: "Customer Analytics", href: "/business-intelligence/customers" },
  { label: "Karigar Analytics", href: "/business-intelligence/karigars" },
  { label: "Supplier Analytics", href: "/business-intelligence/suppliers" },
  { label: "Cash Analytics", href: "/business-intelligence/cash" },
  { label: "Marketing Analytics", href: "/business-intelligence/marketing" },
  { label: "Forecasting", href: "/business-intelligence/forecasting" },
  { label: "Alerts", href: "/business-intelligence/alerts" },
  { label: "Daily Report", href: "/business-intelligence/reports/daily" },
  { label: "Weekly Report", href: "/business-intelligence/reports/weekly" },
  { label: "Monthly Report", href: "/business-intelligence/reports/monthly" },
  { label: "Branch Management", href: "/business-intelligence/branches" },
];

export const AI_MARKETING_SUB_NAV: SubNavItem[] = [
  { label: "AI Dashboard", href: "/ai-marketing" },
  { label: "Campaigns", href: "/ai-marketing/campaigns" },
  { label: "Customers to Contact", href: "/ai-marketing/customers-to-contact" },
  { label: "AI Message Generator", href: "/ai-marketing/message-generator" },
  { label: "Product Marketing", href: "/ai-marketing/product-marketing" },
  { label: "Customer Insights", href: "/ai-marketing/customer-insights" },
  { label: "Follow-Ups", href: "/ai-marketing/follow-ups" },
  { label: "Marketing Analytics", href: "/ai-marketing/analytics" },
  { label: "Automation Rules", href: "/ai-marketing/automation-rules" },
  { label: "AI Assistant", href: "/ai-marketing/assistant" },
  { label: "Settings", href: "/ai-marketing/settings" },
];
