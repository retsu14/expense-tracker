import {
  ChartPie,
  House,
  type LucideIcon,
  ReceiptText,
  Settings,
  Target,
  Wallet,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const primaryNav: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/activity", label: "Activity", icon: ReceiptText },
  { href: "/plan", label: "Plan", icon: Target },
  { href: "/insights", label: "Insights", icon: ChartPie },
];

export const secondaryNav: NavItem[] = [
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
