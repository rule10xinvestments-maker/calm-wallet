import { findCategoryVocabularyHint, normalizeCategoryVocabularyPhrase } from "@/lib/category-vocabulary";
import type { ControlledCategory } from "@/domain/assistant/category-resolver";
import type { Transaction, TransactionType } from "@/domain/transactions/types";

type PersonalCategoryMemoryInput = {
  merchant?: string | null;
  itemName?: string | null;
  note?: string | null;
  transactionType: TransactionType;
};

export type PersonalCategoryMemoryMatch = {
  category: ControlledCategory;
  strength: "exact" | "token" | "prefix";
  reviewRecommendation: "reviewed" | "needs_attention";
  matchedKey: string;
};

type Candidate = {
  categoryId: string;
  key: string;
  tokens: string[];
  reviewed: boolean;
  updatedAt: string;
};

const weakMemoryTokens = new Set(["bill", "cash", "food", "fuel", "gift", "shop", "taxi", "water", "gaze"]);
const knownShortTokens = new Set(["btc", "eth", "sol", "ada", "bnb", "xrp", "dot", "ltc", "trx", "ton"]);

export function normalizePersonalCategoryMemoryText(value: string | null | undefined) {
  return normalizeCategoryVocabularyPhrase(value ?? "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function supportsDirection(category: ControlledCategory, transactionType: TransactionType) {
  return category.direction === transactionType || category.direction === "both";
}

function candidateTexts(transaction: Transaction) {
  return [transaction.merchant, transaction.itemName, transaction.note]
    .map(normalizePersonalCategoryMemoryText)
    .filter((value) => value.length >= 3);
}

function inputTexts(input: PersonalCategoryMemoryInput) {
  return [input.merchant, input.itemName, input.note]
    .map(normalizePersonalCategoryMemoryText)
    .filter((value) => value.length >= 3);
}

function distinctiveTokens(value: string) {
  return value
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => (token.length >= 4 || knownShortTokens.has(token)) && !weakMemoryTokens.has(token));
}

function buildCandidates(transactions: Transaction[], transactionType: TransactionType) {
  return transactions.flatMap((transaction): Candidate[] => {
    if (
      transaction.transactionType !== transactionType ||
      !transaction.categoryId ||
      transaction.deletedAt ||
      transaction.deletedForeverAt
    ) {
      return [];
    }

    return candidateTexts(transaction).map((key) => ({
      categoryId: transaction.categoryId!,
      key,
      tokens: distinctiveTokens(key),
      reviewed: transaction.reviewState === "reviewed",
      updatedAt: transaction.updatedAt || transaction.createdAt,
    }));
  });
}

function scoreCandidate(inputKeys: string[], candidate: Candidate) {
  for (const key of inputKeys) {
    if (key === candidate.key) {
      return { strength: "exact" as const, score: 100 + (candidate.reviewed ? 20 : 0) };
    }
  }

  for (const key of inputKeys) {
    for (const token of candidate.tokens) {
      if (key === token || key.includes(` ${token} `) || key.startsWith(`${token} `) || key.endsWith(` ${token}`)) {
        return { strength: "token" as const, score: 70 + (candidate.reviewed ? 15 : 0) };
      }

      if (candidate.key.startsWith(`${key} `) || key.startsWith(`${candidate.key} `)) {
        return { strength: "prefix" as const, score: 60 + (candidate.reviewed ? 10 : 0) };
      }
    }
  }

  return null;
}

function currentHasStrongerSpecificVocabulary(inputKeys: string[], strength: "exact" | "token" | "prefix") {
  if (strength === "exact") {
    return false;
  }

  const hint = findCategoryVocabularyHint(inputKeys.join(" "));
  return hint?.confidence === "high" && hint.matchedAlias.includes(" ");
}

export function findPersonalCategoryMemoryMatch(args: {
  input: PersonalCategoryMemoryInput;
  transactions: Transaction[];
  categories: ControlledCategory[];
}): PersonalCategoryMemoryMatch | null {
  const inputKeys = inputTexts(args.input);

  if (!inputKeys.length) {
    return null;
  }

  const categoryScores = new Map<
    string,
    {
      count: number;
      bestScore: number;
      strength: "exact" | "token" | "prefix";
      reviewedCount: number;
      latestAt: string;
      matchedKey: string;
    }
  >();

  for (const candidate of buildCandidates(args.transactions, args.input.transactionType)) {
    const score = scoreCandidate(inputKeys, candidate);

    if (!score || currentHasStrongerSpecificVocabulary(inputKeys, score.strength)) {
      continue;
    }

    const current = categoryScores.get(candidate.categoryId);
    const latestAt = !current || candidate.updatedAt > current.latestAt ? candidate.updatedAt : current.latestAt;
    const nextStrength =
      !current || score.score > current.bestScore
        ? score.strength
        : current.strength;

    categoryScores.set(candidate.categoryId, {
      count: (current?.count ?? 0) + 1,
      bestScore: Math.max(current?.bestScore ?? 0, score.score),
      strength: nextStrength,
      reviewedCount: (current?.reviewedCount ?? 0) + (candidate.reviewed ? 1 : 0),
      latestAt,
      matchedKey: score.score > (current?.bestScore ?? 0) ? candidate.key : current?.matchedKey ?? candidate.key,
    });
  }

  const [winner] = Array.from(categoryScores.entries()).sort(([, a], [, b]) => {
    const frequency = b.count - a.count;
    if (frequency !== 0) return frequency;
    const reviewed = b.reviewedCount - a.reviewedCount;
    if (reviewed !== 0) return reviewed;
    const score = b.bestScore - a.bestScore;
    if (score !== 0) return score;
    return b.latestAt.localeCompare(a.latestAt);
  });

  if (!winner) {
    return null;
  }

  const [categoryId, match] = winner;
  const category = args.categories.find((candidate) => candidate.id === categoryId && supportsDirection(candidate, args.input.transactionType));

  if (!category) {
    return null;
  }

  const strong = match.strength === "exact" && match.reviewedCount > 0;

  return {
    category,
    strength: match.strength,
    reviewRecommendation: strong ? "reviewed" : "needs_attention",
    matchedKey: match.matchedKey,
  };
}
