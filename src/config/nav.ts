import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Users,
  Hammer,
  Truck,
  ScrollText,
  Wallet,
  BarChart3,
  Megaphone,
  Sparkles,
  Settings,
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
    status: "soon",
    description: "Artisan management and job-work tracking.",
  },
  {
    label: "Purchases",
    href: "/purchases",
    icon: Truck,
    status: "soon",
    description: "Supplier purchases and incoming stock.",
  },
  {
    label: "Gold Ledger",
    href: "/gold-ledger",
    icon: ScrollText,
    status: "soon",
    description: "Gold-weight accounting across the business.",
  },
  {
    label: "Cash Management",
    href: "/cash-management",
    icon: Wallet,
    status: "soon",
    description: "Cash in/out, till reconciliation, and expenses.",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    status: "soon",
    description: "Profit & loss and operational reporting.",
  },
  {
    label: "Marketing",
    href: "/marketing",
    icon: Megaphone,
    status: "soon",
    description: "WhatsApp automation and AI marketing campaigns.",
  },
  {
    label: "AI Assistant",
    href: "/ai-assistant",
    icon: Sparkles,
    status: "soon",
    description: "Conversational business assistant.",
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
