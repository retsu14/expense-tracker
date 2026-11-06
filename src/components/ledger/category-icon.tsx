import {
  Baby,
  Briefcase,
  Bus,
  CircleDollarSign,
  Clapperboard,
  Coffee,
  Coins,
  Dumbbell,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  type LucideIcon,
  PartyPopper,
  PawPrint,
  Percent,
  Plane,
  Repeat,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Users,
  Utensils,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";

export const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  bus: Bus,
  fuel: Fuel,
  zap: Zap,
  home: House,
  wifi: Wifi,
  "shopping-bag": ShoppingBag,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  users: Users,
  clapperboard: Clapperboard,
  repeat: Repeat,
  sparkles: Sparkles,
  gift: Gift,
  percent: Percent,
  coffee: Coffee,
  plane: Plane,
  "paw-print": PawPrint,
  baby: Baby,
  dumbbell: Dumbbell,
  smartphone: Smartphone,
  briefcase: Briefcase,
  laptop: Laptop,
  store: Store,
  "party-popper": PartyPopper,
  coins: Coins,
  "rotate-ccw": RotateCcw,
  wallet: Wallet,
  "circle-dollar-sign": CircleDollarSign,
};

type CategoryIconProps = {
  icon: string | null;
  color: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: "size-8 [&_svg]:size-4",
  md: "size-10 [&_svg]:size-5",
  lg: "size-12 [&_svg]:size-6",
};

export function CategoryIcon({ icon, color, size = "md", className }: CategoryIconProps) {
  const Icon = (icon ? ICONS[icon] : undefined) ?? CircleDollarSign;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: `${color ?? "#9AA5B1"}33`, color: color ?? "#9AA5B1" }}
    >
      <Icon />
    </span>
  );
}
