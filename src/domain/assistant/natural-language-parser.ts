import {
  cleanTransactionIntentTitle,
  containsTransactionIntentPhrase,
  findTransactionIntentHint,
  type TransactionIntentHint,
} from "@/lib/transaction-intent-vocabulary";

export type NaturalLanguageCreateTransactionIntent = {
  kind: "create_transaction";
  transactionType: "expense" | "income";
  amount: string;
  currency?: string;
  merchant?: string;
  note?: string;
  reviewState?: "needs_attention";
  uncertaintyReason?: string;
};

export type NaturalLanguageAssistantIntent =
  | NaturalLanguageCreateTransactionIntent
  | {
      kind: "create_transactions";
      entries: NaturalLanguageCreateTransactionIntent[];
    }
  | {
      kind: "list_recent";
    }
  | {
      kind: "list_needs_review";
    }
  | {
      kind: "delete_transaction";
      target: NaturalLanguageCorrectionTarget;
    }
  | {
      kind: "recategorize_transaction";
      target: NaturalLanguageCorrectionTarget;
      categoryPhrase: string;
    }
  | {
      kind: "mark_correct";
      target: NaturalLanguageCorrectionTarget;
    }
  | {
      kind: "restore_transaction";
    }
  | {
      kind: "summarize_spending";
      transactionType: "expense";
    }
  | {
      kind: "answer_financial_question";
      questionKind:
        | "monthly_spending_total"
        | "monthly_income_total"
        | "category_spending_total"
        | "recent_largest_expense"
        | "needs_review_summary"
        | "recent_transactions_summary";
      occurredFrom?: string;
      occurredTo?: string;
      categoryPhrase?: string;
    }
  | {
      kind: "clarification_needed";
      reason: "missing_amount" | "missing_intent";
      message: string;
    }
  | {
      kind: "unsupported";
      message: string;
    };

export type NaturalLanguageCorrectionTarget =
  | {
      kind: "last";
    }
  | {
      kind: "current";
    }
  | {
      kind: "text";
      text: string;
    }
  | {
      kind: "id";
      transactionId: string;
    };

const amountSource = "(\\d+(?:,\\d{3})*(?:\\.\\d{1,2})?|\\.\\d{1,2})";
const supportedCurrencyTokens = new Map<string, string>([
  ["$", "USD"],
  ["USD", "USD"],
  ["DOLLAR", "USD"],
  ["DOLLARS", "USD"],
  ["DOLAR", "USD"],
  ["DOLARI", "USD"],
  ["€", "EUR"],
  ["EUR", "EUR"],
  ["EURO", "EUR"],
  ["EUROS", "EUR"],
  ["GBP", "GBP"],
  ["RON", "RON"],
  ["LEI", "RON"],
  ["LEU", "RON"],
  ["CAD", "CAD"],
  ["AUD", "AUD"],
  ["CHF", "CHF"],
  ["JPY", "JPY"],
]);
const supportedCurrencyTokenSource = Array.from(supportedCurrencyTokens.keys())
  .sort((a, b) => b.length - a.length)
  .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const signedAmountPattern = new RegExp(
  `(^|\\s)([+-])\\s*(?:(${supportedCurrencyTokenSource})\\s*)?${amountSource}(?:\\s*(${supportedCurrencyTokenSource}))?(?=\\s|$)`,
  "i",
);
const multiAmountPattern = new RegExp(
  `(^|[\\s,;])([+-])?\\s*(?:(${supportedCurrencyTokenSource})\\s*)?${amountSource}(?:\\s*(${supportedCurrencyTokenSource}))?(?=[\\s,;.!?]|$)`,
  "gi",
);

type AmountCandidate = {
  amount: string;
  currency?: string;
  hasAdjacentCurrency: boolean;
  sign?: "+" | "-";
  tokenStart: number;
  tokenEnd: number;
};

function normalizeInput(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function extractCurrencyToken(input: string) {
  const parts = input.split(" ");
  const currencyIndex = parts.findIndex((part) =>
    supportedCurrencyTokens.has(part.replace(/[.,;:!?]+$/g, "").toUpperCase()),
  );

  if (currencyIndex < 0) {
    return { currency: undefined, text: input };
  }

  const currencyToken = parts[currencyIndex]?.replace(/[.,;:!?]+$/g, "").toUpperCase();

  return {
    currency: currencyToken ? supportedCurrencyTokens.get(currencyToken) : undefined,
    text: parts.filter((_, index) => index !== currencyIndex).join(" ").trim(),
  };
}

function stripCurrencyTokens(input: string) {
  return input
    .split(" ")
    .filter((part) => {
      const normalized = part.replace(/[.,;:!?]+$/g, "").toUpperCase();
      return !supportedCurrencyTokens.has(normalized);
    })
    .join(" ")
    .trim();
}

function cleanMerchant(value: string) {
  const cleaned = value
    .replace(/^[+-]\s*/, "")
    .replace(/^(?:on|for|at|from)\s+/i, "")
    .replace(/^(?:o|un|una|niste|niște|a|an|some)\s+/i, "")
    .replace(/^(?:o|un|unii|niste|niște)\s+/i, "")
    .replace(/\s+(?:on|for|at|from)$/i, "")
    .trim();

  return cleaned || undefined;
}

function titleCaseShortLabel(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function cleanIncomeSource(value: string) {
  return cleanMerchant(value.replace(/^(?:from|de la)\s+/i, ""));
}

function currentMonthRange(now = new Date()) {
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  return {
    occurredFrom: from.toISOString(),
    occurredTo: to.toISOString(),
  };
}

function monthRangeFromName(value: string, now = new Date()) {
  const match = value.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?\b/i,
  );

  if (!match?.[1]) {
    return null;
  }

  const monthIndex = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ].indexOf(match[1].toLowerCase());

  const year = match[2] ? Number(match[2]) : now.getUTCFullYear();
  const from = new Date(Date.UTC(year, monthIndex, 1));
  const to = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  return {
    occurredFrom: from.toISOString(),
    occurredTo: to.toISOString(),
  };
}

function parseQuestionDateRange(input: string) {
  if (/\b(this|current)\s+month\b/i.test(input)) {
    return currentMonthRange();
  }

  return monthRangeFromName(input) ?? {};
}

function getCurrencyFromToken(token: string | undefined) {
  return token ? supportedCurrencyTokens.get(token.toUpperCase()) : undefined;
}

function findAmountCandidates(input: string): AmountCandidate[] {
  const matches: AmountCandidate[] = [];

  multiAmountPattern.lastIndex = 0;

  for (const match of input.matchAll(multiAmountPattern)) {
    const amount = match[4];

    if (!amount) {
      continue;
    }

    const matchStart = match.index ?? 0;
    const prefixLength = match[1]?.length ?? 0;
    const tokenStart = matchStart + prefixLength;
    const tokenEnd = matchStart + match[0].length;
    const currencyToken = match[3] ?? match[5];
    const sign = match[2] === "+" || match[2] === "-" ? match[2] : undefined;

    matches.push({
      amount,
      currency: getCurrencyFromToken(currencyToken),
      hasAdjacentCurrency: Boolean(currencyToken),
      sign,
      tokenStart,
      tokenEnd,
    });
  }

  return matches;
}

function stripAmountCandidate(input: string, candidate: AmountCandidate) {
  return `${input.slice(0, candidate.tokenStart)} ${input.slice(candidate.tokenEnd)}`.trim();
}

function stripLeadingQuantityContext(value: string, shouldStrip: boolean) {
  if (!shouldStrip) {
    return value;
  }

  return value.replace(new RegExp(`^${amountSource}\\s*(?:x|×)?\\s+(?=[A-Za-zÀ-ž])`, "i"), "").trim();
}

function hasMeaningfulItemText(value: string) {
  return /[A-Za-zÀ-ž]/.test(value) && !/[;,]/.test(value);
}

function findNormalizedExpenseIntentPrefix(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const match = normalized.match(
    /^(i paid|paid|spent|bought|purchased|am platit|platit|am cumparat|cumparat|j ai paye|jai paye|paye|j ai achete|jai achete|achete|pague|he pagado|pagado|compre|he comprado|comprado)\b/,
  );

  return match?.[1] ?? null;
}

function findFallbackTransactionIntentHint(value: string): TransactionIntentHint | null {
  const matchedPhrase = findNormalizedExpenseIntentPrefix(value);

  return matchedPhrase ? { kind: "expense", confidence: "clear", matchedPhrase } : null;
}

function cleanFallbackTransactionIntentTitle(value: string) {
  const matchedPhrase = findNormalizedExpenseIntentPrefix(value);

  if (!matchedPhrase) {
    return undefined;
  }

  const originalTokens = value.match(/[\p{L}\p{N}]+/gu) ?? [];
  const phraseWordCount = matchedPhrase.split(" ").length;

  return originalTokens.slice(phraseWordCount).join(" ").trim() || undefined;
}

function isIntentOnlyPrefix(value: string) {
  return containsTransactionIntentPhrase(value) || Boolean(findNormalizedExpenseIntentPrefix(value));
}

function isLikelyQuantityBeforeCurrencyAmount(input: string, occurrences: AmountCandidate[]) {
  const pricedOccurrence = occurrences.find((occurrence) => occurrence.hasAdjacentCurrency && !occurrence.sign);

  if (!pricedOccurrence) {
    return false;
  }

  const quantityOccurrence = occurrences.find(
    (occurrence) => occurrence.tokenStart < pricedOccurrence.tokenStart && !occurrence.hasAdjacentCurrency && !occurrence.sign,
  );

  if (!quantityOccurrence) {
    return false;
  }

  const beforeQuantity = input.slice(0, quantityOccurrence.tokenStart).trim();
  const itemText = input.slice(quantityOccurrence.tokenEnd, pricedOccurrence.tokenStart).trim();

  return (!beforeQuantity || isIntentOnlyPrefix(beforeQuantity)) && hasMeaningfulItemText(itemText);
}

function extractAmount(input: string) {
  const signedAmountMatch = input.match(signedAmountPattern);

  if (signedAmountMatch?.[2] && signedAmountMatch[4]) {
    const signStart = (signedAmountMatch.index ?? 0) + (signedAmountMatch[1]?.length ?? 0);
    const signEnd = (signedAmountMatch.index ?? 0) + signedAmountMatch[0].length;
    const currencyToken = (signedAmountMatch[3] ?? signedAmountMatch[5])?.toUpperCase();

    return {
      amount: signedAmountMatch[4],
      currency: currencyToken ? supportedCurrencyTokens.get(currencyToken) : undefined,
      text: `${input.slice(0, signStart)} ${input.slice(signEnd)}`.trim().replace(/\s+/g, " "),
      transactionType: signedAmountMatch[2] === "+" ? ("income" as const) : ("expense" as const),
      hasAdjacentCurrency: Boolean(currencyToken),
    };
  }

  const amountCandidates = findAmountCandidates(input);
  const amountCandidate = amountCandidates.find((candidate) => candidate.hasAdjacentCurrency) ?? amountCandidates[0];

  if (!amountCandidate) {
    return null;
  }

  return {
    amount: amountCandidate.amount,
    currency: amountCandidate.currency,
    text: stripAmountCandidate(input, amountCandidate).replace(/\s+/g, " "),
    transactionType: undefined,
    hasAdjacentCurrency: amountCandidate.hasAdjacentCurrency,
  };
}

function findAmountOccurrences(input: string) {
  return findAmountCandidates(input);
}

function cleanMultiEntryPart(value: string) {
  return value
    .replace(/^[\s,;:]+|[\s,;:]+$/g, "")
    .replace(/^(?:and|si|și)\s+/i, "")
    .replace(/\s+(?:and|si|și)$/i, "")
    .trim();
}

function maybeParseMultiCreateIntent(input: string): NaturalLanguageAssistantIntent | null {
  const occurrences = findAmountOccurrences(input);

  if (occurrences.length < 2) {
    return null;
  }

  if (isLikelyQuantityBeforeCurrencyAmount(input, occurrences)) {
    return null;
  }

  const firstPrefix = cleanMultiEntryPart(input.slice(0, occurrences[0]?.tokenStart ?? 0));
  const labelBeforeAmount = Boolean(firstPrefix);
  const entries: NaturalLanguageCreateTransactionIntent[] = [];

  for (let index = 0; index < occurrences.length; index += 1) {
    const occurrence = occurrences[index]!;
    const previous = occurrences[index - 1];
    const next = occurrences[index + 1];
    const amountToken = input.slice(occurrence.tokenStart, occurrence.tokenEnd).trim();
    const label = labelBeforeAmount
      ? cleanMultiEntryPart(input.slice(previous ? previous.tokenEnd : 0, occurrence.tokenStart))
      : cleanMultiEntryPart(input.slice(occurrence.tokenEnd, next ? next.tokenStart : input.length));
    const segment = labelBeforeAmount ? `${label} ${amountToken}`.trim() : `${amountToken} ${label}`.trim();
    const parsed = parseNaturalLanguageAssistantInput(segment);

    if (parsed.kind === "create_transaction") {
      entries.push(parsed);
    }
  }

  return entries.length > 1
    ? {
        kind: "create_transactions",
        entries,
      }
    : null;
}

function cleanTargetReference(value: string) {
  const cleaned = value
    .replace(/^(?:the\s+)?/i, "")
    .replace(/\s+(?:one|item|transaction)$/i, "")
    .trim();

  return cleaned || null;
}

function parseTargetReference(value: string): NaturalLanguageCorrectionTarget | null {
  const trimmed = value.trim();
  const uuidMatch = trimmed.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);

  if (uuidMatch?.[0]) {
    return {
      kind: "id",
      transactionId: uuidMatch[0],
    };
  }

  if (/^(?:that|it|this)$/i.test(trimmed)) {
    return {
      kind: "current",
    };
  }

  if (/^last(?:\s+(?:one|item|transaction))?$/i.test(trimmed)) {
    return {
      kind: "last",
    };
  }

  const text = cleanTargetReference(trimmed);

  return text
    ? {
        kind: "text",
        text,
      }
    : null;
}

function buildCreateIntent(args: {
  transactionType: "expense" | "income";
  amount: string;
  currency?: string;
  merchant?: string;
  note?: string;
  markCategoryForReview?: boolean;
}): NaturalLanguageAssistantIntent {
  return {
    kind: "create_transaction",
    transactionType: args.transactionType,
    amount: args.amount,
    ...(args.currency ? { currency: args.currency } : {}),
    ...(args.merchant ? { merchant: args.merchant } : {}),
    ...(args.note ? { note: args.note } : {}),
    ...(args.markCategoryForReview
      ? {
          reviewState: "needs_attention" as const,
          uncertaintyReason: "Category needs review.",
        }
      : {}),
  };
}

export function parseNaturalLanguageAssistantInput(rawInput: string): NaturalLanguageAssistantIntent {
  const input = normalizeInput(rawInput);

  if (!input) {
    return {
      kind: "unsupported",
      message: "Type a simple expense, income, or recent-items request.",
    };
  }

  const lower = input.toLowerCase();

  if (/^(show|list|see)\s+recent(?:\s+(?:transactions|items))?$/.test(lower)) {
    return {
      kind: "answer_financial_question",
      questionKind: "recent_transactions_summary",
    };
  }

  if (/^(show|list|see)\s+(?:needs?\s+review|things\s+needing\s+review|items\s+needing\s+review)$/.test(lower)) {
    return {
      kind: "answer_financial_question",
      questionKind: "needs_review_summary",
    };
  }

  if (/^(delete|remove)\s+last(?:\s+(?:transaction|item))?$/.test(lower)) {
    return {
      kind: "delete_transaction",
      target: {
        kind: "last",
      },
    };
  }

  if (/^(?:undo\s+last(?:\s+delete)?|restore\s+last)(?:\s+(?:transaction|item))?$/.test(lower)) {
    return { kind: "restore_transaction" };
  }

  const deleteReferenceMatch = input.match(/^(?:delete|remove)\s+(.+)$/i);
  if (deleteReferenceMatch?.[1]) {
    const target = parseTargetReference(deleteReferenceMatch[1]);

    if (target) {
      return {
        kind: "delete_transaction",
        target,
      };
    }
  }

  const changeMatch = input.match(/^change\s+(.+?)\s+to\s+(.+)$/i);
  if (changeMatch?.[1] && changeMatch[2]) {
    const target = parseTargetReference(changeMatch[1]);

    if (target) {
      return {
        kind: "recategorize_transaction",
        target,
        categoryPhrase: changeMatch[2].trim(),
      };
    }
  }

  const wasCategoryMatch = input.match(/^(.+?)\s+was\s+(.+)$/i);
  if (wasCategoryMatch?.[1] && wasCategoryMatch[2]) {
    const target = parseTargetReference(wasCategoryMatch[1]);

    if (target) {
      return {
        kind: "recategorize_transaction",
        target,
        categoryPhrase: wasCategoryMatch[2].trim(),
      };
    }
  }

  const markCorrectMatch = input.match(/^mark\s+(.+?)\s+(?:correct|reviewed|right)$/i);
  if (markCorrectMatch?.[1]) {
    const target = parseTargetReference(markCorrectMatch[1]);

    if (target) {
      return {
        kind: "mark_correct",
        target,
      };
    }
  }

  if (
    /^(?:how much )?(?:did i )?(?:spend|spent|spending)(?:\?)?$/.test(lower) ||
    /^(?:what'?s|what is)\s+(?:my\s+)?(?:spend|spending)(?:\?)?$/.test(lower)
  ) {
    return {
      kind: "answer_financial_question",
      questionKind: "monthly_spending_total",
    };
  }

  if (/\b(?:how much|what(?:'s| is).*)\b.*\b(?:spend|spent|spending)\b/i.test(input)) {
    const categoryMatch = input.match(/\b(?:on|for|at)\s+(.+?)(?:\s+(?:this month|in \w+(?: \d{4})?))?\??$/i);
    const dateRange = parseQuestionDateRange(input);

    if (categoryMatch?.[1]) {
      return {
        kind: "answer_financial_question",
        questionKind: "category_spending_total",
        categoryPhrase: cleanMerchant(categoryMatch[1]),
        ...dateRange,
      };
    }

    return {
      kind: "answer_financial_question",
      questionKind: "monthly_spending_total",
      ...dateRange,
    };
  }

  if (/\b(?:income|earn|earned|made)\b/i.test(input) && /\b(?:how much|what(?:'s| is)|total)\b/i.test(input)) {
    return {
      kind: "answer_financial_question",
      questionKind: "monthly_income_total",
      ...parseQuestionDateRange(input),
    };
  }

  if (/\b(?:largest|biggest)\s+(?:recent\s+)?expense\b/i.test(input)) {
    return {
      kind: "answer_financial_question",
      questionKind: "recent_largest_expense",
      ...parseQuestionDateRange(input),
    };
  }

  if (/\b(?:needs?\s+review|items\s+needing\s+review|things\s+needing\s+review)\b/i.test(input) && /\b(?:summary|how many|what(?:'s| is))\b/i.test(input)) {
    return {
      kind: "answer_financial_question",
      questionKind: "needs_review_summary",
    };
  }

  if (/\b(?:available|bank|card)\s+balance\b/i.test(input)) {
    return {
      kind: "unsupported",
      message: "I can summarize tracked transactions from entries you saved, but linked-account balances are outside this MVP.",
    };
  }

  if (/\bbalance\b/i.test(input)) {
    return {
      kind: "unsupported",
      message: "I can summarize tracked transactions, but Tracked balance questions are not available yet.",
    };
  }

  const multiCreateIntent = maybeParseMultiCreateIntent(input);

  if (multiCreateIntent) {
    return multiCreateIntent;
  }

  const amountResult = extractAmount(input);

  if (!amountResult) {
    if (
      containsTransactionIntentPhrase(input) ||
      /\b(?:spent|paid|bought|coffee|lunch|dinner|breakfast|groceries|salary|salariu|got paid|paycheck|income|freelance|refund|sold|rent received)\b/i.test(input)
    ) {
      return {
        kind: "clarification_needed",
        reason: "missing_amount",
        message: "I need an amount before I can save that.",
      };
    }

    return {
      kind: "unsupported",
      message: "I can only capture simple expenses, income, recent items, or spending summaries right now.",
    };
  }

  const amount = amountResult.amount;
  const withoutAmount = amountResult.text;
  const currencyResult = extractCurrencyToken(withoutAmount);
  const cleanTextWithoutAmount = stripLeadingQuantityContext(stripCurrencyTokens(currencyResult.text), amountResult.hasAdjacentCurrency);
  const currency = amountResult.currency ?? currencyResult.currency;

  if (amountResult.transactionType) {
    const merchant = cleanMerchant(cleanTextWithoutAmount);

    return buildCreateIntent({
      transactionType: amountResult.transactionType,
      amount,
      currency,
      merchant: merchant ?? (amountResult.transactionType === "income" ? "Income" : "Expense"),
      markCategoryForReview: amountResult.transactionType === "expense" && Boolean(merchant),
    });
  }

  const primaryIntentHint = findTransactionIntentHint(cleanTextWithoutAmount);
  const fallbackIntentHint = primaryIntentHint ? null : findFallbackTransactionIntentHint(cleanTextWithoutAmount);
  const intentHint = primaryIntentHint ?? fallbackIntentHint;
  if (intentHint) {
    const cleanedTitle = stripLeadingQuantityContext(
      (primaryIntentHint ? cleanTransactionIntentTitle(cleanTextWithoutAmount, intentHint) : cleanFallbackTransactionIntentTitle(cleanTextWithoutAmount)) ?? "",
      amountResult.hasAdjacentCurrency,
    );

    if (intentHint.kind === "income") {
      const merchant =
        cleanedTitle ||
        (/^got\s+paid\b/i.test(cleanTextWithoutAmount) ? "Paycheck" : undefined) ||
        (/salary|salariu|salaire|salario/i.test(cleanTextWithoutAmount) ? "Salary" : undefined) ||
        "Income";

      return buildCreateIntent({
        transactionType: "income",
        amount,
        currency,
        merchant: titleCaseShortLabel(merchant),
        markCategoryForReview: /\b(?:from|de la)\b/i.test(cleanTextWithoutAmount),
      });
    }

    return buildCreateIntent({
      transactionType: "expense",
      amount,
      currency,
      merchant: cleanedTitle ? titleCaseShortLabel(cleanedTitle) : "Transfer",
      markCategoryForReview: true,
    });
  }

  const gotPaidMatch = lower.match(/^got\s+paid\b/);
  if (gotPaidMatch) {
    return buildCreateIntent({
      transactionType: "income",
      amount,
      currency,
      merchant: "Paycheck",
    });
  }

  const salaryMatch = lower.match(/^(?:salary|salariu)\b/);
  if (salaryMatch) {
    return buildCreateIntent({
      transactionType: "income",
      amount,
      currency,
      merchant: "Salary",
    });
  }

  if (/^(?:income|paycheck)\b/.test(lower)) {
    const merchant = cleanMerchant(cleanTextWithoutAmount.replace(/^(?:income|paycheck)\b/i, ""));
    return buildCreateIntent({
      transactionType: "income",
      amount,
      currency,
      merchant: merchant ? titleCaseShortLabel(merchant) : "Income",
    });
  }

  if (/^freelance(?:\s+income)?\b/.test(lower)) {
    return buildCreateIntent({
      transactionType: "income",
      amount,
      currency,
      merchant: "Freelance income",
    });
  }

  if (/^(?:refund|rambursare|cashback|reimbursement|chargeback)\b/.test(lower)) {
    const merchant = cleanMerchant(cleanTextWithoutAmount.replace(/^(?:refund|rambursare|cashback|reimbursement|chargeback)\b/i, ""));
    return buildCreateIntent({
      transactionType: "income",
      amount,
      currency,
      merchant: merchant ? titleCaseShortLabel(merchant) : "Refund",
    });
  }

  const rentReceivedMatch = cleanTextWithoutAmount.match(/^(?:rent received|chirie primita|rental income|property income)\b/i);
  if (rentReceivedMatch) {
    return buildCreateIntent({
      transactionType: "income",
      amount,
      currency,
      merchant: "Rent received",
    });
  }

  const soldMatch = cleanTextWithoutAmount.match(/^(?:sold|sale|vandut|vanzare)\s+(.+)$/i);
  if (soldMatch?.[1]) {
    const merchant = cleanMerchant(soldMatch[1]);
    return buildCreateIntent({
      transactionType: "income",
      amount,
      currency,
      merchant: merchant ? titleCaseShortLabel(merchant) : "Sale",
      note: merchant ? `sold ${merchant}` : "sold",
    });
  }

  const receivedFromMatch =
    cleanTextWithoutAmount.match(/^(?:received|got)\s+(?:money\s+)?(?:from\s+)?(.+)$/i) ??
    cleanTextWithoutAmount.match(/^(?:from|de la)\s+(.+)$/i) ??
    cleanTextWithoutAmount.match(/^(.+?)\s+(?:gave|sent|paid)\s+me$/i);
  if (receivedFromMatch?.[1]) {
    const merchant = cleanIncomeSource(receivedFromMatch[1]);
    return buildCreateIntent({
      transactionType: "income",
      amount,
      currency,
      merchant: merchant ? titleCaseShortLabel(merchant) : "Income",
      markCategoryForReview: true,
    });
  }

  const spentMatch = input.match(/^spent\s+\$?(?:\d+(?:,\d{3})*(?:\.\d{1,2})?|\.\d{1,2})(?:\s+(?:on|at|for)\s+(.+))?$/i);
  if (spentMatch) {
    const merchant = cleanMerchant(extractCurrencyToken(spentMatch[1] ?? "").text);
    return buildCreateIntent({
      transactionType: "expense",
      amount,
      currency,
      merchant,
      markCategoryForReview: Boolean(merchant),
    });
  }

  const paidMatch = input.match(/^paid\s+\$?(?:\d+(?:,\d{3})*(?:\.\d{1,2})?|\.\d{1,2})(?:\s+(?:for|at|on)\s+(.+))?$/i);
  if (paidMatch) {
    const merchant = cleanMerchant(extractCurrencyToken(paidMatch[1] ?? "").text);
    return buildCreateIntent({
      transactionType: "expense",
      amount,
      currency,
      merchant,
      markCategoryForReview: Boolean(merchant),
    });
  }

  if (/^(?:expense|bought)\b/i.test(input)) {
    const merchant = cleanMerchant(cleanTextWithoutAmount.replace(/^(?:expense|bought)\b/i, ""));
    return buildCreateIntent({
      transactionType: "expense",
      amount,
      currency,
      merchant,
      markCategoryForReview: Boolean(merchant),
    });
  }

  const merchant = cleanMerchant(cleanTextWithoutAmount);

  if (merchant) {
    return buildCreateIntent({
      transactionType: "expense",
      amount,
      currency,
      merchant,
      markCategoryForReview: true,
    });
  }

  return {
    kind: "clarification_needed",
    reason: "missing_intent",
    message: "Tell me whether that is an expense or income before I save it.",
  };
}
