import {
  ArrowRightLeft,
  BookOpen,
  Briefcase,
  Car,
  CircleHelp,
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

export type CategoryVisuals = {
  icon: LucideIcon;
  primary: string;
  bg: string;
  border: string;
};

function normalizeCategoryName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");
}

export const FALLBACK_CATEGORY_VISUALS: CategoryVisuals = {
  icon: Tag,
  primary: "#64748B",
  bg: "#F1F5F9",
  border: "#CBD5E1",
};

export const CATEGORY_VISUALS_BY_NAME: Record<string, CategoryVisuals> = {
  housing: { icon: House, primary: "#4F46E5", bg: "#EEF2FF", border: "#C7D2FE" },
  groceries: { icon: ShoppingBasket, primary: "#16A34A", bg: "#DCFCE7", border: "#86EFAC" },
  dining: { icon: Utensils, primary: "#E11D48", bg: "#FFE4E6", border: "#FDA4AF" },
  transport: { icon: Car, primary: "#2563EB", bg: "#DBEAFE", border: "#93C5FD" },
  utilities: { icon: Receipt, primary: "#F97316", bg: "#FFEDD5", border: "#FDBA74" },
  health: { icon: HeartPulse, primary: "#8B5CF6", bg: "#EDE9FE", border: "#C4B5FD" },
  shopping: { icon: ShoppingBag, primary: "#EC4899", bg: "#FCE7F3", border: "#F9A8D4" },
  entertainment: { icon: Ticket, primary: "#D97706", bg: "#FEF3C7", border: "#FCD34D" },
  travel: { icon: Plane, primary: "#0EA5E9", bg: "#E0F2FE", border: "#7DD3FC" },
  education: { icon: BookOpen, primary: "#06B6D4", bg: "#CFFAFE", border: "#67E8F9" },
  salary: { icon: Wallet, primary: "#059669", bg: "#D1FAE5", border: "#6EE7B7" },
  "self-employment": { icon: Briefcase, primary: "#92400E", bg: "#FDE68A", border: "#FBBF24" },
  "self employment": { icon: Briefcase, primary: "#92400E", bg: "#FDE68A", border: "#FBBF24" },
  refunds: { icon: RotateCcw, primary: "#65A30D", bg: "#ECFCCB", border: "#BEF264" },
  gifts: { icon: Gift, primary: "#C026D3", bg: "#FAE8FF", border: "#E879F9" },
  transfers: { icon: ArrowRightLeft, primary: "#475569", bg: "#E2E8F0", border: "#CBD5E1" },
  other: { icon: Tag, primary: "#CA8A04", bg: "#FEF9C3", border: "#FDE047" },
  "needs category": { icon: CircleHelp, primary: "#0EA5E9", bg: "#E0F2FE", border: "#7DD3FC" },
  "needs-category": { icon: CircleHelp, primary: "#0EA5E9", bg: "#E0F2FE", border: "#7DD3FC" },
};

export function getCategoryVisualsByName(labelOrSlug: string): CategoryVisuals {
  return CATEGORY_VISUALS_BY_NAME[normalizeCategoryName(labelOrSlug)] ?? FALLBACK_CATEGORY_VISUALS;
}

export function getCategoryIconByName(labelOrSlug: string): LucideIcon {
  return getCategoryVisualsByName(labelOrSlug).icon;
}
