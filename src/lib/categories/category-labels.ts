import { t, type SupportedLocale } from "@/lib/i18n";

export type CategoryLabelInput = {
  id?: unknown;
  slug?: unknown;
  label?: unknown;
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

const normalizedCategoryCache = new Map<string, string>();
const categoryLabelKeyCache = new Map<string, string | null>();
const categoryTranslationCache = new Map<string, string>();

function stringFromUnknown(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function normalizeCategoryLabelSource(value: unknown) {
  const source = stringFromUnknown(value);

  if (!source) {
    return "";
  }

  const cached = normalizedCategoryCache.get(source);
  if (cached !== undefined) {
    return cached;
  }

  const normalized = source
    .trim()
    .toLowerCase()
    .replace(/^manual-default-/, "")
    .replace(/^category-/, "")
    .replace(/^cat-/, "")
    .replace(/[_/]+/g, " ")
    .replace(/[\u2013\u2014-]+/g, " ")
    .replace(/\s+/g, " ");

  normalizedCategoryCache.set(source, normalized);
  return normalized;
}

export function getCategoryLabelKey(categoryIdOrName: unknown) {
  const source = stringFromUnknown(categoryIdOrName);
  const cached = categoryLabelKeyCache.get(source);
  if (cached !== undefined) {
    return cached;
  }

  const normalized = normalizeCategoryLabelSource(categoryIdOrName);

  if (!normalized) {
    categoryLabelKeyCache.set(source, null);
    return null;
  }

  const compact = normalized.replace(/\s+/g, "_");
  const key = categoryKeyByNormalizedValue[normalized] ?? categoryKeyByNormalizedValue[compact];

  const labelKey = key ? `categories.${key}` : null;
  categoryLabelKeyCache.set(source, labelKey);
  return labelKey;
}

export function getCategoryLabel(categoryIdOrName: unknown, locale?: SupportedLocale | string | null, fallback?: unknown) {
  const key = getCategoryLabelKey(categoryIdOrName);

  if (!key) {
    return stringFromUnknown(fallback) || stringFromUnknown(categoryIdOrName);
  }

  const cacheKey = `${locale ?? ""}|${key}`;
  const cached = categoryTranslationCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const label = t(key, locale);
  categoryTranslationCache.set(cacheKey, label);
  return label;
}

function isCategoryLabelInput(value: unknown): value is CategoryLabelInput {
  return Boolean(value) && typeof value === "object";
}

export function getCategoryDisplayLabel(category: CategoryLabelInput | null | undefined, locale?: SupportedLocale | string | null) {
  if (!category) {
    return getCategoryLabel("uncategorized", locale);
  }

  if (!isCategoryLabelInput(category)) {
    return getCategoryLabel(category, locale);
  }

  return getCategoryLabel(
    stringFromUnknown(category.slug) || stringFromUnknown(category.label) || stringFromUnknown(category.id),
    locale,
    stringFromUnknown(category.label) || stringFromUnknown(category.slug) || stringFromUnknown(category.id),
  );
}
