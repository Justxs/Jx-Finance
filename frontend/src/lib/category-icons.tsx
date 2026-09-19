import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Briefcase,
  Bus,
  Car,
  Clapperboard,
  Coffee,
  Coins,
  Dumbbell,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Lightbulb,
  PawPrint,
  Phone,
  PiggyBank,
  Plane,
  Shapes,
  ShoppingBag,
  Tag,
  Utensils,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, LucideIcon> = {
  banknote: Banknote,
  briefcase: Briefcase,
  bus: Bus,
  car: Car,
  clapperboard: Clapperboard,
  coffee: Coffee,
  coins: Coins,
  dumbbell: Dumbbell,
  "gamepad-2": Gamepad2,
  gift: Gift,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  home: Home,
  lightbulb: Lightbulb,
  "paw-print": PawPrint,
  phone: Phone,
  "piggy-bank": PiggyBank,
  plane: Plane,
  shapes: Shapes,
  "shopping-bag": ShoppingBag,
  tag: Tag,
  utensils: Utensils,
  wifi: Wifi,
};

export const categoryIconNames = Object.keys(categoryIcons);

interface Props {
  icon?: string | null;
  className?: string;
}

export function CategoryIcon({ icon, className }: Readonly<Props>) {
  const Icon = (icon && categoryIcons[icon]) || Tag;
  return <Icon className={cn("size-4", className)} />;
}
