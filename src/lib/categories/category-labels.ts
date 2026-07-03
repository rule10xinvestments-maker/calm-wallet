import { t, type SupportedLocale } from "@/lib/i18n";

export type CategoryLabelInput = {
  id?: string | null;
  slug?: string | null;
  label?: string | null;
};

const categoryKeyByNormalizedValue: Record<string, string> = {
  housing: "housing",
  rent: "housing",
  groceries: "groceries",
  grocery: "groceries",
  food: "groceries",
  dining: "dining",
  transport: "transport",
  transportation: "transport",
  utilities: "utilities",
  utility: "utilities",
  health: "health",
  shopping: "shopping",
  personal: "personal",
  entertainment: "entertainment",
  travel: "travel",
  education: "education",
  salary: "salary",
  "self employment": "selfEmployment",
  self_employment: "selfEmployment",
  refunds: "refunds",
  refund: "refunds",
  gifts: "gifts",
  gift: "gifts",
  transfers: "transfers",
  transfer: "transfers",
  investments: "investments",
  investment: "investments",
  "investment income": "investments",
  investment_income: "investments",
  sales: "sales",
  sale: "sales",
  "rental income": "rentalIncome",
  rental_income: "rentalIncome",
  "side income": "sideIncome",
  side_income: "sideIncome",
  other: "other",
  uncategorized: "uncategorized",
  "needs category": "needsCategory",
  "needs-category": "needsCategory",
};

function normalizeCategoryLabelSource(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^manual-default-/, "")
    .replace(/^category-/, "")
    .replace(/^cat-/, "")
    .replace(/[_/]+/g, " ")
    .replace(/[\u2013\u2014-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function getCategoryLabelKey(categoryIdOrName: string | null | undefined) {
  if (!categoryIdOrName) {
    return null;
  }

  const normalized = normalizeCategoryLabelSource(categoryIdOrName);
  const compact = normalized.replace(/\s+/g, "_");
  const key = categoryKeyByNormalizedValue[normalized] ?? categoryKeyByNormalizedValue[compact];

  return key ? `categories.${key}` : null;
}

export function getCategoryLabel(categoryIdOrName: string | null | undefined, locale?: SupportedLocale | string | null, fallback?: string | null) {
  const key = getCategoryLabelKey(categoryIdOrName);

  if (!key) {
    return fallback ?? categoryIdOrName ?? "";
  }

  return t(key, locale);
}

export function getCategoryDisplayLabel(category: CategoryLabelInput | null | undefined, locale?: SupportedLocale | string | null) {
  if (!category) {
    return getCategoryLabel("uncategorized", locale);
  }

  return getCategoryLabel(category.slug ?? category.label ?? category.id ?? null, locale, category.label ?? category.slug ?? category.id ?? "");
}
