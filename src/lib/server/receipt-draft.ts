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
  reviewState: "pending_review" | "needs_attention";
  uncertaintyReason: string | null;
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
];

const totalLinePatterns = [
  /\b(?:grand\s+total|amount\s+due|total\s+due|total\s+plata|total\s+de\s+plata|total)\b[^\d]{0,24}(\d{1,6}(?:[.,]\d{2})?)/i,
  /\b(?:suma|valoare)\b[^\d]{0,24}(\d{1,6}(?:[.,]\d{2})?)/i,
];

function normalizeCurrency(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : fallback;
}

function parseMoneyToMinor(value: string) {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

export function extractReceiptTotalMinor(text: string) {
  for (const line of text.split(/\r?\n/).reverse()) {
    for (const pattern of totalLinePatterns) {
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

  return line?.slice(0, 120) ?? null;
}

export function buildReceiptDraft(args: {
  extractedText?: string | null;
  originalFilename: string;
  defaultCurrency?: string | null;
  categories?: ReceiptDraftCategory[];
  now?: Date;
}): ReceiptDraft {
  const text = args.extractedText?.trim() ?? "";
  const groceriesCategory =
    args.categories?.find(
      (category) =>
        category.slug === "groceries" &&
        (category.direction === "expense" || category.direction === "both"),
    ) ?? null;
  const amountMinor = text ? extractReceiptTotalMinor(text) : null;
  const currency = text || amountMinor ? detectReceiptCurrency(text, args.defaultCurrency ?? "USD") : null;
  const groceriesLike = receiptLooksLikeGroceries([text, args.originalFilename].join("\n"));
  const merchantGuess = text ? guessMerchant(text) : null;
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
    reviewState: "pending_review",
    uncertaintyReason: null,
  };
}
