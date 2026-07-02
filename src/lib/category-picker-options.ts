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

export function normalizeCategoryPickerKey(value: string) {
  return value
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

  return labels.flatMap((label) => {
    const normalizedLabel = normalizeCategoryPickerKey(label);
    const category = categories.find((option) => {
      const directionMatches = !option.direction || option.direction === transactionType || option.direction === "both";
      const slug = "slug" in option ? option.slug : "";

      return directionMatches && (normalizeCategoryPickerKey(option.label) === normalizedLabel || normalizeCategoryPickerKey(slug) === normalizedLabel);
    });

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
