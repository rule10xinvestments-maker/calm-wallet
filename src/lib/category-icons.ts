import {
  ArrowRightLeft,
  BookOpen,
  Briefcase,
  Car,
  Gift,
  HeartPulse,
  House,
  Plane,
  Receipt,
  RotateCcw,
  ShoppingBag,
  ShoppingBasket,
  Tag,
  Ticket,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";

function normalizeCategoryName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");
}

const CATEGORY_ICON_BY_NAME: Record<string, LucideIcon> = {
  housing: House,
  groceries: ShoppingBasket,
  dining: Utensils,
  transport: Car,
  utilities: Receipt,
  health: HeartPulse,
  shopping: ShoppingBag,
  entertainment: Ticket,
  travel: Plane,
  education: BookOpen,
  salary: Wallet,
  "self-employment": Briefcase,
  "self employment": Briefcase,
  refunds: RotateCcw,
  gifts: Gift,
  transfers: ArrowRightLeft,
  other: Tag,
};

export function getCategoryIconByName(labelOrSlug: string): LucideIcon {
  const normalized = normalizeCategoryName(labelOrSlug);
  const exactMatch = CATEGORY_ICON_BY_NAME[normalized];

  if (exactMatch) {
    return exactMatch;
  }

  if (normalized.includes("housing") || normalized.includes("home") || normalized.includes("rent")) {
    return House;
  }

  if (normalized.includes("grocer") || normalized.includes("household")) {
    return ShoppingBasket;
  }

  if (normalized.includes("dining") || normalized.includes("restaurant") || normalized.includes("coffee") || normalized.includes("food")) {
    return Utensils;
  }

  if (normalized.includes("transport") || normalized.includes("taxi") || normalized.includes("car")) {
    return Car;
  }

  if (normalized.includes("utilit") || normalized.includes("bill") || normalized.includes("receipt")) {
    return Receipt;
  }

  if (normalized.includes("health") || normalized.includes("medical")) {
    return HeartPulse;
  }

  if (normalized.includes("shopping")) {
    return ShoppingBag;
  }

  if (normalized.includes("entertain") || normalized.includes("ticket")) {
    return Ticket;
  }

  if (normalized.includes("travel") || normalized.includes("flight") || normalized.includes("plane")) {
    return Plane;
  }

  if (normalized.includes("education") || normalized.includes("school") || normalized.includes("book")) {
    return BookOpen;
  }

  if (normalized.includes("salary") || normalized.includes("income") || normalized.includes("pay")) {
    return Wallet;
  }

  if (normalized.includes("self") || normalized.includes("freelance") || normalized.includes("business")) {
    return Briefcase;
  }

  if (normalized.includes("refund")) {
    return RotateCcw;
  }

  if (normalized.includes("gift")) {
    return Gift;
  }

  if (normalized.includes("transfer")) {
    return ArrowRightLeft;
  }

  return Tag;
}
