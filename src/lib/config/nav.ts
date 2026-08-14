import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Calculator,
  CandlestickChart,
  CreditCard,
  Eye,
  Gauge,
  LayoutDashboard,
  LineChart,
  ScanSearch,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const dashboardNav: NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard, description: "Your trading snapshot" },
  { title: "Markets", href: "/dashboard/markets", icon: Activity, description: "Browse tracked markets" },
  { title: "Scanner", href: "/dashboard/scanner", icon: ScanSearch, description: "Screen for opportunities" },
  { title: "Charts", href: "/dashboard/charts", icon: CandlestickChart, description: "Interactive price charts" },
  { title: "AI Analysis", href: "/dashboard/ai-analysis", icon: Sparkles, description: "AI-generated market analysis" },
  { title: "Setups", href: "/dashboard/setups", icon: LineChart, description: "Entry, stop-loss & take-profit" },
  { title: "Risk Calculator", href: "/dashboard/risk-calculator", icon: Calculator, description: "Position sizing & risk" },
  { title: "Watchlist", href: "/dashboard/watchlist", icon: Eye, description: "Assets you're tracking" },
  { title: "Trade Journal", href: "/dashboard/journal", icon: BookOpen, description: "Log & review your trades" },
  { title: "Performance", href: "/dashboard/performance", icon: BarChart3, description: "Track your results" },
  { title: "Subscription", href: "/dashboard/subscription", icon: CreditCard, description: "Manage your plan" },
  { title: "Settings", href: "/dashboard/settings", icon: Settings, description: "Account preferences" },
];

export const adminNav: NavItem[] = [
  { title: "Overview", href: "/admin", icon: Gauge, description: "Platform health at a glance" },
  { title: "Users", href: "/admin/users", icon: Users, description: "Manage user accounts" },
  { title: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard, description: "Manage subscriptions" },
  { title: "Plans", href: "/admin/plans", icon: ShieldCheck, description: "Configure pricing plans" },
  { title: "Usage Stats", href: "/admin/usage", icon: BarChart3, description: "Platform usage statistics" },
  { title: "System Status", href: "/admin/system-status", icon: Activity, description: "Service health" },
  { title: "AI Usage", href: "/admin/ai-usage", icon: Sparkles, description: "Monitor AI consumption" },
  { title: "Market Data", href: "/admin/market-data", icon: CandlestickChart, description: "Market data feed status" },
  { title: "Audit Logs", href: "/admin/audit-logs", icon: AlertTriangle, description: "Sensitive action history" },
  { title: "Settings", href: "/admin/settings", icon: Settings, description: "Platform configuration" },
];
