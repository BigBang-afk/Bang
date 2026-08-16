import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Users,
  Hammer,
  Truck,
  Receipt,
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
    status: "soon",
    description: "Point-of-sale billing with live gold pricing.",
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Boxes,
    status: "soon",
    description: "Jewelry stock, barcoding, and item-level valuation.",
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
    status: "soon",
    description: "Customer CRM, ledgers, and loyalty tracking.",
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
    label: "Sales",
    href: "/sales",
    icon: Receipt,
    status: "soon",
    description: "Sales history and professional invoicing.",
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
