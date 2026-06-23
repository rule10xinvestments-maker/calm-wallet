export type ReceiptDraftCategory = {
  id: string;
  slug: string;
  label: string;
  direction: "expense" | "income" | "both";
};

export type ReceiptDraft = {
  transactionType: "expense";
  amountMinor: number | null;
  currency: string | null;
  occurredAt: string;
  description: string;
  merchantGuess: string | null;
  categoryId: string | null;
  confidenceScore: number | null;
  reviewState: "pending_review" | "needs_attention";
  uncertaintyReason: string | null;
};

export type ReceiptDraftExtractedFields = {
  merchant?: string | null;
  totalText?: string | null;
  currency?: string | null;
  categoryHint?: string | null;
};

const grocerySignals = [
  "grocery",
  "groceries",
  "supermarket",
  "market",
  "alimentara",
  "alimente",
  "household",
  "carrefour",
  "kaufland",
  "lidl",
  "mega image",
  "penny",
  "auchan",
  "profi",
  "coca cola",
  "lays",
  "snack",
  "suc",
  "vascar",
];

const totalLinePatterns = [
  /\b(?:grand\s+total|amount\s+due|total\s+due|total\s+plata|total\s+de\s+plata|total)\b[^\d]{0,24}(\d{1,6}(?:[.,]\d{1,2})?)/i,
  /\b(?:suma|valoare)\b[^\d]{0,24}(\d{1,6}(?:[.,]\d{1,2})?)/i,
];

const paymentLinePatterns = [
  /\b(?:plata|payment|electronic|card|tichete?)\b[^\d]{0,60}(\d{1,6}(?:[.,]\d{1,2})?)\s*(?:lei|ron)\b/i,
];

const totalExclusionPattern = /\b(?:tva|vat|tax|subtotal|sub\s*total|rest|change|cash|card|visa|mastercard)\b/i;

function normalizeCurrency(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim().toUpperCase();
  if (normalized && /^(RON|LEI|LEU)$/.test(normalized)) {
    return "RON";
  }

  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
}

export function parseMoneyToMinor(value: string) {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function extractAmountText(value: string | null | undefined) {
  const match = value?.match(/(\d{1,6}(?:[.,]\d{1,2})?)/);
  return match?.[1] ?? null;
}

export function extractReceiptTotalMinor(text: string) {
  for (const line of text.split(/\r?\n/).reverse()) {
    if (totalExclusionPattern.test(line)) {
      continue;
    }

    for (const pattern of totalLinePatterns) {
      const match = line.match(pattern);
      const amount = match?.[1] ? parseMoneyToMinor(match[1]) : null;

      if (amount) {
        return amount;
      }
    }
  }

  for (const line of text.split(/\r?\n/).reverse()) {
    if (totalExclusionPattern.test(line)) {
      continue;
    }

    for (const pattern of paymentLinePatterns) {
      const match = line.match(pattern);
      const amount = match?.[1] ? parseMoneyToMinor(match[1]) : null;

      if (amount) {
        return amount;
      }
    }
  }

  return null;
}

export function detectReceiptCurrency(text: string, fallbackCurrency = "USD") {
  const haystack = text.toUpperCase();

  if (/\bRON\b|\bLEI\b|\bLEU\b/.test(haystack)) {
    return "RON";
  }

  if (/\bEUR\b|€/.test(haystack)) {
    return "EUR";
  }

  if (/\bUSD\b|\$/.test(haystack)) {
    return "USD";
  }

  return normalizeCurrency(fallbackCurrency, "USD");
}

export function receiptLooksLikeGroceries(text: string) {
  const normalized = text.toLowerCase();
  return grocerySignals.some((signal) => normalized.includes(signal));
}

function guessMerchant(text: string) {
  const line = text
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value.length >= 3 && /[a-z]/i.test(value) && !/\btotal\b/i.test(value));

  return normalizeMerchant(line)?.slice(0, 120) ?? null;
}

function normalizeMerchant(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ") ?? "";

  if (!normalized) {
    return null;
  }

  if (/^mega\s+image$/i.test(normalized)) {
    return "Mega Image";
  }

  if (/^vascar(?:\s+s\.?\s*a\.?)?$/i.test(normalized)) {
    return "Vascar";
  }

  if (normalized === normalized.toUpperCase()) {
    return normalized
      .toLowerCase()
      .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  }

  return normalized;
}

export function buildReceiptDraft(args: {
  extractedText?: string | null;
  extractedFields?: ReceiptDraftExtractedFields | null;
  originalFilename: string;
  defaultCurrency?: string | null;
  categories?: ReceiptDraftCategory[];
  now?: Date;
}): ReceiptDraft {
  const text = args.extractedText?.trim() ?? "";
  const fieldTotalText = extractAmountText(args.extractedFields?.totalText);
  const groceriesCategory =
    args.categories?.find(
      (category) =>
        category.slug === "groceries" &&
        (category.direction === "expense" || category.direction === "both"),
    ) ?? null;
  const amountMinor = fieldTotalText ? parseMoneyToMinor(fieldTotalText) : text ? extractReceiptTotalMinor(text) : null;
  const currency =
    args.extractedFields?.currency || text || amountMinor
      ? normalizeCurrency(args.extractedFields?.currency, detectReceiptCurrency(text, args.defaultCurrency ?? "USD"))
      : null;
  const groceriesLike = receiptLooksLikeGroceries(
    [
      text,
      args.extractedFields?.merchant,
      args.extractedFields?.categoryHint,
      args.originalFilename,
    ].join("\n"),
  );
  const merchantGuess = normalizeMerchant(args.extractedFields?.merchant) ?? (text ? guessMerchant(text) : null);
  const occurredAt = (args.now ?? new Date()).toISOString();

  if (!amountMinor) {
    return {
      transactionType: "expense",
      amountMinor: null,
      currency,
      occurredAt,
      description: `Receipt image: ${args.originalFilename}`,
      merchantGuess,
      categoryId: groceriesLike ? groceriesCategory?.id ?? null : null,
      confidenceScore: 0,
      reviewState: "needs_attention",
      uncertaintyReason: "Receipt uploaded, but Calm Wallet could not extract a total yet.",
    };
  }

  return {
    transactionType: "expense",
    amountMinor,
    currency,
    occurredAt,
    description: merchantGuess ? `Receipt from ${merchantGuess}` : `Receipt image: ${args.originalFilename}`,
    merchantGuess,
    categoryId: groceriesLike ? groceriesCategory?.id ?? null : null,
    confidenceScore: 0.72,
    reviewState: "pending_review",
    uncertaintyReason: "We found a total. Please review before saving.",
  };
}
