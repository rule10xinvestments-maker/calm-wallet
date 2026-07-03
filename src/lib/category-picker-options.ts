import type { ControlledCategoryOption, TransactionCategoryOption } from "@/lib/server/transactions-read-model";

export type CategoryPickerTransactionType = "expense" | "income";
export type CategoryPickerOption = TransactionCategoryOption & {
  slug?: string;
  isSynthetic?: boolean;
};

export const spendCategoryLabels = [
  "Housing",
  "Groceries",
  "Dining",
  "Transport",
  "Utilities",
  "Health",
  "Shopping",
  "Entertainment",
  "Travel",
  "Education",
  "Gifts",
  "Transfers",
  "Investments",
  "Other",
] as const;

export const incomeCategoryLabels = [
  "Salary",
  "Self-employment",
  "Refunds",
  "Gifts",
  "Sales",
  "Investments",
  "Rental income",
  "Transfers",
  "Side income",
  "Other",
] as const;

export function normalizeCategoryPickerKey(value: unknown) {
  return (typeof value === "string" || typeof value === "number" ? String(value) : "")
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ");
}

export function syntheticCategoryPickerId(label: string) {
  return `manual-default-${normalizeCategoryPickerKey(label).replace(/[^a-z0-9]+/g, "-")}`;
}

export function buildCategoryPickerOptions(
  categories: Array<TransactionCategoryOption | ControlledCategoryOption>,
  transactionType: CategoryPickerTransactionType,
  options: { includeSynthetic?: boolean } = {},
): CategoryPickerOption[] {
  const labels = transactionType === "income" ? incomeCategoryLabels : spendCategoryLabels;
  const categoriesByKey = new Map<string, TransactionCategoryOption | ControlledCategoryOption>();

  categories.forEach((option) => {
    const directionMatches = !option.direction || option.direction === transactionType || option.direction === "both";
    if (!directionMatches) {
      return;
    }

    const slug = "slug" in option ? option.slug : "";
    const labelKey = normalizeCategoryPickerKey(option.label);
    const slugKey = normalizeCategoryPickerKey(slug);

    if (labelKey && !categoriesByKey.has(labelKey)) {
      categoriesByKey.set(labelKey, option);
    }

    if (slugKey && !categoriesByKey.has(slugKey)) {
      categoriesByKey.set(slugKey, option);
    }
  });

  return labels.flatMap((label) => {
    const normalizedLabel = normalizeCategoryPickerKey(label);
    const category = categoriesByKey.get(normalizedLabel);

    if (category) {
      return [category];
    }

    if (!options.includeSynthetic) {
      return [];
    }

    return [
      {
        id: syntheticCategoryPickerId(label),
        slug: normalizedLabel.replace(/[^a-z0-9]+/g, "_"),
        label,
        direction: transactionType,
        isSynthetic: true,
      },
    ];
  });
}
